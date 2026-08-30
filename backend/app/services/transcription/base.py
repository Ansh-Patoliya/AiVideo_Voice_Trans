from abc import ABC, abstractmethod
from typing import List, Optional
from pydantic import BaseModel, Field


class TranscriptSegmentData(BaseModel):
    start_time: float = Field(..., description="Start timestamp in seconds with millisecond precision")
    end_time: float = Field(..., description="End timestamp in seconds with millisecond precision")
    text: str = Field(..., description="Transcribed dialogue text")
    speaker: Optional[str] = Field(None, description="Speaker identifier if detected, otherwise None")
    sequence: int = Field(0, description="Sequential ordering index")


class TranscriptionResult(BaseModel):
    language: str = Field("en", description="Detected or specified ISO language code")
    full_text: str = Field(..., description="Concatenated complete readable transcript text")
    segments: List[TranscriptSegmentData] = Field(default_factory=list, description="Ordered timestamped segments")


class TranscriptionProvider(ABC):
    """Abstract Base Class for all speech-to-text providers."""

    @abstractmethod
    async def transcribe(
        self,
        audio_path: str,
        language_hint: Optional[str] = None,
        offset_seconds: float = 0.0
    ) -> TranscriptionResult:
        """
        Transcribes the given audio file into structured timestamped segments.
        offset_seconds is applied to all segment start/end times for chunked pipelines.
        """
        pass

    @abstractmethod
    async def detect_language(self, audio_path: str) -> str:
        """Detects the primary spoken language in the audio file."""
        pass
