from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, HttpUrl, ConfigDict


class MediaBase(BaseModel):
    title: str
    source_type: str = "upload"
    media_type: str = "video"


class MediaUrlCreate(BaseModel):
    url: str
    title: Optional[str] = None


class MediaUpdate(BaseModel):
    title: Optional[str] = None
    language: Optional[str] = None


class MediaResponse(BaseModel):
    id: int
    user_id: int
    title: str
    source_type: str
    source_url: Optional[str] = None
    cloudinary_public_id: Optional[str] = None
    cloudinary_url: Optional[str] = None
    local_media_path: Optional[str] = None
    media_type: str
    mime_type: Optional[str] = None
    duration: Optional[float] = 0.0
    file_size: Optional[int] = 0
    language: Optional[str] = "en"
    status: str
    error_message: Optional[str] = None
    is_favourite: bool = False
    is_pinned: bool = False
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MediaStatusResponse(BaseModel):
    id: int
    status: str
    error_message: Optional[str] = None
    duration: Optional[float] = 0.0
    updated_at: datetime
