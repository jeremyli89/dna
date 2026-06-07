import uuid
from datetime import datetime
from typing import Optional, List
from sqlalchemy.orm import Session

from ..models import Stream, Track, Artist
from .spotify import SpotifyClient


def parse_history_entry(entry: dict, user_id: uuid.UUID) -> Optional[Stream]:
    ms_played = entry.get("ms_played") or 0
    try:
        if int(ms_played) < 30000:
            return None
    except (TypeError, ValueError):
        return None

    track_uri = entry.get("spotify_track_uri") or ""
    track_id: Optional[str] = None
    if track_uri and ":" in track_uri:
        parts = track_uri.split(":")
        if len(parts) == 3 and parts[1] == "track":
            track_id = parts[2]

    ts_str = entry.get("ts") or ""
    try:
        played_at = datetime.fromisoformat(
            ts_str.replace("Z", "+00:00")
        ).replace(tzinfo=None)
    except (ValueError, AttributeError, TypeError):
        return None

    return Stream(
        user_id=user_id,
        spotify_track_id=track_id,
        track_name=entry.get("master_metadata_track_name"),
        artist_name=entry.get("master_metadata_album_artist_name"),
        album_name=entry.get("master_metadata_album_album_name"),
        played_at=played_at,
        ms_played=int(ms_played),
        skipped=entry.get("skipped"),
        shuffle=entry.get("shuffle"),
        reason_start=entry.get("reason_start"),
        reason_end=entry.get("reason_end"),
        source="history",
        enriched=False,
    )


def bulk_insert_streams(db: Session, streams: List[Stream]) -> int:
    if not streams:
        return 0

    # Collect unique keys already in the DB for this user
    user_id = streams[0].user_id
    track_ids = [s.spotify_track_id for s in streams if s.spotify_track_id]
    if not track_ids:
        return 0

    existing_keys = {
        (row.spotify_track_id, row.played_at)
        for row in db.query(Stream.spotify_track_id, Stream.played_at)
        .filter(
            Stream.user_id == user_id,
            Stream.spotify_track_id.in_(track_ids),
        )
        .all()
    }

    inserted = 0
    seen_this_batch: set[tuple] = set()

    for stream in streams:
        if not stream.spotify_track_id:
            continue
        key = (stream.spotify_track_id, stream.played_at)
        if key in existing_keys or key in seen_this_batch:
            continue
        seen_this_batch.add(key)
        db.add(stream)
        inserted += 1

    try:
        db.commit()
    except Exception:
        db.rollback()
        raise

    return inserted


async def enrich_tracks(db: Session, spotify: SpotifyClient, user_id: uuid.UUID) -> int:
    unenriched = (
        db.query(Stream)
        .filter(
            Stream.user_id == user_id,
            Stream.enriched == False,
            Stream.spotify_track_id.isnot(None),
        )
        .limit(500)
        .all()
    )

    if not unenriched:
        return 0

    track_ids = list({s.spotify_track_id for s in unenriched})
    cached_ids = {t.id for t in db.query(Track).filter(Track.id.in_(track_ids)).all()}
    uncached_ids = [tid for tid in track_ids if tid not in cached_ids]

    if uncached_ids:
        # Fetch artists first so FK constraint is satisfied when tracks are inserted
        artist_ids_to_fetch: list[str] = []
        track_rows: list[Track] = []

        tracks_data = await spotify.get_tracks(uncached_ids)
        for track_data in tracks_data:
            if not track_data:
                continue
            track_id = track_data.get("id")
            if not track_id:
                continue

            artists = track_data.get("artists") or [{}]
            primary_artist = artists[0] if artists else {}
            artist_id = primary_artist.get("id")

            release_date = (track_data.get("album") or {}).get("release_date") or ""
            release_year: Optional[int] = None
            try:
                release_year = int(release_date[:4]) if release_date else None
            except (ValueError, TypeError):
                pass

            track_rows.append(Track(
                id=track_id,
                name=track_data.get("name", ""),
                artist_id=artist_id,
                artist_name=primary_artist.get("name", ""),
                album_name=(track_data.get("album") or {}).get("name", ""),
                release_date=release_date,
                release_year=release_year,
                popularity=track_data.get("popularity"),
            ))

            if artist_id:
                existing = db.query(Artist).filter(Artist.id == artist_id).first()
                if not existing:
                    artist_ids_to_fetch.append(artist_id)

        # Insert artists before tracks (FK dependency)
        if artist_ids_to_fetch:
            artists_data = await spotify.get_artists(artist_ids_to_fetch)
            for artist_data in artists_data:
                if not artist_data:
                    continue
                db.merge(Artist(
                    id=artist_data["id"],
                    name=artist_data.get("name", ""),
                    genres=artist_data.get("genres", []),
                    popularity=artist_data.get("popularity"),
                ))
            db.flush()

        for track in track_rows:
            db.merge(track)

        db.commit()

    for stream in unenriched:
        stream.enriched = True
    db.commit()

    return len(unenriched)
