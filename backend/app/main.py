import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.database import engine, Base
from app.api.v1.router import api_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("app.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB tables
    logger.info("Initializing database schema...")
    Base.metadata.create_all(bind=engine)
    
    # Auto-migrate new columns for existing tables
    try:
        from sqlalchemy import inspect, text
        with engine.begin() as conn:
            inspector = inspect(conn)
            if "transcript_segments" in inspector.get_table_names():
                columns = [c["name"] for c in inspector.get_columns("transcript_segments")]
                if "original_text" not in columns:
                    logger.info("Migrating schema: adding original_text to transcript_segments")
                    conn.execute(text("ALTER TABLE transcript_segments ADD COLUMN original_text TEXT"))
                if "is_edited" not in columns:
                    logger.info("Migrating schema: adding is_edited to transcript_segments")
                    conn.execute(text("ALTER TABLE transcript_segments ADD COLUMN is_edited BOOLEAN DEFAULT FALSE"))
    except Exception as e:
        logger.warning(f"Schema auto-migration check: {e}")

    logger.info("Database initialized.")
    yield
    logger.info("Shutting down application...")


app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
    lifespan=lifespan
)

cors_origins = list(settings.CORS_ORIGINS) + [
    "https://ai-video-voice-trans.vercel.app",
    "https://ai-video-voice-trans-backend.onrender.com",
]

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Router
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/")
def root():
    """Root info endpoint."""
    return {
        "message": "AI Video & Voice Transcriber API is running.",
        "docs_url": f"{settings.API_V1_STR}/docs",
        "health_check": "/health",
        "frontend_url": "http://localhost:5173"
    }


@app.get("/health")
def health_check():
    """Health check endpoint for container orchestrators and monitoring."""
    return {"status": "healthy", "service": settings.PROJECT_NAME}


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global unhandled error: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred. Please try again later."}
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
