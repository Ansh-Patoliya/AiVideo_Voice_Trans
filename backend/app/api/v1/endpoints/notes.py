from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.media import Media
from app.models.note import Note
from app.schemas.note import NoteCreate, NoteUpdate, NoteResponse

router = APIRouter(prefix="/notes", tags=["Notes"])


@router.post("/{media_id}", response_model=NoteResponse, status_code=status.HTTP_201_CREATED)
def create_note(
    media_id: int,
    note_in: NoteCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a note to a media item (optionally with timestamp)."""
    media = db.query(Media).filter(Media.id == media_id, Media.user_id == current_user.id).first()
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")

    note = Note(
        media_id=media_id,
        user_id=current_user.id,
        timestamp=note_in.timestamp,
        content=note_in.content.strip()
    )
    db.add(note)
    db.commit()
    db.refresh(note)
    return note


@router.get("/{media_id}", response_model=List[NoteResponse])
def get_media_notes(
    media_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all notes for a media item."""
    notes = db.query(Note).filter(
        Note.media_id == media_id,
        Note.user_id == current_user.id
    ).order_by(desc(Note.created_at)).all()
    return notes


@router.patch("/{note_id}", response_model=NoteResponse)
def update_note(
    note_id: int,
    note_in: NoteUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update note content or timestamp."""
    note = db.query(Note).filter(Note.id == note_id, Note.user_id == current_user.id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    note.content = note_in.content.strip()
    if note_in.timestamp is not None:
        note.timestamp = note_in.timestamp

    db.commit()
    db.refresh(note)
    return note


@router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_note(
    note_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a note."""
    note = db.query(Note).filter(Note.id == note_id, Note.user_id == current_user.id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    db.delete(note)
    db.commit()
    return None
