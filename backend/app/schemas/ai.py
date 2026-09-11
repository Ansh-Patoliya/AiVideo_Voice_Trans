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


class TokenUsageInfo(BaseModel):
    prompt_tokens: int = 0
    candidates_tokens: int = 0
    total_tokens: int = 0
    estimated_cost_usd: float = 0.0


class RephrasePreviewRequest(BaseModel):
    tone: Optional[str] = "professional"
    custom_instruction: Optional[str] = None
    use_memory: Optional[bool] = True


class RephrasePreviewResponse(BaseModel):
    original_text: str
    rephrased_text: str
    token_usage: Optional[TokenUsageInfo] = None
    memory_update_notice: Optional[str] = None
    applied_persona: Optional[str] = None


class ApplyRephraseRequest(BaseModel):
    rephrased_text: str


class UserToneMemoryResponse(BaseModel):
    id: Optional[int] = None
    persona_title: str
    traits: List[str]
    is_active: bool
    updated_at: Optional[str] = None


class UserToneMemoryUpdateRequest(BaseModel):
    persona_title: Optional[str] = None
    traits: Optional[List[str]] = None
    is_active: Optional[bool] = None

