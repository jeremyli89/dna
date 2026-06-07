from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from jose import jwt, JWTError
from datetime import datetime, timedelta

from .database import get_db
from .config import settings
from .models import User
from .services.spotify import SpotifyClient, spotify_refresh_token

bearer = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
) -> User:
    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],
        )
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(401, "Invalid token")
    except JWTError:
        raise HTTPException(401, "Invalid token")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(401, "User not found")
    return user


async def get_spotify_client(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SpotifyClient:
    if user.token_expires_at and user.token_expires_at < datetime.utcnow():
        new_tokens = await spotify_refresh_token(user.refresh_token)
        user.access_token = new_tokens["access_token"]
        user.token_expires_at = datetime.utcnow() + timedelta(
            seconds=new_tokens.get("expires_in", 3600)
        )
        if "refresh_token" in new_tokens:
            user.refresh_token = new_tokens["refresh_token"]
        db.commit()

    return SpotifyClient(user.access_token)
