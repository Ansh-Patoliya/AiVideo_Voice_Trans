from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Boolean, JSON, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base


class UserToneMemory(Base):
    __tablename__ = "user_tone_memories"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    persona_title = Column(String(255), default="Custom Creator Voice", nullable=False)
    traits = Column(JSON, default=list, nullable=False)  # List of string bullet points
    raw_instructions_history = Column(JSON, default=list, nullable=False)  # Recent prompt inputs
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="tone_memory")
