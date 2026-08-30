from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.media import Media
from app.models.transcript import Transcript, TranscriptSegment
from app.schemas.ai import (
    AISummaryResponse,
    AIKeyPointsResponse,
    AIKeywordsResponse,
    AIImportantSectionsResponse,
    AIAnalysisFullResponse,
)
from app.services.ai.insights import AIInsightsService

router = APIRouter(prefix="/ai", tags=["AI Insights"])
ai_service = AIInsightsService()


def _get_transcript_and_segments(media_id: int, user_id: int, db: Session):
    media = db.query(Media).filter(Media.id == media_id, Media.user_id == user_id).first()
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")

    transcript = db.query(Transcript).filter(Transcript.media_id == media_id).first()
    if not transcript:
        raise HTTPException(status_code=400, detail="Transcript is not available yet. Please wait for transcription to finish.")

    segments = (
        db.query(TranscriptSegment)
        .filter(TranscriptSegment.transcript_id == transcript.id)
        .order_by(TranscriptSegment.sequence)
        .all()
    )

    segments_data = [
        {"start_time": s.start_time, "end_time": s.end_time, "text": s.text}
        for s in segments
    ]

    return media, transcript, segments_data


@router.post("/{media_id}/insights", response_model=AIAnalysisFullResponse)
async def generate_full_insights(
    media_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generates complete AI insights (Summary, Key Points, Keywords, Important Sections)."""
    media, transcript, segments_data = _get_transcript_and_segments(media_id, current_user.id, db)

    try:
        insights = await ai_service.generate_all_insights(transcript.full_text, segments_data)
        
        # Save to database
        transcript.summary = insights.get("summary")
        transcript.key_points = insights.get("key_points")
        transcript.keywords = insights.get("keywords")
        transcript.important_sections = insights.get("important_sections")
        
        db.commit()
        db.refresh(transcript)

        return AIAnalysisFullResponse(
            summary=transcript.summary,
            key_points=transcript.key_points,
            keywords=transcript.keywords,
            important_sections=transcript.important_sections
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate AI insights: {str(e)}")


@router.post("/{media_id}/summary", response_model=AISummaryResponse)
async def generate_summary(
    media_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate concise executive summary using Gemini."""
    media, transcript, segments_data = _get_transcript_and_segments(media_id, current_user.id, db)
    
    if transcript.summary:
        return AISummaryResponse(summary=transcript.summary)

    try:
        insights = await ai_service.generate_all_insights(transcript.full_text, segments_data)
        transcript.summary = insights.get("summary", "")
        db.commit()
        return AISummaryResponse(summary=transcript.summary)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate summary: {str(e)}")


@router.post("/{media_id}/key-points", response_model=AIKeyPointsResponse)
async def generate_key_points(
    media_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate key takeaways and bullet points."""
    media, transcript, segments_data = _get_transcript_and_segments(media_id, current_user.id, db)
    
    if transcript.key_points:
        return AIKeyPointsResponse(key_points=transcript.key_points)

    try:
        insights = await ai_service.generate_all_insights(transcript.full_text, segments_data)
        transcript.key_points = insights.get("key_points", [])
        db.commit()
        return AIKeyPointsResponse(key_points=transcript.key_points)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to extract key points: {str(e)}")


@router.post("/{media_id}/keywords", response_model=AIKeywordsResponse)
async def generate_keywords(
    media_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate topical keywords and tags."""
    media, transcript, segments_data = _get_transcript_and_segments(media_id, current_user.id, db)
    
    if transcript.keywords:
        return AIKeywordsResponse(keywords=transcript.keywords)

    try:
        insights = await ai_service.generate_all_insights(transcript.full_text, segments_data)
        transcript.keywords = insights.get("keywords", [])
        db.commit()
        return AIKeywordsResponse(keywords=transcript.keywords)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to extract keywords: {str(e)}")


@router.post("/{media_id}/important-sections", response_model=AIImportantSectionsResponse)
async def generate_important_sections(
    media_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate timestamped key moments and explanations."""
    media, transcript, segments_data = _get_transcript_and_segments(media_id, current_user.id, db)
    
    if transcript.important_sections:
        return AIImportantSectionsResponse(important_sections=transcript.important_sections)

    try:
        insights = await ai_service.generate_all_insights(transcript.full_text, segments_data)
        transcript.important_sections = insights.get("important_sections", [])
        db.commit()
        return AIImportantSectionsResponse(important_sections=transcript.important_sections)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to identify important sections: {str(e)}")
