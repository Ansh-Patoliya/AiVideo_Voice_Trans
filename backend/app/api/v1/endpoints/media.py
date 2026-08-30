import os
import shutil
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks, status, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.core.config import settings
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.media import Media, MediaStatus, MediaType, SourceType
from app.models.favorite import Favourite
from app.models.pin import Pin
from app.schemas.media import MediaResponse, MediaUrlCreate, MediaUpdate, MediaStatusResponse
from app.services.media.detector import PlatformDetector
from app.services.storage.cloudinary_service import StorageService
from app.workers.runner import pipeline_runner

router = APIRouter(prefix="/media", tags=["Media"])

ALLOWED_VIDEO_EXTENSIONS = {".mp4", ".mov", ".webm", ".mkv", ".avi", ".m4v"}
ALLOWED_AUDIO_EXTENSIONS = {".mp3", ".wav", ".m4a", ".aac", ".ogg", ".flac"}
ALLOWED_EXTENSIONS = ALLOWED_VIDEO_EXTENSIONS | ALLOWED_AUDIO_EXTENSIONS

storage_service = StorageService()


def _format_media_response(media: Media, user_id: int, db: Session) -> MediaResponse:
    """Helper to attach is_favourite and is_pinned state to media response."""
    is_fav = db.query(Favourite).filter(Favourite.user_id == user_id, Favourite.media_id == media.id).first() is not None
    is_pin = db.query(Pin).filter(Pin.user_id == user_id, Pin.media_id == media.id).first() is not None
    
    resp_dict = {c.name: getattr(media, c.name) for c in media.__table__.columns}
    resp_dict["is_favourite"] = is_fav
    resp_dict["is_pinned"] = is_pin
    return MediaResponse(**resp_dict)


