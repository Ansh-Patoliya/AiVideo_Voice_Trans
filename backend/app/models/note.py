from datetime import datetime, timezone
from sqlalchemy import Column, Integer, Float, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from app.core.database import Base


class Note(Base):
    __tablename__ = "notes"

    id = Column(Integer, primary_key=True, index=True)
    media_id = Column(Integer, ForeignKey("media.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    timestamp = Column(Float, nullable=True, index=True)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    media = relationship("Media", back_populates="notes")
    user = relationship("User", back_populates="notes")
