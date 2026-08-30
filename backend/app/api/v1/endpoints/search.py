from typing import List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.media import Media
from app.models.transcript import Transcript, TranscriptSegment
from app.models.bookmark import Bookmark
from app.models.note import Note
from app.schemas.search import SearchResponse, SearchResultItem

router = APIRouter(prefix="/search", tags=["Global Search"])


@router.get("/", response_model=SearchResponse)
def global_search(
    q: str = Query(..., min_length=1, description="Search query string"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Search globally across transcript titles, dialogue segments, notes, and bookmark labels.
    """
    query_term = f"%{q.strip()}%"
    results: List[SearchResultItem] = []

    # 1. Match Media Titles
    matched_media = db.query(Media).filter(
        Media.user_id == current_user.id,
        Media.title.ilike(query_term)
    ).all()
    for m in matched_media:
        results.append(
            SearchResultItem(
                media_id=m.id,
                media_title=m.title,
                media_type=m.media_type,
                source_type=m.source_type,
                match_type="title",
                matched_text=m.title,
                timestamp=0.0,
                created_at=m.created_at.isoformat()
            )
        )

    # 2. Match Transcript Segments
    matched_segments = (
        db.query(TranscriptSegment, Media)
        .join(Transcript, Transcript.id == TranscriptSegment.transcript_id)
        .join(Media, Media.id == Transcript.media_id)
        .filter(Media.user_id == current_user.id, TranscriptSegment.text.ilike(query_term))
        .limit(50)
        .all()
    )
    for seg, med in matched_segments:
        results.append(
            SearchResultItem(
                media_id=med.id,
                media_title=med.title,
                media_type=med.media_type,
                source_type=med.source_type,
                match_type="transcript",
                matched_text=seg.text,
                timestamp=seg.start_time,
                created_at=seg.created_at.isoformat()
            )
        )

    # 3. Match Notes
    matched_notes = (
        db.query(Note, Media)
        .join(Media, Media.id == Note.media_id)
        .filter(Media.user_id == current_user.id, Note.content.ilike(query_term))
        .all()
    )
    for note, med in matched_notes:
        results.append(
            SearchResultItem(
                media_id=med.id,
                media_title=med.title,
                media_type=med.media_type,
                source_type=med.source_type,
                match_type="note",
                matched_text=note.content,
                timestamp=note.timestamp or 0.0,
                created_at=note.created_at.isoformat()
            )
        )

    # 4. Match Bookmarks
    matched_bookmarks = (
        db.query(Bookmark, Media)
        .join(Media, Media.id == Bookmark.media_id)
        .filter(
            Media.user_id == current_user.id,
            (Bookmark.label.ilike(query_term) | Bookmark.note.ilike(query_term))
        )
        .all()
    )
    for bm, med in matched_bookmarks:
        results.append(
            SearchResultItem(
                media_id=med.id,
                media_title=med.title,
                media_type=med.media_type,
                source_type=med.source_type,
                match_type="bookmark",
                matched_text=f"{bm.label}: {bm.note}" if bm.note else bm.label,
                timestamp=bm.timestamp,
                created_at=bm.created_at.isoformat()
            )
        )

    return SearchResponse(query=q, total_results=len(results), results=results)
