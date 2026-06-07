import base64
import httpx
from typing import Optional, List
from ..config import settings

SPOTIFY_API = "https://api.spotify.com/v1"
SPOTIFY_AUTH = "https://accounts.spotify.com"


class RateLimitError(Exception):
    def __init__(self, retry_after: int):
        self.retry_after = retry_after


class SpotifyClient:
    def __init__(self, access_token: str):
        self.headers = {"Authorization": f"Bearer {access_token}"}

    async def get_user_profile(self) -> dict:
        async with httpx.AsyncClient() as client:
            r = await client.get(f"{SPOTIFY_API}/me", headers=self.headers)
            r.raise_for_status()
            return r.json()

    async def get_recently_played(
        self, after: Optional[int] = None, limit: int = 50
    ) -> dict:
        params: dict = {"limit": limit}
        if after:
            params["after"] = after
        async with httpx.AsyncClient() as client:
            r = await client.get(
                f"{SPOTIFY_API}/me/player/recently-played",
                headers=self.headers,
                params=params,
            )
            if r.status_code == 429:
                raise RateLimitError(int(r.headers.get("Retry-After", 5)))
            r.raise_for_status()
            return r.json()

    async def get_tracks(self, track_ids: List[str]) -> List[dict]:
        results = []
        for i in range(0, len(track_ids), 50):
            batch = track_ids[i : i + 50]
            async with httpx.AsyncClient() as client:
                r = await client.get(
                    f"{SPOTIFY_API}/tracks",
                    headers=self.headers,
                    params={"ids": ",".join(batch)},
                )
                r.raise_for_status()
                results.extend(r.json().get("tracks", []))
        return results

    async def get_artists(self, artist_ids: List[str]) -> List[dict]:
        results = []
        unique_ids = list(set(artist_ids))
        for i in range(0, len(unique_ids), 50):
            batch = unique_ids[i : i + 50]
            async with httpx.AsyncClient() as client:
                r = await client.get(
                    f"{SPOTIFY_API}/artists",
                    headers=self.headers,
                    params={"ids": ",".join(batch)},
                )
                r.raise_for_status()
                results.extend(r.json().get("artists", []))
        return results


async def spotify_refresh_token(refresh_token: str) -> dict:
    credentials = base64.b64encode(
        f"{settings.spotify_client_id}:{settings.spotify_client_secret}".encode()
    ).decode()
    async with httpx.AsyncClient() as client:
        r = await client.post(
            f"{SPOTIFY_AUTH}/api/token",
            headers={
                "Authorization": f"Basic {credentials}",
                "Content-Type": "application/x-www-form-urlencoded",
            },
            data={
                "grant_type": "refresh_token",
                "refresh_token": refresh_token,
            },
        )
        r.raise_for_status()
        return r.json()
