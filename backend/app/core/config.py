import os
from pathlib import Path
from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

# Base Directory of backend
BASE_DIR = Path(__file__).resolve().parent.parent.parent
MEDIA_DIR = BASE_DIR / "media_storage"
MEDIA_DIR.mkdir(parents=True, exist_ok=True)
TEMP_DIR = BASE_DIR / "temp_processing"
TEMP_DIR.mkdir(parents=True, exist_ok=True)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=[str(BASE_DIR / ".env"), ".env"],
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=True
    )

    PROJECT_NAME: str = "AI Video & Voice Transcriber"
    API_V1_STR: str = "/api"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # Database
    # Defaults to SQLite for immediate local zero-dependency execution, overrideable via DATABASE_URL
    DATABASE_URL: str = Field(
        default=f"sqlite:///{BASE_DIR / 'transcriber.db'}",
        description="PostgreSQL or SQLite database connection URL"
    )

    # Security
    JWT_SECRET: str = Field(default="supersecret_jwt_key_for_development_replace_in_production_32chars", min_length=32)
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # Cloudinary credentials (backend-only)
    CLOUDINARY_CLOUD_NAME: Optional[str] = None
    CLOUDINARY_API_KEY: Optional[str] = None
    CLOUDINARY_API_SECRET: Optional[str] = None

    # Google Gemini API (backend-only)
    GEMINI_API_KEY: Optional[str] = None
    GEMINI_TRANSCRIPTION_MODEL: str = "gemini-3.5-flash"
    GEMINI_ANALYSIS_MODEL: str = "gemini-3.5-flash"
    GEMINI_MODEL: str = "gemini-3.5-flash"

    # Default Transcription Provider
    DEFAULT_TRANSCRIPTION_PROVIDER: str = "gemini"

    # FFmpeg executable path (leave empty for auto-detection)
    FFMPEG_PATH: Optional[str] = None
    FFPROBE_PATH: Optional[str] = None

    # Long Video / Audio Chunking Settings
    # 300 seconds = 5 minutes chunk size for exhaustive, gap-free transcript density
    TRANSCRIPTION_CHUNK_DURATION_SECONDS: int = 300
    AUDIO_CHUNK_DURATION_SECONDS: int = 300
    AUDIO_CHUNK_OVERLAP_SECONDS: int = 1
    TRANSCRIPTION_MAX_CONCURRENCY: int = 2

    # Storage paths
    LOCAL_STORAGE_DIR: str = str(MEDIA_DIR)
    TEMP_DIR_PATH: str = str(TEMP_DIR)

    # Redis / Celery (Optional for local dev, used in production)
    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/0"

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ]


settings = Settings()
