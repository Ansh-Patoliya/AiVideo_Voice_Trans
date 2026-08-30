import enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, Text, Enum, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from app.core.database import Base


class MediaStatus(str, enum.Enum):
    UPLOADING = "UPLOADING"
    QUEUED = "QUEUED"
    PROCESSING = "PROCESSING"
    EXTRACTING_AUDIO = "EXTRACTING_AUDIO"
    TRANSCRIBING = "TRANSCRIBING"
    SAVING = "SAVING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class SourceType(str, enum.Enum):
    UPLOAD = "upload"
    YOUTUBE = "youtube"
    YOUTUBE_SHORTS = "youtube_shorts"
    INSTAGRAM = "instagram"
    FACEBOOK = "facebook"
    FACEBOOK_AD_LIBRARY = "facebook_ad_library"
    DIRECT_URL = "direct_url"


class MediaType(str, enum.Enum):
    VIDEO = "video"
    AUDIO = "audio"


class Media(Base):
    __tablename__ = "media"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(500), nullable=False)
    source_type = Column(String(50), default="upload", nullable=False)
    source_url = Column(Text, nullable=True)
    cloudinary_public_id = Column(String(255), nullable=True)
    cloudinary_url = Column(Text, nullable=True)
    local_media_path = Column(Text, nullable=True)
    media_type = Column(String(50), default="video", nullable=False)
    mime_type = Column(String(100), nullable=True)
    duration = Column(Float, nullable=True, default=0.0)
    file_size = Column(Integer, nullable=True, default=0)
    language = Column(String(50), nullable=True, default="en")
    status = Column(String(50), default=MediaStatus.QUEUED.value, nullable=False, index=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="media_items")
    transcript = relationship("Transcript", back_populates="media", uselist=False, cascade="all, delete-orphan")
    bookmarks = relationship("Bookmark", back_populates="media", cascade="all, delete-orphan")
    notes = relationship("Note", back_populates="media", cascade="all, delete-orphan")
    favourites = relationship("Favourite", back_populates="media", cascade="all, delete-orphan")
    pins = relationship("Pin", back_populates="media", cascade="all, delete-orphan")
