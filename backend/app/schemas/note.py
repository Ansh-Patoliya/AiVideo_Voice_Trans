from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class NoteBase(BaseModel):
    timestamp: Optional[float] = None
    content: str


class NoteCreate(NoteBase):
    pass


class NoteUpdate(BaseModel):
    timestamp: Optional[float] = None
    content: str


class NoteResponse(NoteBase):
    id: int
    media_id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
