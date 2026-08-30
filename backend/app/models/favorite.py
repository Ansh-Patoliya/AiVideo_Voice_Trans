from datetime import datetime, timezone
from sqlalchemy import Column, Integer, ForeignKey, DateTime, UniqueConstraint
from sqlalchemy.orm import relationship
from app.core.database import Base


class Favourite(Base):
    __tablename__ = "favourites"
    __table_args__ = (UniqueConstraint("user_id", "media_id", name="uq_user_media_favourite"),)

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    media_id = Column(Integer, ForeignKey("media.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)

    user = relationship("User", back_populates="favourites")
    media = relationship("Media", back_populates="favourites")
