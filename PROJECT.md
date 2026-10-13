# Project: ViralCut Architecture Restructuring & Python Backend Scaffolding

## Architecture
ViralCut is a high-velocity AI video creation platform being transformed from a single-page monolith into a decoupled, responsive two-tool suite backed by a hybrid Node.js/Python architecture:

- **Frontend Navigation Shell & Routing**:
  - `src/App.tsx`: Lightweight root shell managing navigation and global error boundaries.
  - `src/components/NavigationShell.tsx` (or `Header.tsx`): Brand header, project switcher, Google auth, and one-click segmented toggle between Tool 1 and Tool 2.
  - `src/context/ProjectContext.tsx`: Persistent state store holding active video/transcript, reels, editing segments, style settings, and draft caching across tool switches.

- **Tool 1: Caption Studio (`src/pages/CaptionStudio.tsx`)**:
  - Dedicated workflow for RAW video upload, sample video picker, audio extraction, Gemini transcription, kinetic caption styling (presets: Hormozi, MrBeast, Clean, Cyber Neon), position/size sliders, 9:16 player canvas, multi-scene timeline scrubber, and WebM / subtitle export.

- **Tool 2: Viral Reel Generator (`src/pages/ViralReelGenerator.tsx`)**:
  - Dedicated workflow for YouTube links, raw transcripts/notes, AI streaming script generation, concept variations (01/02/03), 0-3s hook spotlight, scene cut editing (`SegmentEditor`), retention graph, 9:16 mobile simulator, and NLE cut-sheet / TTS export.

- **Unified Short-Form Format**:
  - Eliminated redundant platform selector (TikTok vs Reels vs Shorts).
  - Standardized on unified 9:16 Vertical Short-Form format (1080x1920) across all previews, generators, and exports.

- **Hybrid Python/FastAPI Backend Engine (`backend/`)**:
  - Dedicated Python service with FastAPI, Pydantic schemas, and modular routers:
    - `/api/health`: Healthcheck and environment status (FFmpeg / Gemini).
    - `/api/extract-youtube`: YouTube audio/video stream extractor via `yt-dlp`.
    - `/api/transcribe`: Audio transcription service via `google-genai`.
    - `/api/render-video`: ASS subtitle burning and 9:16 video rendering via `ffmpeg-python` (with defensive runtime checks).
  - Vite dev proxy configured in `vite.config.ts` to seamlessly route backend calls to `http://127.0.0.1:8000`.
  - Centralized typed API client in `src/services/apiClient.ts`.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| F1 | Navigation Shell & Tool Switcher | Top navbar with ViralCut branding, project switcher, and one-click switching between Caption Studio and Viral Reel Generator | M2 | ORIGINAL_REQUEST §R1 |
