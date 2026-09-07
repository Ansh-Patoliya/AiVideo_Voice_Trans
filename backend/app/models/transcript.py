from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, Text, ForeignKey, DateTime, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base


class Transcript(Base):
    __tablename__ = "transcripts"

    id = Column(Integer, primary_key=True, index=True)
    media_id = Column(Integer, ForeignKey("media.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    language = Column(String(50), nullable=True, default="en")
    full_text = Column(Text, nullable=False, default="")
    summary = Column(Text, nullable=True)
    key_points = Column(JSON, nullable=True)  # List[str]
    keywords = Column(JSON, nullable=True)  # List[str]
    important_sections = Column(JSON, nullable=True)  # List[{"timestamp": 12.5, "title": "...", "reason": "..."}]
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    media = relationship("Media", back_populates="transcript")
    segments = relationship("TranscriptSegment", back_populates="transcript", cascade="all, delete-orphan", order_by="TranscriptSegment.sequence")


class TranscriptSegment(Base):
    __tablename__ = "transcript_segments"

    id = Column(Integer, primary_key=True, index=True)
    transcript_id = Column(Integer, ForeignKey("transcripts.id", ondelete="CASCADE"), nullable=False, index=True)
    start_time = Column(Float, nullable=False, index=True)
    end_time = Column(Float, nullable=False)
    text = Column(Text, nullable=False)
    speaker = Column(String(100), nullable=True)
    sequence = Column(Integer, nullable=False, default=0, index=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    transcript = relationship("Transcript", back_populates="segments")
