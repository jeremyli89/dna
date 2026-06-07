import uuid
from collections import Counter
from datetime import datetime, timedelta, date
from typing import List
from sqlalchemy.orm import Session

from ..models import Stream, Track, Artist, WeeklySnapshot
from .personality import compute_all_dimensions, compute_genre_entropy


def _build_enrichment_maps(db: Session):
    tracks = db.query(Track).all()
    artists = db.query(Artist).all()
    artist_genres = {a.name: (a.genres or []) for a in artists}
    track_release_years = {t.id: t.release_year for t in tracks if t.release_year}
    track_popularities = {t.id: t.popularity for t in tracks if t.popularity is not None}
    return artist_genres, track_release_years, track_popularities


def compute_and_store_snapshots(db: Session, user_id: uuid.UUID) -> int:
    all_streams = db.query(Stream).filter(Stream.user_id == user_id).all()
    if not all_streams:
        return 0

    artist_genres, track_release_years, track_popularities = _build_enrichment_maps(db)

    sorted_streams = sorted(all_streams, key=lambda s: s.played_at)
    start_date = sorted_streams[0].played_at.date()
    end_date = sorted_streams[-1].played_at.date()

    # Start on Monday of first week
    current = start_date - timedelta(days=start_date.weekday())
    count = 0

    while current <= end_date:
        week_end = current + timedelta(days=7)
        week_streams = [s for s in all_streams if current <= s.played_at.date() < week_end]

        if len(week_streams) < 3:
            current += timedelta(days=7)
            continue

        dims = compute_all_dimensions(week_streams, artist_genres, track_release_years, track_popularities)

        # Feature vector fields
        artist_counts = Counter(s.artist_name for s in week_streams if s.artist_name)
        total = len(week_streams)
        top10_share = sum(c for _, c in artist_counts.most_common(10)) / total

        prior_start = current - timedelta(days=90)
        prior_streams = [s for s in all_streams if prior_start <= s.played_at.date() < current]
        new_artist_ratio = 0.0
        if prior_streams:
            prior_artists = {s.artist_name for s in prior_streams if s.artist_name}
            current_artists = {s.artist_name for s in week_streams if s.artist_name}
            new_artist_ratio = len(current_artists - prior_artists) / max(len(current_artists), 1)

        years = [
            track_release_years[s.spotify_track_id]
            for s in week_streams
            if s.spotify_track_id and s.spotify_track_id in track_release_years
        ]
        avg_release_year = sum(years) / len(years) if years else None

        pops = [
            track_popularities[s.spotify_track_id]
            for s in week_streams
            if s.spotify_track_id and s.spotify_track_id in track_popularities
        ]
        avg_pop = sum(pops) / len(pops) if pops else None

        night_count = sum(1 for s in week_streams if 0 <= s.played_at.hour < 5)
        late_night_ratio = night_count / total

        genre_counts: Counter = Counter()
        for s in week_streams:
            for g in artist_genres.get(s.artist_name or "", []):
                genre_counts[g] += 1

        snapshot = (
            db.query(WeeklySnapshot)
            .filter(WeeklySnapshot.user_id == user_id, WeeklySnapshot.week_start == current)
            .first()
        )
        if not snapshot:
            snapshot = WeeklySnapshot(user_id=user_id, week_start=current)
            db.add(snapshot)

        snapshot.explorer_score = dims["explorer"]
        snapshot.loyalist_score = dims["loyalist"]
        snapshot.adventurous_score = dims["adventurous"]
        snapshot.nostalgic_score = dims["nostalgic"]
        snapshot.mainstream_score = dims["mainstream"]
        snapshot.night_owl_score = dims["night_owl"]
        snapshot.new_artist_ratio = new_artist_ratio
        snapshot.top10_share = top10_share
        snapshot.genre_entropy = compute_genre_entropy(week_streams, artist_genres)
        snapshot.avg_release_year = avg_release_year
        snapshot.avg_popularity = avg_pop
        snapshot.late_night_ratio = late_night_ratio
        snapshot.unique_artists = len(artist_counts)
        snapshot.unique_genres = len(genre_counts)
        snapshot.stream_count = total
        snapshot.computed_at = datetime.utcnow()

        count += 1
        current += timedelta(days=7)

    db.commit()
    return count
