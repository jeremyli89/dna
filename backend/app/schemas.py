from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime
import uuid


class UserOut(BaseModel):
    id: uuid.UUID
    spotify_id: str
    display_name: Optional[str] = None
    email: Optional[str] = None
    avatar_url: Optional[str] = None

    model_config = {"from_attributes": True}


class PersonalityDimensions(BaseModel):
    explorer: float
    loyalist: float
    adventurous: float
    nostalgic: float
    mainstream: float
    night_owl: float


class WeeklySnapshotOut(BaseModel):
    week_start: str
    explorer_score: Optional[float] = None
    loyalist_score: Optional[float] = None
    adventurous_score: Optional[float] = None
    nostalgic_score: Optional[float] = None
    mainstream_score: Optional[float] = None
    night_owl_score: Optional[float] = None
    stream_count: Optional[int] = None
    unique_artists: Optional[int] = None
    unique_genres: Optional[int] = None


class DnaScore(BaseModel):
    dna_id: str
    similarity_to_last_month: Optional[float] = None
    trait_vector: PersonalityDimensions


class InsightOut(BaseModel):
    id: uuid.UUID
    generated_at: datetime
    insight_type: str
    content: str
    data: Optional[Any] = None

    model_config = {"from_attributes": True}


class IngestStatus(BaseModel):
    total_streams: int
    unenriched: int
    history_streams: int
    api_streams: int
    last_polled_at: Optional[int] = None
    oldest_stream: Optional[str] = None
    newest_stream: Optional[str] = None


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
