# Test Infrastructure Specification: ViralCut E2E Test Suite

## Overview
The ViralCut E2E test infrastructure provides an automated, opaque-box, multi-tier testing framework designed to verify architectural restructuring, mobile-first responsive design, and hybrid Python/FastAPI backend scaffolding without requiring third-party testing bloat.

Built on native TypeScript via `tsx` (bundled in devDependencies), the test harness executes 135 isolated test cases across 4 hierarchical tiers in ~200 milliseconds, enforcing 100% adherence to specifications in `ORIGINAL_REQUEST.md` and `PROJECT.md`.

---

## Directory Architecture

```
tests/e2e/
├── harness.ts                     # Core test framework engine, assertion library, and runner metrics
├── runner.ts                      # Executable CLI test runner with filtering and ANSI reports
├── helpers/
│   ├── dom-simulator.ts          # Box-model arithmetic, viewport breakpoints, and overflow calculators
│   ├── contract-validators.ts    # Schema validators for FastAPI endpoints and ProjectContext
│   ├── mock-backend.ts           # Compliant and adversarial test fixtures for all endpoints
│   └── code-auditor.ts           # Filesystem structure, requirements, proxy, and decoupling auditor
├── tier1-features/               # Tier 1: Feature Coverage (>=5 test cases per feature, 60 tests)
│   ├── f1-nav-switcher.test.ts
│   ├── f2-caption-studio.test.ts
│   ├── f3-viral-reel-generator.test.ts
│   ├── f4-unified-format.test.ts
│   ├── f5-state-preservation.test.ts
│   ├── f6-responsive-grids.test.ts
│   ├── f7-player-scaling.test.ts
│   ├── f8-modals-drawers.test.ts
│   ├── f9-backend-scaffold.test.ts
│   ├── f10-fastapi-contracts.test.ts
│   ├── f11-proxy-apiclient.test.ts
│   └── f12-build-decoupling.test.ts
├── tier2-boundary/               # Tier 2: Boundary & Corner Cases (>=5 test cases per feature, 60 tests)
│   ├── f1-boundary.test.ts
│   ├── f2-boundary.test.ts
│   ├── f3-boundary.test.ts
│   ├── f4-boundary.test.ts
│   ├── f5-boundary.test.ts
│   ├── f6-boundary.test.ts
│   ├── f7-boundary.test.ts
│   ├── f8-boundary.test.ts
│   ├── f9-boundary.test.ts
│   ├── f10-boundary.test.ts
│   ├── f11-boundary.test.ts
│   └── f12-boundary.test.ts
├── tier3-combinations/           # Tier 3: Cross-Feature Combinations (10 multi-feature tests)
│   └── cross-feature-matrix.test.ts
└── tier4-scenarios/              # Tier 4: Real-World Application Scenarios (5 realistic workflows)
    └── e2e-scenarios.test.ts
```

---

## 4-Tier Testing Methodology

### Tier 1: Feature Coverage (60 Tests, >=5 per feature)
Covers baseline happy paths and primary behaviors for all 12 inventoried features from `PROJECT.md`:
- **F1: Navigation Shell & Tool Switcher** (5 tests): State machine transitions, props contract, SPA navigation without reload, independent drawer toggle, universal Google auth state.
- **F2: Tool 1: Caption Studio Page** (5 tests): RAW video ingestion metadata, kinetic preset configurations (`hormozi`, `beast`, `clean`, `neon`), timeline cue scrubbing, font/position slider styling, valid SRT subtitle formatting.
- **F3: Tool 2: Viral Reel Generator Page** (5 tests): YouTube/raw transcript inputs, hook psychological variations, multi-concept selection, retention analytics curve calculations, NLE cut-sheet generation.
- **F4: Unified 9:16 Format Standard** (5 tests): Standard 1080x1920 ratio enforcement, platform normalization, vertical short-form request defaults, aspect-[9/16] simulator geometry, cut-sheet format designations.
- **F5: State Preservation Across Tools** (5 tests): Clean initial context state, media persistence when switching to Tool 2, reel persistence when switching to Tool 1, `transferToCaptionStudio` mapping, draft state memory retention.
- **F6: Responsive Layout Grids** (5 tests): 1-column mobile stack (`grid-cols-1`), 12-column tablet layout (`md:grid-cols-12`), 12-column desktop split (`lg:col-span-5` + `lg:col-span-7`), fluid container width calculation eliminating `w-[380px]`, 3-column input controls grid (`sm:grid-cols-3`).
- **F7: Dynamic 9:16 Player Scaling** (5 tests): 375px width containment (<=343px), zero overflow in MobileReelSimulator, viewport height ceiling clamping (`max-h-[75vh]`), proportional subtitle font scaling, header/footer safe zone exclusions.
- **F8: Responsive Drawers & Modals** (5 tests): Viewport height ceiling clamping (`max-h-[90vh]`), responsive container padding (`p-4` vs `p-6`), mobile full-width drawer adaptation (`w-full`), viewport-relative hook list height (`max-h-[60vh]`), modal code block internal horizontal scrolling.
- **F9: Python/FastAPI Backend Directory** (5 tests): `requirements.txt` core packages (`fastapi`, `uvicorn`, `yt-dlp`, `ffmpeg-python`, `google-genai`), modular app layout (`main.py`, `config.py`, `models/`, `routers/`, `services/`), `.gitignore` exclusions, root `.gitignore` Python cache rules, `run.py` uvicorn startup.
- **F10: FastAPI Initial Endpoints & Schemas** (5 tests): GET `/api/health` contract, POST `/api/extract-youtube` contract, POST `/api/transcribe` contract, POST `/api/render-video` contract, missing FFmpeg defensive error handling.
- **F11: Vite Dev Proxy & API Client** (5 tests): `vite.config.ts` `/api` routing, `src/services/apiClient.ts` exported methods, offline backend diagnostics, standard JSON headers, configurable `VITE_API_BASE_URL`.
- **F12: Build & Decoupling Verification** (5 tests): `tsconfig.json` strict React JSX configuration, npm lifecycle scripts (`build`, `dev`, `lint`), `App.tsx` router/shell role, modular directory separation, Vite production build config.

