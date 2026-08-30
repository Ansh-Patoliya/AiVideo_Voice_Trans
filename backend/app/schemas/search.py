from typing import List, Optional
from pydantic import BaseModel


class SearchResultItem(BaseModel):
    media_id: int
    media_title: str
    media_type: str
    source_type: str
    match_type: str  # "title", "transcript", "note", "bookmark"
    matched_text: str
    timestamp: Optional[float] = None
    created_at: str


class SearchResponse(BaseModel):
    query: str
    total_results: int
    results: List[SearchResultItem]
