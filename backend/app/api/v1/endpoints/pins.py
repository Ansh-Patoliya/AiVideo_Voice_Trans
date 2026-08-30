from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.media import Media
from app.models.pin import Pin
from app.schemas.media import MediaResponse
from app.api.v1.endpoints.media import _format_media_response

router = APIRouter(prefix="/pins", tags=["Pins"])


@router.post("/{media_id}", status_code=status.HTTP_201_CREATED)
def pin_media(
    media_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Pin a media item for quick access."""
    media = db.query(Media).filter(Media.id == media_id, Media.user_id == current_user.id).first()
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")

    existing = db.query(Pin).filter(Pin.user_id == current_user.id, Pin.media_id == media_id).first()
    if not existing:
        pin = Pin(user_id=current_user.id, media_id=media_id)
        db.add(pin)
        db.commit()

    return {"message": "Pinned successfully", "media_id": media_id}


@router.delete("/{media_id}", status_code=status.HTTP_204_NO_CONTENT)
def unpin_media(
    media_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Unpin a media item."""
    pin = db.query(Pin).filter(Pin.user_id == current_user.id, Pin.media_id == media_id).first()
    if pin:
        db.delete(pin)
        db.commit()
    return None


@router.get("/", response_model=List[MediaResponse])
def list_pinned_media(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve all pinned media items."""
    media_items = (
        db.query(Media)
        .join(Pin, Pin.media_id == Media.id)
        .filter(Pin.user_id == current_user.id)
        .order_by(desc(Pin.created_at))
        .all()
    )
    return [_format_media_response(m, current_user.id, db) for m in media_items]