### Tier 2: Boundary & Corner Cases (60 Tests, >=5 per feature)
Adversarial inputs, extreme scales, and fault boundaries:
- **F1**: Rapid alternating tool toggles (10 rapid switches), modal context auto-close, undefined/empty route fallback, ultra-long project name truncation (>100 chars), unauthenticated null user badge.
- **F2**: 0-byte video upload rejection, extreme video duration validation (0.5s short vs 36,000s long), empty subtitle array parsing, whitespace-only subtitle text fallback, font size slider clamping [-50, 500] -> [12, 96].
- **F3**: Malformed/invalid YouTube URLs, YouTube URLs with playlists/timestamps/Shorts/mobile prefixes, empty/whitespace transcript barrier, massive 150,000-character transcript truncation, empty retention points fallback curve.
- **F4**: Ultrawide 21:9 source video letterbox math, square 1:1 and classic 4:3 pillarbox math, 0x0 or negative video dimensions fallback (1080x1920), legacy platform key normalization, non-standard Device Pixel Ratios (DPR 1.0 to 3.5).
- **F5**: Partially typed unsaved transcript preservation, video playback auto-pause on tool switch with currentTime preservation, null state transitions, 100-cycle high-frequency switching stress, corrupted localStorage JSON recovery.
- **F6**: Ultra-narrow 320px viewport zero overflow, exact 768px tablet breakpoint activation, exact 1024px desktop breakpoint activation, 4K 3840px max-w-7xl constraint, landscape mobile (667x375) modal height adjustment.
- **F7**: 375px mobile container width clamp (<=343px), short viewport (<500px) height clamping, 50-word long subtitle chunking/wrapping, vertical position slider clamping [0%, 100%] -> [10%, 85%], timeline scrub clamping [-5s, 9999s] -> [0, duration].
- **F8**: 100-item modal overflow scrolling within max-h-[90vh], >=44px touch target compliance, multi-modal body scroll lock release, outside backdrop click dismissal, 500-char unbroken string break-words handling.
- **F9**: `requirements.txt` unique package validation (no duplicates), Windows (`\`) and POSIX (`/`) path normalization, missing `GEMINI_API_KEY` graceful config fallback, documented `.env.example`, `run.py` keyboard interrupt handling.
- **F10**: Systems without FFmpeg returning `ffmpeg_available=false` with HTTP 200, empty payload `{}` validation rejection, non-audio MIME type rejection, invalid style preset rejection, missing FFmpeg render failure response contract.
- **F11**: Offline backend actionable diagnostic error formatting, HTTP 500 JSON error parsing, non-JSON 502 HTML gateway response handling, `AbortController` timeout abort, dev proxy strict `/api` prefix scoping.
- **F12**: Zero circular module dependencies in `src/types/index.ts`, explicit dependency versions without `*`, decoupling architecture audit, platform selector audit, clean Vite `@` alias resolution.

### Tier 3: Cross-Feature Combinations (10 Tests)
Pairwise and multi-feature contract interactions:
- `TC-T3-001`: [F1 + F5] Tool navigation toggle preserves active transcript and media state without loss.
- `TC-T3-002`: [F2 + F7] Caption Studio loaded video dynamically scales within 375px mobile viewport.
- `TC-T3-003`: [F3 + F5 + F2] Viral Reel segments transfer seamlessly into Caption Studio editor via `transferToCaptionStudio`.
- `TC-T3-004`: [F4 + F7 + F6] Unified 9:16 format maintains fluid dimensions across Mobile (375px), Tablet (768px), and Desktop (1024px).
- `TC-T3-005`: [F1 + F8] Opening Saved Projects Drawer while switching tools keeps drawer context synchronized.
- `TC-T3-006`: [F2 + F10 + F11] Caption Studio audio extraction calls `/api/transcribe` and adheres to schema contract.
- `TC-T3-007`: [F3 + F10 + F11] Viral Reel Generator YouTube extract pipeline adheres to schema contract.
- `TC-T3-008`: [F2 + F4 + F10] Caption Studio kinetic presets pass schema validation to `/api/render-video`.
- `TC-T3-009`: [F6 + F8 + F7] Mobile 375px viewport with open modal traps scroll without player distortion.
- `TC-T3-010`: [F9 + F10 + F11 + F12] Backend scaffolding, Pydantic schemas, and Vite proxy co-exist with clean build.

### Tier 4: Real-World Application Scenarios (5 Tests)
Simulates end-to-end user workflows from start to finish:
- `TC-T4-001`: **Scenario 1: Raw Video Caption & Styling Production Workflow**  
  User loads raw video -> Extracts audio -> Transcribes via mock Gemini -> Selects "beast" kinetic preset -> Adjusts font size (36px) and vertical position (75%) -> Scrubs timeline to 5.0s -> Exports SRT formatted subtitle file.
- `TC-T4-002`: **Scenario 2: YouTube to Viral Reel to Multi-NLE Cut-Sheet Workflow**  
  User enters YouTube URL -> Extracts metadata -> Generates 3 AI reel variations -> Selects Concept 01 (virality score 94) -> Evaluates second-by-second retention curve -> Exports formatted NLE production cut-sheet.
- `TC-T4-003`: **Scenario 3: Viral Reel to Caption Studio Seamless Transfer Workflow**  
  User generates short-form reel in Tool 2 -> Triggers "Auto-Edit RAW Video" -> State seamlessly transfers to Tool 1 (`transferToCaptionStudio`) -> 9:16 preview canvas loads transferred segments.
- `TC-T4-004`: **Scenario 4: Mobile Viewport 375px End-to-End Responsive Journey**  
  User navigates on 375px mobile screen -> Opens Hook Manager Modal -> Enforces 90vh viewport ceiling -> Clamps player to 280px without horizontal overflow -> Responsive grid stacks in 1 column.
- `TC-T4-005`: **Scenario 5: Hybrid Python/FastAPI Backend Graceful Degradation & Recovery**  
  Health check detects missing FFmpeg -> Render job returns structured failure (`status: 'failed'`) -> Frontend activates fallback client-side export -> Environment recovers upon FFmpeg detection.

---

## Execution Instructions

### Run All Tests
```bash
npx tsx tests/e2e/runner.ts
```

### Run by Specific Tier
```bash
# Tier 1: Feature Coverage (60 tests)
npx tsx tests/e2e/runner.ts --tier=1

# Tier 2: Boundary & Corner Cases (60 tests)
npx tsx tests/e2e/runner.ts --tier=2

# Tier 3: Cross-Feature Combinations (10 tests)
npx tsx tests/e2e/runner.ts --tier=3

# Tier 4: Real-World Scenarios (5 tests)
npx tsx tests/e2e/runner.ts --tier=4
```

### Run by Feature ID
```bash
npx tsx tests/e2e/runner.ts --feature=F1
npx tsx tests/e2e/runner.ts --feature=F10
```

### Verbose Mode
```bash
npx tsx tests/e2e/runner.ts --verbose
```

---

## Test Verification Standards
1. **Opaque-Box Independence**: Every test initializes its own state without relying on execution sequence.
2. **Progressive Testability**: Tests verify M1 scaffolding and interface specifications without crashing on pending M2/M3 work.
3. **Zero Facade Assertions**: Every test evaluates real computational logic, mathematical geometry, or schema compliance.
4. **Execution Performance**: Full 135-test execution completes in under 300ms.
