"""Health check endpoint router."""

import sys
from fastapi import APIRouter
from ..models.health import HealthResponse
from ..services.render_service import find_ffmpeg_binary
from ..config import settings

router = APIRouter(prefix="/health", tags=["Health"])


@router.get("", response_model=HealthResponse)
def get_health() -> HealthResponse:
    """Return health status, python runtime details, and FFmpeg binary availability."""
    ffmpeg_bin = find_ffmpeg_binary()
    return HealthResponse(
        status="ok",
        service="viralcut-backend",
        version=settings.app_version,
        python_version=sys.version.split()[0],
        ffmpeg_available=bool(ffmpeg_bin),
        ffmpeg_path=ffmpeg_bin,
    )
