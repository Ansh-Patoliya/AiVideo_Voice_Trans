from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.media import Media
from app.models.transcript import Transcript, TranscriptSegment
from app.schemas.transcript import (
    TranscriptResponse,
    TranscriptUpdate,
    TranscriptSegmentResponse,
    TranscriptSegmentUpdate,
    TranscriptSegmentCreate,
)

router = APIRouter(prefix="/transcripts", tags=["Transcripts"])


@router.get("/{media_id}", response_model=TranscriptResponse)
def get_transcript_for_media(
    media_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve full transcript and ordered segments for a media item."""
    media = db.query(Media).filter(Media.id == media_id, Media.user_id == current_user.id).first()
    if not media:
        raise HTTPException(status_code=404, detail="Media item not found")

    transcript = db.query(Transcript).filter(Transcript.media_id == media_id).first()
    if not transcript:
        raise HTTPException(status_code=404, detail="Transcript not available yet for this media.")

    return transcript


@router.patch("/{media_id}", response_model=TranscriptResponse)
def update_transcript(
    media_id: int,
    update_data: TranscriptUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update global transcript fields (e.g. language or concatenated text)."""
    media = db.query(Media).filter(Media.id == media_id, Media.user_id == current_user.id).first()
    if not media:
        raise HTTPException(status_code=404, detail="Media item not found")

    transcript = db.query(Transcript).filter(Transcript.media_id == media_id).first()
    if not transcript:
        raise HTTPException(status_code=404, detail="Transcript not found")

    if update_data.full_text is not None:
        transcript.full_text = update_data.full_text
    if update_data.language is not None:
        transcript.language = update_data.language

    db.commit()
    db.refresh(transcript)
    return transcript


@router.patch("/segments/{segment_id}", response_model=TranscriptSegmentResponse)
def edit_transcript_segment(
    segment_id: int,
    update_data: TranscriptSegmentUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Inline edit of a transcript segment.
    Updates dialogue text and/or speaker while strictly preserving start_time and end_time timestamps.
    """
    segment = db.query(TranscriptSegment).filter(TranscriptSegment.id == segment_id).first()
    if not segment:
        raise HTTPException(status_code=404, detail="Transcript segment not found")

    # Verify authorization through parent transcript -> media -> user
    transcript = db.query(Transcript).filter(Transcript.id == segment.transcript_id).first()
    if not transcript:
        raise HTTPException(status_code=404, detail="Parent transcript not found")

    media = db.query(Media).filter(Media.id == transcript.media_id, Media.user_id == current_user.id).first()
    if not media:
        raise HTTPException(status_code=403, detail="Not authorized to edit this transcript segment")

    # Update text and speaker; preserve start_time and end_time
    segment.text = update_data.text.strip()
    if update_data.speaker is not None:
        segment.speaker = update_data.speaker.strip() if update_data.speaker else None

    # Reconstruct full_text
    all_segments = db.query(TranscriptSegment).filter(TranscriptSegment.transcript_id == transcript.id).order_by(TranscriptSegment.sequence).all()
    transcript.full_text = " ".join([s.text for s in all_segments])

    db.commit()
    db.refresh(segment)
    return segment


@router.delete("/segments/{segment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_transcript_segment(
    segment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a single transcript segment."""
    segment = db.query(TranscriptSegment).filter(TranscriptSegment.id == segment_id).first()
    if not segment:
        raise HTTPException(status_code=404, detail="Segment not found")

    transcript = db.query(Transcript).filter(Transcript.id == segment.transcript_id).first()
    media = db.query(Media).filter(Media.id == transcript.media_id, Media.user_id == current_user.id).first()
    if not media:
        raise HTTPException(status_code=403, detail="Not authorized")

    db.delete(segment)
    db.commit()
    return None
