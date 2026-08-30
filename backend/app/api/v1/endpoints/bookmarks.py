from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import asc

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.media import Media
from app.models.bookmark import Bookmark
from app.schemas.bookmark import BookmarkCreate, BookmarkUpdate, BookmarkResponse

router = APIRouter(prefix="/bookmarks", tags=["Bookmarks"])


@router.post("/{media_id}", response_model=BookmarkResponse, status_code=status.HTTP_201_CREATED)
def create_bookmark(
    media_id: int,
    bookmark_in: BookmarkCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a timestamped bookmark to a media item."""
    media = db.query(Media).filter(Media.id == media_id, Media.user_id == current_user.id).first()
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")

    bookmark = Bookmark(
        media_id=media_id,
        user_id=current_user.id,
        timestamp=bookmark_in.timestamp,
        label=bookmark_in.label.strip(),
        note=bookmark_in.note.strip() if bookmark_in.note else None
    )
    db.add(bookmark)
    db.commit()
    db.refresh(bookmark)
    return bookmark


@router.get("/{media_id}", response_model=List[BookmarkResponse])
def get_media_bookmarks(
    media_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all bookmarks for a media item ordered by timestamp."""
    bookmarks = db.query(Bookmark).filter(
        Bookmark.media_id == media_id,
        Bookmark.user_id == current_user.id
    ).order_by(asc(Bookmark.timestamp)).all()
    return bookmarks


@router.patch("/{bookmark_id}", response_model=BookmarkResponse)
def update_bookmark(
    bookmark_id: int,
    bookmark_in: BookmarkUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update bookmark label or note."""
    bookmark = db.query(Bookmark).filter(Bookmark.id == bookmark_id, Bookmark.user_id == current_user.id).first()
    if not bookmark:
        raise HTTPException(status_code=404, detail="Bookmark not found")

    if bookmark_in.label is not None:
        bookmark.label = bookmark_in.label.strip()
    if bookmark_in.note is not None:
        bookmark.note = bookmark_in.note.strip()

    db.commit()
    db.refresh(bookmark)
    return bookmark


@router.delete("/{bookmark_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_bookmark(
    bookmark_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a bookmark."""
    bookmark = db.query(Bookmark).filter(Bookmark.id == bookmark_id, Bookmark.user_id == current_user.id).first()
    if not bookmark:
        raise HTTPException(status_code=404, detail="Bookmark not found")

    db.delete(bookmark)
    db.commit()
    return None
