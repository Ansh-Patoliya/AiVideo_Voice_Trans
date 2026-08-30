# AI Video & Voice Transcriber

A complete, production-quality internal full-stack web application for uploading, transcribing, synchronizing, editing, annotating, exporting, and analyzing video and audio content.

---

## Architecture Overview

```
+-----------------------------------------------------------------------------------+
|                        React + Vite + TypeScript Frontend                         |
|  +----------------+  +-------------------+  +-----------------+  +--------------+ |
|  | Studio Player  |  | Synchronized Live |  | AI Insights     |  | Bookmarks &  | |
|  | & Seek Scrubber|  | Transcript Table  |  | (Summary/Points)|  | Notes Hub    | |
|  +----------------+  +-------------------+  +-----------------+  +--------------+ |
+-----------------------------------------------------------------------------------+
                                         | REST / JWT
                                         v
+-----------------------------------------------------------------------------------+
|                               FastAPI Backend API                                 |
|  +------------------------------------------------------------------------------+ |
|  | Routers: /auth, /media, /transcripts, /bookmarks, /notes, /export, /ai       | |
|  +------------------------------------------------------------------------------+ |
|        |                               |                              |           |
|        v                               v                              v           |
|  +-------------+              +------------------+           +------------------+ |
|  | Cloudinary/ |              | Media Processor  |           | STT Engine       | |
|  | File Store  |              | (FFmpeg / Probe) |           | (Gemini Provider)| |
|  +-------------+              +------------------+           +------------------+ |
|        |                               |                              |           |
|        v                               v                              v           |
|  +------------------------------------------------------------------------------+ |
|  | Background Worker (Celery/Redis or Async Thread Worker) & Job State Manager  | |
|  +------------------------------------------------------------------------------+ |
|        |                                                                          |
|        v                                                                          |
|  +------------------------------------------------------------------------------+ |
|  | PostgreSQL (Production) / SQLite (Local Zero-Dependency Mode)                | |
|  +------------------------------------------------------------------------------+ |
+-----------------------------------------------------------------------------------+
```

---

## Key Features

1. **Multi-Source Media Ingestion**:
   - Local drag-and-drop file upload: MP4, MOV, WEBM, MKV, MP3, WAV, M4A, AAC up to 500MB with MIME validation.
   - Streamlined URL processing: YouTube, YouTube Shorts, Instagram Reels, Facebook Video, Facebook Reels, and Direct Video/Audio Streams.
   - Polite fallback prompt for restricted URL platforms: `"Direct processing isn't available for this URL. Please download the video and upload the file instead."`

2. **FFmpeg Speech Pre-Processing**:
   - Audio extraction to 16,000 Hz 16-bit mono WAV/MP3.
   - Automatic FFmpeg binary resolution (`imageio-ffmpeg`, system PATH, or `FFMPEG_PATH`).
   - Audio chunking (configurable duration & overlap) for long-form recordings with offset timestamp alignment.
   - Temporary file isolation and guaranteed cleanup.

3. **Pluggable AI Speech-to-Text Provider Architecture**:
   - Clean abstract `TranscriptionProvider` interface (`base.py`, `gemini.py`, `provider_factory.py`).
   - Production Gemini implementation with verbatim dialogue fidelity, natural punctuation, Australian English nuance, and segment-level timestamps with millisecond precision.
   - Modular factory design allowing alternative providers (Whisper, Deepgram, etc.) without touching application core logic.

4. **Synchronized Video + Transcript Studio**:
   - Video / Audio player with custom scrubber, playback speed picker (0.5x to 2x), volume slider, and timeline bookmark markers.
   - Real-time active segment highlighting as video plays.
   - Click segment timecode to seek video directly.
   - Smooth auto-scroll toggle.
   - Inline segment text editing (strictly preserving start & end timestamps).
   - In-transcript search with match counts, navigation (Next/Prev), and click-to-seek.

5. **Multi-Format Exports**:
   - **TXT**: Plain readable transcript with or without timestamps.
   - **CSV**: Standard columns `Timestamp, Speaker, Transcript`.
   - **SRT**: SubRip subtitle formatting (`00:00:00,000 --> 00:00:04,500`).
   - **PDF**: Styled document report with executive summary and dialogue.
   - **DOCX**: Microsoft Word document.

6. **Phase 2 & Phase 3 Features**:
   - **Bookmarks**: Timestamped bookmarks with labels and notes.
   - **Notes**: Session notes with optional timestamp references.
   - **Pinned & Favourites**: Quick access collections.
   - **Global Search**: Search across transcript titles, spoken dialogue, notes, and bookmark labels.
   - **AI Insights**: LLM-driven Executive Summary, Key Points bullet list, Topical Keywords tags, and Important Sections with clickable timestamp seekers.

