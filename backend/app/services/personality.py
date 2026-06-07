import math
from collections import Counter
from datetime import datetime, timedelta
from typing import List, Dict


def compute_explorer(streams: list) -> float:
    now = datetime.utcnow()
    recent_cutoff = now - timedelta(days=30)
    prior_start = now - timedelta(days=90)
    prior_end = now - timedelta(days=30)

    recent = [s for s in streams if s.played_at >= recent_cutoff]
    prior = [s for s in streams if prior_start <= s.played_at < prior_end]

    if not recent:
        return 50.0

    prior_artists = {s.artist_name for s in prior if s.artist_name}
    prior_tracks = {s.spotify_track_id for s in prior if s.spotify_track_id}
    recent_artists = {s.artist_name for s in recent if s.artist_name}
    recent_tracks = {s.spotify_track_id for s in recent if s.spotify_track_id}

    if not prior_artists:
        return 60.0

    new_artist_ratio = len(recent_artists - prior_artists) / max(len(recent_artists), 1)
    new_track_ratio = (
        len(recent_tracks - prior_tracks) / max(len(recent_tracks), 1)
        if recent_tracks
        else 0.5
    )

    return min(100.0, (new_artist_ratio * 0.6 + new_track_ratio * 0.4) * 100)


def compute_loyalist(streams: list) -> float:
    if not streams:
        return 50.0
    artist_counts = Counter(s.artist_name for s in streams if s.artist_name)
    total = len(streams)
    top10_sum = sum(c for _, c in artist_counts.most_common(10))
    return min(100.0, (top10_sum / total) * 100)


def compute_adventurous(streams: list, artist_genres: Dict[str, list]) -> float:
    genre_counts = Counter()
    for s in streams:
        for g in artist_genres.get(s.artist_name or "", []):
            genre_counts[g] += 1

    if len(genre_counts) <= 1:
        return max(20.0, len(genre_counts) * 10.0)

    total = sum(genre_counts.values())
    entropy = -sum((c / total) * math.log2(c / total) for c in genre_counts.values())
    max_entropy = math.log2(len(genre_counts))

    return min(100.0, (entropy / max_entropy) * 100) if max_entropy > 0 else 50.0


def compute_nostalgic(streams: list, track_release_years: Dict[str, int]) -> float:
    current_year = datetime.utcnow().year
    years = [
        track_release_years[s.spotify_track_id]
        for s in streams
        if s.spotify_track_id and s.spotify_track_id in track_release_years
    ]

    if not years:
        return 50.0

    avg_year = sum(years) / len(years)
    old_5 = sum(1 for y in years if y < current_year - 5) / len(years)
    old_10 = sum(1 for y in years if y < current_year - 10) / len(years)

    year_score = max(0.0, min(1.0, (current_year - avg_year) / 30.0))
    return min(100.0, max(0.0, (year_score * 0.5 + old_5 * 0.3 + old_10 * 0.2) * 100))


def compute_mainstream(streams: list, track_popularities: Dict[str, int]) -> float:
    pops = [
        track_popularities[s.spotify_track_id]
        for s in streams
        if s.spotify_track_id and s.spotify_track_id in track_popularities
    ]
    return sum(pops) / len(pops) if pops else 50.0


def compute_night_owl(streams: list) -> float:
    if not streams:
        return 0.0
    night = sum(1 for s in streams if 0 <= s.played_at.hour < 5)
    return min(100.0, (night / len(streams)) * 100)


def compute_genre_entropy(streams: list, artist_genres: Dict[str, list]) -> float:
    genre_counts = Counter()
    for s in streams:
        for g in artist_genres.get(s.artist_name or "", []):
            genre_counts[g] += 1
    if not genre_counts:
        return 0.0
    total = sum(genre_counts.values())
    return -sum((c / total) * math.log2(c / total) for c in genre_counts.values())


def compute_all_dimensions(
    streams: list,
    artist_genres: Dict[str, list],
    track_release_years: Dict[str, int],
    track_popularities: Dict[str, int],
) -> dict:
    return {
        "explorer": round(compute_explorer(streams), 1),
        "loyalist": round(compute_loyalist(streams), 1),
        "adventurous": round(compute_adventurous(streams, artist_genres), 1),
        "nostalgic": round(compute_nostalgic(streams, track_release_years), 1),
        "mainstream": round(compute_mainstream(streams, track_popularities), 1),
        "night_owl": round(compute_night_owl(streams), 1),
    }
