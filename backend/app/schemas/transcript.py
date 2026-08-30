from datetime import datetime
from typing import Optional, List, Any
from pydantic import BaseModel, ConfigDict


class TranscriptSegmentBase(BaseModel):
    start_time: float
    end_time: float
    text: str
    speaker: Optional[str] = None
    sequence: int = 0


class TranscriptSegmentCreate(TranscriptSegmentBase):
    pass


class TranscriptSegmentUpdate(BaseModel):
    text: str
    speaker: Optional[str] = None


class TranscriptSegmentResponse(TranscriptSegmentBase):
    id: int
    transcript_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TranscriptBase(BaseModel):
    language: Optional[str] = "en"
    full_text: str = ""


class TranscriptUpdate(BaseModel):
    full_text: Optional[str] = None
    language: Optional[str] = None


class ImportantSectionItem(BaseModel):
    timestamp: float
    title: str
    reason: str


class TranscriptResponse(TranscriptBase):
    id: int
    media_id: int
    summary: Optional[str] = None
    key_points: Optional[List[str]] = None
    keywords: Optional[List[str]] = None
    important_sections: Optional[List[Any]] = None
    segments: List[TranscriptSegmentResponse] = []
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
