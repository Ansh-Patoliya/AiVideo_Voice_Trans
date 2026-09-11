from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.media import Media
from app.models.transcript import Transcript, TranscriptSegment
from app.models.user_memory import UserToneMemory
from app.schemas.ai import (
    AISummaryResponse,
    AIKeyPointsResponse,
    AIKeywordsResponse,
    AIImportantSectionsResponse,
    AIAnalysisFullResponse,
    RephrasePreviewRequest,
    RephrasePreviewResponse,
    ApplyRephraseRequest,
    TokenUsageInfo,
    UserToneMemoryResponse,
    UserToneMemoryUpdateRequest,
)
from app.services.ai.insights import AIInsightsService
from app.services.ai.rephrase import AIRephraseService

router = APIRouter(prefix="/ai", tags=["AI Insights"])
ai_service = AIInsightsService()
rephrase_service = AIRephraseService()


@router.get("/tone-memory", response_model=UserToneMemoryResponse)
async def get_user_tone_memory(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Fetches the current user's AI tone memory and learned traits."""
    memory = db.query(UserToneMemory).filter(UserToneMemory.user_id == current_user.id).first()
    if not memory:
        return UserToneMemoryResponse(
            persona_title="Custom Creator Voice",
            traits=[],
            is_active=True,
            updated_at=None,
        )

    return UserToneMemoryResponse(
        id=memory.id,
        persona_title=memory.persona_title,
        traits=memory.traits or [],
        is_active=memory.is_active,
        updated_at=memory.updated_at.isoformat() if memory.updated_at else None,
    )


@router.put("/tone-memory", response_model=UserToneMemoryResponse)
async def update_user_tone_memory(
    req: UserToneMemoryUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Updates the user's tone memory settings, persona, traits, or active status."""
    memory = db.query(UserToneMemory).filter(UserToneMemory.user_id == current_user.id).first()
    if not memory:
        memory = UserToneMemory(
            user_id=current_user.id,
            persona_title=req.persona_title or "Custom Creator Voice",
            traits=req.traits or [],
            is_active=req.is_active if req.is_active is not None else True,
        )
        db.add(memory)
    else:
        if req.persona_title is not None:
            memory.persona_title = req.persona_title.strip()
        if req.traits is not None:
            memory.traits = req.traits
        if req.is_active is not None:
            memory.is_active = req.is_active

    db.commit()
    db.refresh(memory)

    return UserToneMemoryResponse(
        id=memory.id,
        persona_title=memory.persona_title,
        traits=memory.traits or [],
        is_active=memory.is_active,
        updated_at=memory.updated_at.isoformat() if memory.updated_at else None,
    )


@router.delete("/tone-memory")
async def clear_user_tone_memory(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Clears all learned tone memory traits for the current user."""
    memory = db.query(UserToneMemory).filter(UserToneMemory.user_id == current_user.id).first()
    if memory:
        memory.traits = []
        memory.raw_instructions_history = []
        memory.persona_title = "Custom Creator Voice"
        db.commit()
    return {"message": "Creator tone memory cleared successfully"}


@router.post("/{media_id}/rephrase/preview", response_model=RephrasePreviewResponse)
async def generate_rephrase_preview(
    media_id: int,
    req: RephrasePreviewRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Generates a rephrased version of the full transcript paragraph with autonomous tone learning & memory."""
    media = db.query(Media).filter(Media.id == media_id, Media.user_id == current_user.id).first()
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")

    transcript = db.query(Transcript).filter(Transcript.media_id == media_id).first()
    if not transcript or not transcript.full_text:
        raise HTTPException(status_code=400, detail="Transcript is not available yet.")

    # Retrieve or initialize user memory
    memory = db.query(UserToneMemory).filter(UserToneMemory.user_id == current_user.id).first()
    if not memory:
        memory = UserToneMemory(
            user_id=current_user.id,
            persona_title="Custom Creator Voice",
            traits=[],
            raw_instructions_history=[],
            is_active=True,
        )
        db.add(memory)
        db.commit()
        db.refresh(memory)

    memory_update_notice = None
    use_mem = req.use_memory if req.use_memory is not None else memory.is_active

    # Autonomous Memory Learning: If custom instruction is provided, analyze & evolve memory
    if req.custom_instruction and req.custom_instruction.strip():
        instruction_str = req.custom_instruction.strip()
        evolve_res = await rephrase_service.extract_and_evolve_memory(
            new_instruction=instruction_str,
            current_persona=memory.persona_title,
            current_traits=memory.traits or [],
        )

        if evolve_res.get("has_style_preferences"):
            memory.persona_title = evolve_res.get("persona_title") or memory.persona_title
            memory.traits = evolve_res.get("traits") or memory.traits
            history = list(memory.raw_instructions_history or [])
            if instruction_str not in history:
                history.append(instruction_str)
            memory.raw_instructions_history = history[-10:]  # keep recent 10
            db.commit()
            db.refresh(memory)
            memory_update_notice = evolve_res.get("learned_summary") or "AI Tone Memory updated"

    # Pass memory to rephrase service
    active_traits = memory.traits if (use_mem and memory.is_active) else []
    active_persona = memory.persona_title if (use_mem and memory.is_active and active_traits) else None

    try:
        output = await rephrase_service.rephrase_paragraph(
            text=transcript.full_text,
            tone=req.tone,
            custom_instruction=req.custom_instruction,
            memory_persona=active_persona,
            memory_traits=active_traits,
            use_memory=bool(use_mem and memory.is_active),
        )
        return RephrasePreviewResponse(
            original_text=transcript.full_text,
            rephrased_text=output.get("rephrased_text", ""),
            token_usage=TokenUsageInfo(**output.get("token_usage", {})) if output.get("token_usage") else None,
            memory_update_notice=memory_update_notice,
            applied_persona=active_persona,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to rephrase transcript: {str(e)}")


@router.post("/{media_id}/rephrase/apply")
async def apply_rephrase(
    media_id: int,
    req: ApplyRephraseRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Commits the rephrased paragraph into the transcript."""
    media = db.query(Media).filter(Media.id == media_id, Media.user_id == current_user.id).first()
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")

    transcript = db.query(Transcript).filter(Transcript.media_id == media_id).first()
    if not transcript:
        raise HTTPException(status_code=400, detail="Transcript not found")

    new_text = req.rephrased_text.strip()
    if not new_text:
        raise HTTPException(status_code=400, detail="Rephrased text cannot be empty.")

    # Update the single segment
    segment = (
        db.query(TranscriptSegment)
        .filter(TranscriptSegment.transcript_id == transcript.id)
        .order_by(TranscriptSegment.sequence)
        .first()
    )

    if segment:
        if segment.original_text is None:
            segment.original_text = segment.text
        segment.text = new_text
        segment.is_edited = (segment.text != segment.original_text)

    transcript.full_text = new_text
    db.commit()
    return {"message": "Rephrased transcript saved successfully"}




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


