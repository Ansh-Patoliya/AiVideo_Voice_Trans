from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response, PlainTextResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.media import Media
from app.models.transcript import Transcript, TranscriptSegment
from app.services.export.exporter import TranscriptExporter

router = APIRouter(prefix="/export", tags=["Export"])


def _get_media_and_segments(media_id: int, user_id: int, db: Session):
    media = db.query(Media).filter(Media.id == media_id, Media.user_id == user_id).first()
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")

    transcript = db.query(Transcript).filter(Transcript.media_id == media_id).first()
    if not transcript:
        raise HTTPException(status_code=404, detail="Transcript not found for this media")

    segments = (
        db.query(TranscriptSegment)
        .filter(TranscriptSegment.transcript_id == transcript.id)
        .order_by(TranscriptSegment.sequence)
        .all()
    )

    segments_data = [
        {
            "start_time": s.start_time,
            "end_time": s.end_time,
            "text": s.text,
            "speaker": s.speaker,
            "sequence": s.sequence
        }
        for s in segments
    ]

    return media, transcript, segments_data


@router.get("/{media_id}/txt")
def export_txt(
    media_id: int,
    timestamps: bool = Query(True, description="Include timestamps in TXT output"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Download transcript as a TXT file."""
    media, transcript, segments_data = _get_media_and_segments(media_id, current_user.id, db)
    txt_content = TranscriptExporter.export_txt(media.title, segments_data, include_timestamps=timestamps)
    
    filename = f"{media.title.replace(' ', '_')}_transcript.txt"
    return Response(
        content=txt_content,
        media_type="text/plain; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


@router.get("/{media_id}/csv")
def export_csv(
    media_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Download transcript as a CSV file."""
    media, transcript, segments_data = _get_media_and_segments(media_id, current_user.id, db)
    csv_content = TranscriptExporter.export_csv(segments_data)
    
    filename = f"{media.title.replace(' ', '_')}_transcript.csv"
    return Response(
        content=csv_content,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


@router.get("/{media_id}/srt")
def export_srt(
    media_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Download subtitles as a SubRip (.srt) file."""
    media, transcript, segments_data = _get_media_and_segments(media_id, current_user.id, db)
    srt_content = TranscriptExporter.export_srt(segments_data)
    
    filename = f"{media.title.replace(' ', '_')}.srt"
    return Response(
        content=srt_content,
        media_type="application/x-subrip; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


@router.get("/{media_id}/pdf")
def export_pdf(
    media_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Download formatted PDF document."""
    media, transcript, segments_data = _get_media_and_segments(media_id, current_user.id, db)
    pdf_bytes = TranscriptExporter.export_pdf(media.title, segments_data, summary=transcript.summary)
    
    filename = f"{media.title.replace(' ', '_')}_transcript.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


@router.get("/{media_id}/docx")
def export_docx(
    media_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Download formatted Word (.docx) document."""
    media, transcript, segments_data = _get_media_and_segments(media_id, current_user.id, db)
    docx_bytes = TranscriptExporter.export_docx(media.title, segments_data, summary=transcript.summary)
    
    filename = f"{media.title.replace(' ', '_')}_transcript.docx"
    return Response(
        content=docx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )
