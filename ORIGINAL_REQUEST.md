# Original User Request

## 2026-10-12T17:27:34Z

Restructure the ViralCut application from a cluttered single-page layout into two dedicated, fully responsive tool pages (Tool 1: Video Auto-Caption & Styling Studio, and Tool 2: Viral Reels & Shorts Generator), removing redundant platform selectors and scaffolding the hybrid Python backend architecture for seamless next-phase integration.

Working directory: d:\My Company\Tools\viral-cut
Integrity mode: development

## Requirements

### R1. Two Dedicated Tool Sub-Pages & Clean Navigation
Deconstruct the 900+ line monolithic App.tsx into clean, modular sub-pages and components:
- Navigation Shell: A top navbar with clear branding, project switcher, and one-click switching between:
  - Tool 1: Caption Studio: Dedicated page for uploading video, viewing and styling synchronized captions, previewing playback, and exporting.
  - Tool 2: Viral Reel Generator: Dedicated page for YouTube links, raw transcripts/notes, hook variation generation, retention curves, and NLE cut-sheet exports.
- Unified Short-Form Format: Remove redundant TikTok, Reels, and Shorts radio buttons; standardize on a unified 9:16 Vertical Short-Form format with optimal mobile viewing dimensions.

### R2. Mobile-First Responsive Design
Refactor all editor layouts, sidebars, and modals to be fully responsive:
- Eliminate fixed desktop widths (such as hardcoded w-[380px] or desktop-only max-width constraints).
- Use flexible container queries/responsive grids (grid grid-cols-1 lg:grid-cols-12 or flex flex-col lg:flex-row) so that the video player, caption list, and control panels stack intuitively on mobile and tablet screens.
- Keep drawer and modal views usable and legible across mobile viewports.

### R3. Scaffold Hybrid Python/FastAPI Architecture
Establish the foundation for the Python backend engine:
- Scaffold a clean, modular Python FastAPI service under backend/ with a virtual environment specification (requirements.txt with fastapi, uvicorn, yt-dlp, ffmpeg-python, google-genai).
- Define the initial API endpoints and schema contracts for:
  - /api/health
  - /api/extract-youtube (prepared for yt-dlp stream extraction)
  - /api/transcribe (prepared for audio transcription)
  - /api/render-video (prepared for FFmpeg ASS caption burning)
- Configure the Vite dev proxy or API client helper to support seamless communication with the backend.

## Acceptance Criteria

### Navigation & UX
- [ ] Users can smoothly switch between Caption Studio and Viral Reel Generator without page reloads, state corruption, or UI overlap.
- [ ] The redundant platform selection (TikTok vs Reels vs Shorts) is removed from the user interface.
- [ ] Active project state is properly preserved when switching between tools.

### Responsiveness
- [ ] Both tool pages render cleanly on mobile (375px+), tablet (768px+), and desktop (1024px+) viewports without horizontal scrollbars or clipped UI buttons.
- [ ] The mobile reel preview and video player resize dynamically to fit smaller screens.

### Code Quality & Build
- [ ] npm run build completes successfully with 0 errors.
- [ ] The codebase is cleanly decoupled: App.tsx acts as the root router/shell rather than holding all component state and markup.
- [ ] The Python backend/ directory is scaffolded with clear documentation and schemas ready for Phase 2 implementation.
