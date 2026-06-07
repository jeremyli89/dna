import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, Date,
    Text, BigInteger, ForeignKey, UniqueConstraint
)
from sqlalchemy.dialects.postgresql import UUID, ARRAY, JSONB
from sqlalchemy.orm import relationship
from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    spotify_id = Column(String, unique=True, nullable=False, index=True)
    display_name = Column(String)
    email = Column(String)
    avatar_url = Column(String)
    access_token = Column(Text)
    refresh_token = Column(Text)
    token_expires_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    streams = relationship("Stream", back_populates="user", lazy="dynamic")
    snapshots = relationship("WeeklySnapshot", back_populates="user", lazy="dynamic")
    insights = relationship("Insight", back_populates="user", lazy="dynamic")


class Artist(Base):
    __tablename__ = "artists"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    genres = Column(ARRAY(String), default=[])
    popularity = Column(Integer)
    cached_at = Column(DateTime, default=datetime.utcnow)


class Track(Base):
    __tablename__ = "tracks"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    artist_id = Column(String, ForeignKey("artists.id", ondelete="SET NULL"), nullable=True)
    artist_name = Column(String)
    album_name = Column(String)
    release_date = Column(String)
    release_year = Column(Integer)
    popularity = Column(Integer)
    cached_at = Column(DateTime, default=datetime.utcnow)


class Stream(Base):
    __tablename__ = "streams"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    spotify_track_id = Column(String, index=True)
    track_name = Column(String)
    artist_name = Column(String)
    album_name = Column(String)
    played_at = Column(DateTime, nullable=False, index=True)
    ms_played = Column(Integer)
    skipped = Column(Boolean)
    shuffle = Column(Boolean)
    reason_start = Column(String)
    reason_end = Column(String)
    source = Column(String)
    enriched = Column(Boolean, default=False, index=True)

    user = relationship("User", back_populates="streams")

    __table_args__ = (
        UniqueConstraint("user_id", "spotify_track_id", "played_at", name="uq_stream_dedup"),
    )


class WeeklySnapshot(Base):
    __tablename__ = "weekly_snapshots"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    week_start = Column(Date, nullable=False)

    explorer_score = Column(Float)
    loyalist_score = Column(Float)
    adventurous_score = Column(Float)
    nostalgic_score = Column(Float)
    mainstream_score = Column(Float)
    night_owl_score = Column(Float)

    new_artist_ratio = Column(Float)
    top10_share = Column(Float)
    genre_entropy = Column(Float)
    avg_release_year = Column(Float)
    avg_popularity = Column(Float)
    late_night_ratio = Column(Float)
    unique_artists = Column(Integer)
    unique_genres = Column(Integer)
    stream_count = Column(Integer)

    computed_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="snapshots")

    __table_args__ = (
        UniqueConstraint("user_id", "week_start", name="uq_snapshot_week"),
    )


class PollCursor(Base):
    __tablename__ = "poll_cursors"

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    last_played_at = Column(BigInteger)
    updated_at = Column(DateTime, default=datetime.utcnow)


class Insight(Base):
    __tablename__ = "insights"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    generated_at = Column(DateTime, default=datetime.utcnow)
    insight_type = Column(String)
    content = Column(Text)
    data = Column(JSONB)

    user = relationship("User", back_populates="insights")
