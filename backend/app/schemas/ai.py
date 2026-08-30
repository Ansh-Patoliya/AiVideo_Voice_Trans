from typing import List, Optional, Any
from pydantic import BaseModel


class AISummaryResponse(BaseModel):
    summary: str


class AIKeyPointsResponse(BaseModel):
    key_points: List[str]


class AIKeywordsResponse(BaseModel):
    keywords: List[str]


class AIImportantSectionItem(BaseModel):
    timestamp: float
    formatted_time: str
    title: str
    reason: str


class AIImportantSectionsResponse(BaseModel):
    important_sections: List[AIImportantSectionItem]


class AIAnalysisFullResponse(BaseModel):
    summary: Optional[str] = None
    key_points: Optional[List[str]] = None
    keywords: Optional[List[str]] = None
    important_sections: Optional[List[AIImportantSectionItem]] = None
