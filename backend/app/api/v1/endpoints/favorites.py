from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.media import Media
from app.models.favorite import Favourite
from app.schemas.media import MediaResponse
from app.api.v1.endpoints.media import _format_media_response

router = APIRouter(prefix="/favourites", tags=["Favourites"])


@router.post("/{media_id}", status_code=status.HTTP_201_CREATED)
def add_favourite(
    media_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark media item as favourite."""
    media = db.query(Media).filter(Media.id == media_id, Media.user_id == current_user.id).first()
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")

    existing = db.query(Favourite).filter(Favourite.user_id == current_user.id, Favourite.media_id == media_id).first()
    if not existing:
        fav = Favourite(user_id=current_user.id, media_id=media_id)
        db.add(fav)
        db.commit()

    return {"message": "Added to favourites", "media_id": media_id}


@router.delete("/{media_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_favourite(
    media_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove media item from favourites."""
    fav = db.query(Favourite).filter(Favourite.user_id == current_user.id, Favourite.media_id == media_id).first()
    if fav:
        db.delete(fav)
        db.commit()
    return None


@router.get("/", response_model=List[MediaResponse])
def list_favourites(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve all favorited media items."""
    media_items = (
        db.query(Media)
        .join(Favourite, Favourite.media_id == Media.id)
        .filter(Favourite.user_id == current_user.id)
        .order_by(desc(Favourite.created_at))
        .all()
    )
    return [_format_media_response(m, current_user.id, db) for m in media_items]
