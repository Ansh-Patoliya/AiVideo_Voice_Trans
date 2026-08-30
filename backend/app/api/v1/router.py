from fastapi import APIRouter
from app.api.v1.endpoints import (
    auth,
    media,
    transcripts,
    bookmarks,
    notes,
    favorites,
    pins,
    search,
    export,
    ai,
)

api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(media.router)
api_router.include_router(transcripts.router)
api_router.include_router(bookmarks.router)
api_router.include_router(notes.router)
api_router.include_router(favorites.router)
api_router.include_router(pins.router)
api_router.include_router(search.router)
api_router.include_router(export.router)
api_router.include_router(ai.router)
