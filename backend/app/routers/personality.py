import hashlib
from datetime import datetime, timedelta
from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..models import User, Stream, Track, Artist, WeeklySnapshot
from ..schemas import PersonalityDimensions, WeeklySnapshotOut, DnaScore
from ..services.personality import compute_all_dimensions
from ..services.snapshots import compute_and_store_snapshots

router = APIRouter(prefix="/personality", tags=["personality"])


def _enrichment_maps(db: Session):
    tracks = db.query(Track).all()
    artists = db.query(Artist).all()
    artist_genres = {a.name: (a.genres or []) for a in artists}
    track_release_years = {t.id: t.release_year for t in tracks if t.release_year}
    track_popularities = {t.id: t.popularity for t in tracks if t.popularity is not None}
    return artist_genres, track_release_years, track_popularities


@router.get("/current", response_model=PersonalityDimensions)
def get_current(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    cutoff = datetime.utcnow() - timedelta(days=90)
    streams = (
        db.query(Stream)
        .filter(Stream.user_id == user.id, Stream.played_at >= cutoff)
        .all()
    )

    if not streams:
        return PersonalityDimensions(
            explorer=50, loyalist=50, adventurous=50, nostalgic=50, mainstream=50, night_owl=0
        )

    artist_genres, track_release_years, track_popularities = _enrichment_maps(db)
    dims = compute_all_dimensions(streams, artist_genres, track_release_years, track_popularities)
    return PersonalityDimensions(**dims)


@router.get("/trend", response_model=List[WeeklySnapshotOut])
def get_trend(
    months: int = 12,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    cutoff = (datetime.utcnow() - timedelta(days=30 * months)).date()
    snapshots = (
        db.query(WeeklySnapshot)
        .filter(WeeklySnapshot.user_id == user.id, WeeklySnapshot.week_start >= cutoff)
        .order_by(WeeklySnapshot.week_start)
        .all()
    )

    return [
        WeeklySnapshotOut(
            week_start=str(s.week_start),
            explorer_score=s.explorer_score,
            loyalist_score=s.loyalist_score,
            adventurous_score=s.adventurous_score,
            nostalgic_score=s.nostalgic_score,
            mainstream_score=s.mainstream_score,
            night_owl_score=s.night_owl_score,
            stream_count=s.stream_count,
            unique_artists=s.unique_artists,
            unique_genres=s.unique_genres,
        )
        for s in snapshots
    ]


@router.get("/dna-score", response_model=DnaScore)
def get_dna_score(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    cutoff = datetime.utcnow() - timedelta(days=90)
    streams = (
        db.query(Stream)
        .filter(Stream.user_id == user.id, Stream.played_at >= cutoff)
        .all()
    )

    artist_genres, track_release_years, track_popularities = _enrichment_maps(db)
    dims = compute_all_dimensions(streams, artist_genres, track_release_years, track_popularities)

    vector_str = "-".join(f"{v:.1f}" for v in dims.values())
    hash_hex = hashlib.md5(vector_str.encode()).hexdigest().upper()
    dna_id = f"{hash_hex[0:2]}-{hash_hex[2:4]}-{hash_hex[4:6]}"

    # Compare to prior 90 days
    prior_end = datetime.utcnow() - timedelta(days=90)
    prior_start = datetime.utcnow() - timedelta(days=180)
    prior_streams = (
        db.query(Stream)
        .filter(
            Stream.user_id == user.id,
            Stream.played_at >= prior_start,
            Stream.played_at < prior_end,
        )
        .all()
    )

    similarity = None
    if prior_streams:
        prior_dims = compute_all_dimensions(
            prior_streams, artist_genres, track_release_years, track_popularities
        )
        cur_vec = list(dims.values())
        prv_vec = list(prior_dims.values())
        dot = sum(a * b for a, b in zip(cur_vec, prv_vec))
        mag1 = sum(a ** 2 for a in cur_vec) ** 0.5
        mag2 = sum(b ** 2 for b in prv_vec) ** 0.5
        if mag1 > 0 and mag2 > 0:
            similarity = round((dot / (mag1 * mag2)) * 100, 1)

    return DnaScore(
        dna_id=dna_id,
        similarity_to_last_month=similarity,
        trait_vector=PersonalityDimensions(**dims),
    )


@router.post("/recompute")
def recompute_snapshots(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    count = compute_and_store_snapshots(db, user.id)
    return {"snapshots_computed": count}
