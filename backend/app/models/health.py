"""Health check schema models."""

from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    """System health check and diagnostic status response."""

    status: str = Field(default="ok", description="Service status ('ok' or 'degraded')")
    service: str = Field(default="viralcut-backend", description="Service identifier")
    version: str = Field(default="1.0.0", description="Backend semantic version")
    timestamp: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="Current server UTC timestamp",
    )
    python_version: str = Field(..., description="Running Python runtime version")
    ffmpeg_available: bool = Field(..., description="Whether FFmpeg binary was detected")
    ffmpeg_path: Optional[str] = Field(None, description="Resolved path to FFmpeg binary if available")