@router.post("/upload", response_model=MediaResponse, status_code=status.HTTP_201_CREATED)
async def upload_media_file(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    language: Optional[str] = Form("en"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload a video or audio file and trigger transcription pipeline."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="Uploaded file has no filename.")

    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format '{ext}'. Allowed formats: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
        )

    media_type = "video" if ext in ALLOWED_VIDEO_EXTENSIONS else "audio"
    clean_title = title or Path(file.filename).stem.replace("_", " ").replace("-", " ").title()

    # Save to local storage directory
    save_dir = Path(settings.LOCAL_STORAGE_DIR)
    save_dir.mkdir(parents=True, exist_ok=True)
    saved_filename = f"user_{current_user.id}_{int(os.times().elapsed)}_{file.filename}"
    target_path = save_dir / saved_filename

    with open(target_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    file_size = target_path.stat().st_size

    # Create Media Record
    media = Media(
        user_id=current_user.id,
        title=clean_title,
        source_type=SourceType.UPLOAD.value,
        local_media_path=str(target_path),
        media_type=media_type,
        mime_type=file.content_type or ("video/mp4" if media_type == "video" else "audio/mpeg"),
        file_size=file_size,
        language=language or "en",
        status=MediaStatus.QUEUED.value
    )
    db.add(media)
    db.commit()
    db.refresh(media)

    # Launch background processing pipeline
    background_tasks.add_task(pipeline_runner.run_pipeline, media.id)

    return _format_media_response(media, current_user.id, db)


@router.post("/url", response_model=MediaResponse, status_code=status.HTTP_201_CREATED)
async def process_media_url(
    payload: MediaUrlCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Submit a video/audio URL (YouTube, Shorts, Instagram, Facebook, Direct URL)."""
    if not payload.url or not payload.url.strip():
        raise HTTPException(status_code=400, detail="URL cannot be empty.")

    url = payload.url.strip()
    source_type, platform_label = PlatformDetector.detect(url)

    title = payload.title or f"{platform_label} Video"

    media = Media(
        user_id=current_user.id,
        title=title,
        source_type=source_type.value,
        source_url=url,
        media_type="video",
        status=MediaStatus.QUEUED.value
    )
    db.add(media)
    db.commit()
    db.refresh(media)

    # Launch background processing pipeline
    background_tasks.add_task(pipeline_runner.run_pipeline, media.id)

    return _format_media_response(media, current_user.id, db)


@router.get("/", response_model=List[MediaResponse])
def list_user_media(
    search: Optional[str] = None,
    source: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve all media uploads for the current user."""
    query = db.query(Media).filter(Media.user_id == current_user.id)

    if search:
        query = query.filter(Media.title.ilike(f"%{search}%"))
    if source:
        query = query.filter(Media.source_type == source)
    if status_filter:
        query = query.filter(Media.status == status_filter.upper())

    media_items = query.order_by(desc(Media.created_at)).all()
    return [_format_media_response(m, current_user.id, db) for m in media_items]


@router.get("/{media_id}", response_model=MediaResponse)
def get_media_item(
    media_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get single media item by ID."""
    media = db.query(Media).filter(Media.id == media_id, Media.user_id == current_user.id).first()
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")
    return _format_media_response(media, current_user.id, db)


@router.get("/{media_id}/status", response_model=MediaStatusResponse)
def get_media_status(
    media_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Poll the real-time processing status of a media item."""
    media = db.query(Media).filter(Media.id == media_id, Media.user_id == current_user.id).first()
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")
    return MediaStatusResponse(
        id=media.id,
        status=media.status,
        error_message=media.error_message,
        duration=media.duration,
        updated_at=media.updated_at
    )


@router.patch("/{media_id}", response_model=MediaResponse)
def update_media_details(
    media_id: int,
    update_data: MediaUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update title or language metadata for a media item."""
    media = db.query(Media).filter(Media.id == media_id, Media.user_id == current_user.id).first()
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")

    if update_data.title is not None:
        media.title = update_data.title.strip()
    if update_data.language is not None:
        media.language = update_data.language.strip()

    db.commit()
    db.refresh(media)
    return _format_media_response(media, current_user.id, db)


@router.post("/{media_id}/reprocess", response_model=MediaResponse)
async def reprocess_media(
    media_id: int,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Re-trigger transcription pipeline for a media item."""
    media = db.query(Media).filter(Media.id == media_id, Media.user_id == current_user.id).first()
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")

    media.status = MediaStatus.QUEUED.value
    media.error_message = None
    db.commit()

    background_tasks.add_task(pipeline_runner.run_pipeline, media.id)
    return _format_media_response(media, current_user.id, db)


@router.delete("/{media_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_media(
    media_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete media and all associated transcripts, bookmarks, and storage assets."""
    media = db.query(Media).filter(Media.id == media_id, Media.user_id == current_user.id).first()
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")

    # Cleanup storage
    storage_service.delete_file(media.cloudinary_public_id, media.local_media_path)

    db.delete(media)
    db.commit()
    return None


@router.get("/stream/{filename}")
def stream_local_media_file(filename: str, db: Session = Depends(get_db)):
    """Streams local media file directly with full byte-range support for browser playback."""
    from urllib.parse import unquote
    clean_filename = unquote(filename)

    # 1. Check local media storage dir
    file_path = Path(settings.LOCAL_STORAGE_DIR) / clean_filename
    if not file_path.exists():
        # 2. Check temp processing dir (where downloaded YouTube/URL videos are stored)
        file_path = Path(settings.TEMP_DIR_PATH) / clean_filename

    if not file_path.exists():
        # 3. Check DB records by local_media_path substring
        media_item = db.query(Media).filter(
            (Media.local_media_path.ilike(f"%{clean_filename}%")) |
            (Media.local_media_path.ilike(f"%{filename}%"))
        ).first()
        if media_item and media_item.local_media_path and os.path.exists(media_item.local_media_path):
            file_path = Path(media_item.local_media_path)

    if not file_path.exists():
        # 4. Search prefix matches in temp_processing or media_storage
        stem = Path(clean_filename).stem[:25]
        matches = list(Path(settings.TEMP_DIR_PATH).glob(f"*{stem}*")) + list(Path(settings.LOCAL_STORAGE_DIR).glob(f"*{stem}*"))
        if matches:
            file_path = matches[0]

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Media file not found")
    
    ext = file_path.suffix.lower()
    media_type = "video/mp4" if ext in [".mp4", ".mov", ".webm", ".mkv"] else "audio/mpeg"
    return FileResponse(path=str(file_path), media_type=media_type)
