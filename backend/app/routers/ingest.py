import json
import logging
from datetime import datetime
from fastapi import APIRouter, Depends, UploadFile, File, BackgroundTasks, HTTPException
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

from ..database import get_db
from ..deps import get_current_user, get_spotify_client
from ..models import User, Stream, PollCursor
from ..schemas import IngestStatus
from ..services.ingestion import parse_history_entry, bulk_insert_streams, enrich_tracks
from ..services.snapshots import compute_and_store_snapshots
from ..services.spotify import SpotifyClient, RateLimitError

router = APIRouter(prefix="/ingest", tags=["ingest"])


def _run_enrich_and_snapshot(db: Session, spotify: SpotifyClient, user_id):
    import asyncio
    loop = asyncio.new_event_loop()
    try:
        loop.run_until_complete(enrich_tracks(db, spotify, user_id))
    finally:
        loop.close()
    compute_and_store_snapshots(db, user_id)


@router.post("/history")
async def import_history(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    spotify: SpotifyClient = Depends(get_spotify_client),
    db: Session = Depends(get_db),
):
    if not file.filename or not file.filename.endswith(".json"):
        raise HTTPException(400, "Only JSON files are accepted")

    content = await file.read()
    try:
        data = json.loads(content)
    except json.JSONDecodeError:
        raise HTTPException(400, "Invalid JSON file")

    if not isinstance(data, list):
        raise HTTPException(400, "Expected a JSON array of streaming history entries")

    streams = []
    skipped = 0
    for entry in data:
        stream = parse_history_entry(entry, user.id)
        if stream:
            streams.append(stream)
        else:
            skipped += 1

    try:
        inserted = bulk_insert_streams(db, streams)
    except Exception as e:
        logger.exception("bulk_insert_streams failed")
        raise HTTPException(500, f"Database insert failed: {e}") from e

    background_tasks.add_task(_run_enrich_and_snapshot, db, spotify, user.id)

    return {
        "total_entries": len(data),
        "valid_entries": len(streams),
        "skipped_short_plays": skipped,
        "streams_inserted": inserted,
        "duplicates": len(streams) - inserted,
        "message": "Import complete. Enrichment running in background.",
    }


@router.post("/poll")
async def poll_recent(
    user: User = Depends(get_current_user),
    spotify: SpotifyClient = Depends(get_spotify_client),
    db: Session = Depends(get_db),
):
    cursor = db.query(PollCursor).filter(PollCursor.user_id == user.id).first()
    after = cursor.last_played_at if cursor else None

    try:
        result = await spotify.get_recently_played(after=after)
    except RateLimitError as e:
        raise HTTPException(429, f"Rate limited. Retry after {e.retry_after}s")

    items = result.get("items", [])
    if not items:
        return {"new_tracks": 0, "fetched": 0, "message": "No new tracks"}

    streams = []
    for item in items:
        track = item.get("track") or {}
        track_id = track.get("id")
        played_at_str = item.get("played_at", "")
        try:
            played_at = datetime.fromisoformat(
                played_at_str.replace("Z", "+00:00")
            ).replace(tzinfo=None)
        except (ValueError, AttributeError):
            continue

        artists = track.get("artists") or [{}]
        streams.append(
            Stream(
                user_id=user.id,
                spotify_track_id=track_id,
                track_name=track.get("name"),
                artist_name=artists[0].get("name") if artists else None,
                album_name=(track.get("album") or {}).get("name"),
                played_at=played_at,
                ms_played=None,
                skipped=None,
                shuffle=None,
                source="api",
                enriched=False,
            )
        )

    inserted = bulk_insert_streams(db, streams)

    new_cursor = (result.get("cursors") or {}).get("after")
    if new_cursor:
        if not cursor:
            cursor = PollCursor(user_id=user.id)
            db.add(cursor)
        cursor.last_played_at = int(new_cursor)
        cursor.updated_at = datetime.utcnow()
        db.commit()

    await enrich_tracks(db, spotify, user.id)

    return {"new_tracks": inserted, "fetched": len(items)}


@router.get("/status", response_model=IngestStatus)
def ingestion_status(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    total = db.query(Stream).filter(Stream.user_id == user.id).count()
    unenriched = (
        db.query(Stream)
        .filter(Stream.user_id == user.id, Stream.enriched == False)
        .count()
    )
    history_count = (
        db.query(Stream)
        .filter(Stream.user_id == user.id, Stream.source == "history")
        .count()
    )
    api_count = (
        db.query(Stream)
        .filter(Stream.user_id == user.id, Stream.source == "api")
        .count()
    )
    cursor = db.query(PollCursor).filter(PollCursor.user_id == user.id).first()

    oldest = (
        db.query(Stream)
        .filter(Stream.user_id == user.id)
        .order_by(Stream.played_at.asc())
        .first()
    )
    newest = (
        db.query(Stream)
        .filter(Stream.user_id == user.id)
        .order_by(Stream.played_at.desc())
        .first()
    )

    return IngestStatus(
        total_streams=total,
        unenriched=unenriched,
        history_streams=history_count,
        api_streams=api_count,
        last_polled_at=cursor.last_played_at if cursor else None,
        oldest_stream=oldest.played_at.isoformat() if oldest else None,
        newest_stream=newest.played_at.isoformat() if newest else None,
    )


@router.post("/compute-snapshots")
def trigger_snapshots(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    count = compute_and_store_snapshots(db, user.id)
    return {"snapshots_computed": count}
