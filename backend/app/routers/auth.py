import base64
import secrets
from datetime import datetime, timedelta
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from jose import jwt
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..models import User
from ..schemas import AuthResponse, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])

SCOPES = [
    "user-read-recently-played",
    "user-read-email",
    "user-read-private",
]


@router.get("/login")
def login():
    state = secrets.token_urlsafe(16)
    params = {
        "client_id": settings.spotify_client_id,
        "response_type": "code",
        "redirect_uri": settings.spotify_redirect_uri,
        "scope": " ".join(SCOPES),
        "state": state,
        "show_dialog": "false",
    }
    url = f"https://accounts.spotify.com/authorize?{urlencode(params)}"
    return {"url": url, "state": state}


@router.get("/callback", response_model=AuthResponse)
async def callback(
    code: str = Query(...),
    state: str = Query(None),
    db: Session = Depends(get_db),
):
    credentials = base64.b64encode(
        f"{settings.spotify_client_id}:{settings.spotify_client_secret}".encode()
    ).decode()

    async with httpx.AsyncClient() as client:
        token_res = await client.post(
            "https://accounts.spotify.com/api/token",
            headers={
                "Authorization": f"Basic {credentials}",
                "Content-Type": "application/x-www-form-urlencoded",
            },
            data={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": settings.spotify_redirect_uri,
            },
        )
        if token_res.status_code != 200:
            raise HTTPException(400, f"Token exchange failed: {token_res.text}")
        token_data = token_res.json()

    access_token = token_data["access_token"]
    refresh_token = token_data["refresh_token"]
    expires_in = token_data.get("expires_in", 3600)

    async with httpx.AsyncClient() as client:
        profile_res = await client.get(
            "https://api.spotify.com/v1/me",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        profile_res.raise_for_status()
        profile = profile_res.json()

    spotify_id = profile["id"]
    images = profile.get("images", [])
    avatar_url = images[0]["url"] if images else None

    user = db.query(User).filter(User.spotify_id == spotify_id).first()
    if not user:
        user = User(spotify_id=spotify_id)
        db.add(user)

    user.display_name = profile.get("display_name")
    user.email = profile.get("email")
    user.avatar_url = avatar_url
    user.access_token = access_token
    user.refresh_token = refresh_token
    user.token_expires_at = datetime.utcnow() + timedelta(seconds=expires_in)
    db.commit()
    db.refresh(user)

    jwt_payload = {
        "sub": str(user.id),
        "exp": datetime.utcnow() + timedelta(minutes=settings.jwt_expire_minutes),
    }
    jwt_token = jwt.encode(jwt_payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)

    return AuthResponse(access_token=jwt_token, user=UserOut.model_validate(user))
