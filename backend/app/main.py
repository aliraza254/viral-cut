"""Main FastAPI application entrypoint for ViralCut backend."""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from .config import settings
from .routers import (
    health_router,
    youtube_router,
    transcribe_router,
    render_router,
)
from .services.render_service import find_ffmpeg_binary

# Configure logging
logging.basicConfig(
    level=logging.INFO if settings.debug else logging.WARNING,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("viralcut.backend")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown lifecycle management."""
    ffmpeg_path = find_ffmpeg_binary()
    logger.info("=== ViralCut Backend Engine starting ===")
    logger.info(f"Version: {settings.app_version}")
    logger.info(f"Host: {settings.host}:{settings.port}")
    if ffmpeg_path:
        logger.info(f"FFmpeg binary detected: {ffmpeg_path}")
    else:
        logger.warning(
            "FFmpeg binary NOT detected on system PATH. Subtitle burning will be disabled "
            "until FFmpeg is installed or FFMPEG_PATH is configured."
        )
    yield
    logger.info("ViralCut Backend Engine shutting down.")


app = FastAPI(
    title="ViralCut AI Video Engine",
    description="High-velocity Python backend for YouTube stream extraction, transcription, and FFmpeg ASS caption burning.",
    version=settings.app_version,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static file directories for generated media
render_dir = Path(settings.render_dir)
render_dir.mkdir(parents=True, exist_ok=True)
app.mount("/renders", StaticFiles(directory=str(render_dir)), name="renders")

# Register API Routers under /api
app.include_router(health_router, prefix="/api")
app.include_router(youtube_router, prefix="/api")
app.include_router(transcribe_router, prefix="/api")
app.include_router(render_router, prefix="/api")


@app.get("/")
def read_root():
    """Root health and discovery endpoint."""
    return {
        "service": "ViralCut AI Video Engine",
        "version": settings.app_version,
        "docs": "/docs",
        "health": "/api/health",
        "status": "online",
    }
