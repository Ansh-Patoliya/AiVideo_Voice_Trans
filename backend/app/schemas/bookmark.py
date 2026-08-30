from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class BookmarkBase(BaseModel):
    timestamp: float
    label: str
    note: Optional[str] = None


class BookmarkCreate(BookmarkBase):
    pass


class BookmarkUpdate(BaseModel):
    label: Optional[str] = None
    note: Optional[str] = None


class BookmarkResponse(BookmarkBase):
    id: int
    media_id: int
    user_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