| F2 | Tool 1: Caption Studio Page | Dedicated page for video upload, caption styling, playback preview, and export | M2 | ORIGINAL_REQUEST §R1 |
| F3 | Tool 2: Viral Reel Generator Page | Dedicated page for YouTube links, raw transcripts/notes, hook variations, retention curves, and NLE cut-sheets | M2 | ORIGINAL_REQUEST §R1 |
| F4 | Unified 9:16 Format Standard | Removal of redundant TikTok/Reels/Shorts radio buttons; standardizing on unified 9:16 vertical short-form format | M2 | ORIGINAL_REQUEST §R1 |
| F5 | State Preservation Across Tools | Active project state preserved seamlessly when switching between tools via ProjectContext | M2 | ORIGINAL_REQUEST §R1 |
| F6 | Responsive Layout Grids | Elimination of desktop-only constraints and replacing with responsive grids (grid-cols-1 md:grid-cols-12 lg:grid-cols-12) | M3 | ORIGINAL_REQUEST §R2 |
| F7 | Dynamic 9:16 Player Scaling | Dynamic sizing of video player and MobileReelSimulator to prevent horizontal scrollbars on 375px+ viewports | M3 | ORIGINAL_REQUEST §R2 |
| F8 | Responsive Drawers & Modals | Viewport-bounded containers (max-h-[90vh] flex flex-col) and responsive padding for mobile viewports | M3 | ORIGINAL_REQUEST §R2 |
| F9 | Python/FastAPI Backend Directory | Scaffold backend/ with requirements.txt (fastapi, uvicorn, yt-dlp, ffmpeg-python, google-genai) and modular app layout | M1 | ORIGINAL_REQUEST §R3 |
| F10 | FastAPI Initial Endpoints & Schemas | Endpoints /api/health, /api/extract-youtube, /api/transcribe, /api/render-video with Pydantic contracts | M1 | ORIGINAL_REQUEST §R3 |
| F11 | Vite Dev Proxy & API Client | Vite dev proxy configuration and frontend apiClient.ts helper | M1 | ORIGINAL_REQUEST §R3 |
| F12 | Build & Codebase Decoupling Verification | npm run build passes with 0 errors; App.tsx decoupled into root shell | M4 | ORIGINAL_REQUEST Acceptance Criteria |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Python Backend Scaffolding & Proxy | backend/ app, requirements.txt, endpoints, Pydantic schemas, Vite proxy, apiClient.ts | none | DONE |
| M2 | Frontend Decomposition & Tool Pages | App.tsx deconstruction, CaptionStudio.tsx, ViralReelGenerator.tsx, NavigationShell, platform selector removal, ProjectContext | M1 | DONE |
| M3 | Mobile-First Responsive Design | Eliminate fixed widths, responsive player scaling, tablet breakpoints, modal/drawer responsiveness | M2 | DONE |
| M4 | Build Verification & E2E Acceptance | npm run build 0 errors, comprehensive test suite pass, forensic integrity audit | M3 | DONE |

## Interface Contracts

### Frontend ↔ Backend (FastAPI Endpoints)
- `GET /api/health`
  - Response: `{ status: "ok", version: "1.0.0", ffmpeg_available: boolean, python_version: string }`
- `POST /api/extract-youtube`
  - Request: `{ url: string, preferred_quality?: string }`
  - Response: `{ video_id: string, title: string, duration: number, audio_url: string, video_url?: string }`
- `POST /api/transcribe`
  - Request: Multipart audio file OR `{ audio_url?: string, language?: string }`
  - Response: `{ transcript: string, language: string, segments: Array<{ start: number, end: number, text: string }> }`
- `POST /api/render-video`
  - Request: `{ video_url: string, subtitles: Array<{ start: number, end: number, text: string }>, style_preset: "hormozi" | "beast" | "clean" | "neon", output_format?: "mp4" | "webm" }`
  - Response: `{ task_id: string, status: "pending" | "completed" | "failed", output_url?: string, error?: string }`

### Frontend Internal (ProjectContext ↔ Pages)
- `ProjectContext`:
  - `activeTool`: `'caption-studio' | 'viral-generator'`
  - `setActiveTool`: `(tool: 'caption-studio' | 'viral-generator') => void`
  - `activeProject`: `ProjectData | null`
  - `currentReels`: `ReelScript[]`
  - `uploadedMedia`: `{ videoUrl?: string, fileName?: string, subtitles?: SubtitleItem[] }`
  - `transferToCaptionStudio`: `(videoUrl: string, segments: Segment[]) => void`

## Code Layout
```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py
│   ├── config.py
│   ├── models/
│   │   ├── __init__.py
│   │   ├── health.py
│   │   ├── youtube.py
│   │   ├── transcribe.py
│   │   └── render.py
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── health.py
│   │   ├── youtube.py
│   │   ├── transcribe.py
│   │   └── render.py
│   └── services/
│       ├── __init__.py
│       ├── youtube_service.py
│       ├── transcribe_service.py
│       └── render_service.py
├── requirements.txt
├── run.py
├── README.md
└── .gitignore

src/
├── context/
│   └── ProjectContext.tsx
├── pages/
│   ├── CaptionStudio.tsx
│   └── ViralReelGenerator.tsx
├── components/
│   ├── NavigationShell.tsx
│   ├── Header.tsx
│   ├── VideoInputSection.tsx
│   ├── AIVideoEditor.tsx
│   ├── MobileReelSimulator.tsx
│   └── ...
├── services/
│   └── apiClient.ts
├── App.tsx
└── ...
```
