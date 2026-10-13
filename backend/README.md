# ViralCut Python AI Video Backend

High-velocity media processing engine powered by **FastAPI**, **yt-dlp**, **google-genai**, and **FFmpeg ASS Subtitle Burning**.

---

## 1. Overview

The ViralCut Python backend handles media-intensive operations that complement the frontend React application:
1. **YouTube Stream Extraction (`/api/extract-youtube`)**: Extracts reliable stream formats, metadata, and auto-captions via `yt-dlp`.
2. **Audio Transcription (`/api/transcribe`)**: Converts speech into synchronized timestamped subtitle lines and word timings using `google-genai` (Gemini Multimodal).
3. **Video Rendering (`/api/render-video`)**: Generates styled Advanced SubStation Alpha (`.ass`) caption files and burns them into vertical 9:16 MP4 short-form video via FFmpeg.
4. **Health & Diagnostics (`/api/health`)**: Reports service version, runtime environment, and FFmpeg binary status.

---

## 2. Directory Layout

```
backend/
├── app/
│   ├── __init__.py           # Package marker
│   ├── main.py               # FastAPI application factory & middleware
│   ├── config.py             # Settings and environment variable loader
│   ├── models/               # Pydantic schema contracts
│   │   ├── health.py         # Healthcheck models
│   │   ├── youtube.py        # YouTube extraction models
│   │   ├── transcribe.py     # Subtitle and transcription models
│   │   └── render.py         # Video rendering and ASS style models
│   ├── routers/              # API endpoints
│   │   ├── health.py         # GET /api/health
│   │   ├── youtube.py        # POST /api/extract-youtube
│   │   ├── transcribe.py     # POST /api/transcribe
│   │   └── render.py         # POST /api/render-video
│   └── services/             # Media business logic
│       ├── youtube_service.py    # yt-dlp metadata & audio stream resolver
│       ├── transcribe_service.py # Gemini speech transcription
│       └── render_service.py     # ASS subtitle generator & FFmpeg executor
├── requirements.txt          # Python package requirements
├── run.py                    # Server startup script
├── .env.example              # Environment variable template
└── .gitignore                # Python artifacts and media ignores
```

---

## 3. Quickstart

### Prerequisites
- Python 3.10+ (Tested on Python 3.14)
- Pip

### Setup Virtual Environment & Install Dependencies

```bash
# From the project root or backend folder:
cd backend
python -m venv .venv

# Activate virtual environment (Windows PowerShell)
.venv\Scripts\Activate.ps1

# Activate virtual environment (macOS/Linux)
# source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Populate optional configuration:
- `GEMINI_API_KEY`: Required for cloud Gemini speech transcription.
- `FFMPEG_PATH`: Explicit path to FFmpeg binary if not in system PATH.

### Run Server

```bash
python run.py
```
Or from the project root:
```bash
npm run backend:dev
```

The backend server starts on `http://127.0.0.1:8000`.
- Interactive Swagger UI: `http://127.0.0.1:8000/docs`
- ReDoc UI: `http://127.0.0.1:8000/redoc`

---

## 4. Subtitle Styling Presets

The backend supports 4 kinetic short-form styling presets:

| Preset | Font | Primary Color | Outline | Best For |
|---|---|---|---|---|
| `hormozi` | Montserrat ExtraBold | Yellow (`&H0000FFFF`) | Heavy Black 4px | High retention hook videos |
| `beast` | Impact | Bold White (`&H00FFFFFF`) | High-contrast Black 5px | Fast-paced entertainment |
| `clean` | Inter | Minimal White (`&H00FFFFFF`) | Subtle Black 2px | Tech, corporate, aesthetic |
| `neon` | Arial Black | Electric Cyan (`&H00FFFF00`) | Neon Magenta (`&H00FF00FF`) | Nightlife, gaming, cyber |

---

## 5. Defensive FFmpeg Integration

The backend automatically locates an FFmpeg binary in the following priority order:
1. `FFMPEG_PATH` configured in `.env`
2. System `PATH` (`shutil.which('ffmpeg')`)
3. Pre-bundled wheel binaries (`imageio-ffmpeg`)

If FFmpeg is not found, the service responds with a clear diagnostic message (`status: "failed"` with setup instructions) rather than an unhandled 500 server crash.