---

## Tech Stack

- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Lucide React, Axios.
- **Backend**: Python 3.11+, FastAPI, Pydantic V2, SQLAlchemy 2.0.
- **Database**: PostgreSQL (Production) / SQLite (Local zero-dependency development).
- **Processing**: FFmpeg (via `imageio-ffmpeg` or system binary), `yt-dlp`.
- **Storage**: Cloudinary with local storage fallback.
- **Workers**: Celery + Redis (Production) / Async Threaded Background Tasks (Local).

---

## Getting Started

### 1. Prerequisites
- Python 3.10+
- Node.js 18+ & npm
- (Optional) Docker & Docker Compose

### 2. Backend Setup
```bash
# Navigate to backend
cd backend

# Create virtual environment
python -m venv venv

# Activate venv
# On Windows:
venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp ../.env.example .env
# Edit .env and supply GEMINI_API_KEY (and optionally Cloudinary credentials)

# Run Backend
uvicorn app.main:app --reload --port 8000
```
Backend will be live at `http://localhost:8000`. Interactive Swagger API docs at `http://localhost:8000/api/docs`.

### 3. Frontend Setup
```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Run Vite dev server
npm run dev
```
Frontend will be live at `http://localhost:5173`.

### 4. Running Backend Tests
```bash
# From repository root
backend/venv/Scripts/pytest backend/tests -v
```

---

## Docker Deployment (PostgreSQL + Redis + Celery)

```bash
cd docker
docker compose up --build
```
Services spun up:
- `postgres`: PostgreSQL database on port `5432`
- `redis`: Redis message broker on port `6379`
- `backend`: FastAPI API server on port `8000`
- `celery_worker`: Background transcription worker
- `frontend`: Production Nginx web server on port `3000`

---

## API Reference Overview

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register new user |
| `POST` | `/api/auth/login` | Login and obtain JWT token |
| `GET` | `/api/auth/me` | Current authenticated user profile |
| `POST` | `/api/media/upload` | Upload audio/video file and trigger transcription |
| `POST` | `/api/media/url` | Submit URL (YouTube, Shorts, IG, FB, Direct) |
| `GET` | `/api/media/` | List all user media |
| `GET` | `/api/media/{id}` | Get media details |
| `GET` | `/api/media/{id}/status` | Poll real-time processing status |
| `POST` | `/api/media/{id}/reprocess` | Re-run transcription pipeline |
| `DELETE` | `/api/media/{id}` | Delete media and associated records |
| `GET` | `/api/transcripts/{media_id}` | Get transcript with ordered segments |
| `PATCH` | `/api/transcripts/segments/{segment_id}` | Inline segment text edit (preserves timestamps) |
| `POST` | `/api/bookmarks/{media_id}` | Add timestamped bookmark |
| `GET` | `/api/bookmarks/{media_id}` | List bookmarks |
| `POST` | `/api/notes/{media_id}` | Add session note |
| `POST` | `/api/pins/{media_id}` | Pin media item |
| `POST` | `/api/favourites/{media_id}` | Star media item |
| `GET` | `/api/search/?q=...` | Global search across titles, dialogue, notes, bookmarks |
| `GET` | `/api/export/{media_id}/txt` | Download TXT transcript |
| `GET` | `/api/export/{media_id}/csv` | Download CSV transcript |
| `GET` | `/api/export/{media_id}/srt` | Download SRT subtitle file |
| `GET` | `/api/export/{media_id}/pdf` | Download formatted PDF transcript |
| `GET` | `/api/export/{media_id}/docx` | Download formatted Word document |
| `POST` | `/api/ai/{media_id}/insights` | Generate full AI summary, takeaways, keywords & key moments |

---

## Adding a Custom Transcription Provider

To add another speech-to-text provider (e.g. Whisper, Deepgram, AssemblyAI):
1. Create a class implementing `TranscriptionProvider` in `backend/app/services/transcription/`:
   ```python
   from app.services.transcription.base import TranscriptionProvider, TranscriptionResult

   class WhisperTranscriptionProvider(TranscriptionProvider):
       async def transcribe(self, audio_path: str, language_hint=None, offset_seconds=0.0) -> TranscriptionResult:
           # Implementation
           ...
   ```
2. Register the provider in `TranscriptionProviderFactory`:
   ```python
   TranscriptionProviderFactory.register_provider("whisper", WhisperTranscriptionProvider)
   ```
3. Set `DEFAULT_TRANSCRIPTION_PROVIDER=whisper` in `.env`.
