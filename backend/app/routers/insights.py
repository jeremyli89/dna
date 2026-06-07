from datetime import datetime, timedelta
from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..models import User, Stream, Track, Artist, Insight
from ..schemas import InsightOut
from ..services.personality import compute_all_dimensions
from ..services.llm import generate_insight

router = APIRouter(prefix="/insights", tags=["insights"])


def _enrichment_maps(db: Session):
    tracks = db.query(Track).all()
    artists = db.query(Artist).all()
    return (
        {a.name: (a.genres or []) for a in artists},
        {t.id: t.release_year for t in tracks if t.release_year},
        {t.id: t.popularity for t in tracks if t.popularity is not None},
    )


@router.get("/weekly", response_model=List[InsightOut])
def get_weekly(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(Insight)
        .filter(Insight.user_id == user.id)
        .order_by(Insight.generated_at.desc())
        .limit(20)
        .all()
    )
    return [InsightOut.model_validate(r) for r in rows]


@router.post("/generate", response_model=InsightOut)
async def generate(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    now = datetime.utcnow()
    cutoff_30 = now - timedelta(days=30)
    cutoff_60 = now - timedelta(days=60)

    recent_streams = (
        db.query(Stream)
        .filter(Stream.user_id == user.id, Stream.played_at >= cutoff_30)
        .all()
    )
    prior_streams = (
        db.query(Stream)
        .filter(
            Stream.user_id == user.id,
            Stream.played_at >= cutoff_60,
            Stream.played_at < cutoff_30,
        )
        .all()
    )

    if not recent_streams:
        insight = Insight(
            user_id=user.id,
            insight_type="weekly",
            content="Start listening to music and import your history to generate insights!",
            data={},
        )
        db.add(insight)
        db.commit()
        db.refresh(insight)
        return InsightOut.model_validate(insight)

    artist_genres, track_release_years, track_popularities = _enrichment_maps(db)

    recent_dims = compute_all_dimensions(recent_streams, artist_genres, track_release_years, track_popularities)
    prior_dims = (
        compute_all_dimensions(prior_streams, artist_genres, track_release_years, track_popularities)
        if prior_streams
        else None
    )

    metrics = {
        "new_artists_this_month": len({s.artist_name for s in recent_streams if s.artist_name}),
        "stream_count": len(recent_streams),
        "current_dimensions": recent_dims,
        "prior_dimensions": prior_dims,
        "dimension_deltas": (
            {k: round(recent_dims[k] - prior_dims[k], 1) for k in recent_dims}
            if prior_dims
            else None
        ),
    }

    content = await generate_insight(metrics, "weekly")

    insight = Insight(
        user_id=user.id,
        insight_type="weekly",
        content=content,
        data=metrics,
    )
    db.add(insight)
    db.commit()
    db.refresh(insight)
    return InsightOut.model_validate(insight)
