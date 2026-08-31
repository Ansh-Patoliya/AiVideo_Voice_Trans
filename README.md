# 🎙️ AI Video & Voice Transcriber

An intelligent web application that converts **Video and Audio into accurate, timestamped Text** in real-time. Built with **FastAPI**, **React + TypeScript**, and **Google Gemini AI**.

---

## ✨ Key Features

- **Multi-Source Input:** Upload local files (MP4, MP3, WAV, MOV) or paste URLs (YouTube, Shorts, Reels).
- **Accurate Timestamps:** Generates millisecond-accurate start and end times for every spoken phrase.
- **Interactive Studio:**
  - 🔄 **Real-Time Sync:** Transcript highlights automatically as video plays.
  - ⏩ **Click-to-Seek:** Click any text line to jump the video to that exact second.
  - ✏️ **Inline Editing:** Edit transcript text directly on screen.
- **AI Insights:** Automatically generates an Executive Summary and Key Bullet Points from the video.
- **Multi-Format Export:** Download your transcripts as **SRT Subtitles**, **PDF Report**, **Word (DOCX)**, **CSV**, or **TXT**.

---

## 🏗️ How It Works (4 Simple Steps)

```
1. Upload Video / URL  ➔  2. FFmpeg extracts 16kHz Audio
                                     ⬇
4. Interactive Studio  ⬅  3. Gemini AI generates Text + Timestamps
```

1. **Upload:** User uploads a video or provides a YouTube link.
2. **Audio Extraction:** `FFmpeg` strips video frames and optimizes audio to a clean 16kHz mono format.
3. **AI Speech Recognition:** Google Gemini AI analyzes sound waves and returns timestamped dialogue segments.
4. **Interactive Display:** React frontend syncs playback time with transcript lines in real time.

---

## 🛠️ Tech Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS
- **Backend:** Python 3.10+, FastAPI, SQLAlchemy
- **AI Engine:** Google Gemini API (Multimodal Speech-to-Text)
- **Media Engine:** FFmpeg & yt-dlp
- **Database:** SQLite (Local) / PostgreSQL (Production)

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- Python 3.10 or higher
- Node.js (v18+) & npm
- Gemini API Key ([Get it free here](https://aistudio.google.com/))

---

### 2. Backend Setup

```bash
# 1. Go to backend directory
cd backend

# 2. Create virtual environment & activate it
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Mac/Linux:
source venv/bin/activate

# 3. Install required packages
pip install -r requirements.txt

# 4. Set up environment file
# Create a .env file and add your key:
# GEMINI_API_KEY=your_actual_api_key_here

# 5. Start Backend Server
uvicorn app.main:app --reload --port 8000
```
> 📍 Backend will run at: `http://localhost:8000`  
> 📍 Interactive API Docs (Swagger): `http://localhost:8000/api/docs`

---

### 3. Frontend Setup

```bash
# 1. Open a new terminal and go to frontend directory
cd frontend

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev
```
> 📍 Frontend will run at: `http://localhost:5173`

---

## 📂 Project Structure

```text
├── backend/
│   ├── app/
│   │   ├── api/             # REST API Routes (auth, media, transcripts)
│   │   ├── core/            # Config & Security
│   │   ├── models/          # Database Tables (SQLAlchemy)
│   │   ├── services/
│   │   │   ├── media/       # FFmpeg audio extractor & downloader
│   │   │   └── transcription/# Gemini Speech-to-Text logic
│   │   └── main.py          # FastAPI entry point
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── components/      # Video player, Transcript list, Editor
│   │   ├── services/        # API client
│   │   └── App.tsx          # Main React Application
│   └── package.json
│
└── README.md
```

---

## 📄 License
This project is open-source and built for educational and internal studio transcription purposes.
