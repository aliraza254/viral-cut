"""Video rendering and subtitle burning models."""

from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field
from .transcribe import SubtitleSegment


class CaptionStylePreset(str, Enum):
    """Supported kinetic caption visual presets."""

    HORMOZI = "hormozi"
    BEAST = "beast"
    CLEAN = "clean"
    NEON = "neon"


class CaptionStyleConfig(BaseModel):
    """Detailed visual styling configuration for ASS/burned subtitles."""

    preset: CaptionStylePreset = Field(
        default=CaptionStylePreset.HORMOZI,
        description="Base styling preset ('hormozi', 'beast', 'clean', 'neon')",
    )
    font_family: str = Field(default="Montserrat", description="Subtitle typeface name")
    font_size: int = Field(default=32, description="Point size for subtitle text")
    primary_color: str = Field(
        default="&H0000FFFF",
        description="ASS BGR hex color (default yellow &H0000FFFF)",
    )
    secondary_color: str = Field(
        default="&H00FFFFFF",
        description="ASS BGR hex color for karaoke or highlight",
    )
    outline_color: str = Field(
        default="&H00000000",
        description="ASS BGR hex color for text border/stroke",
    )
    outline_width: int = Field(default=3, description="Outline stroke thickness in pixels")
    shadow_depth: int = Field(default=2, description="Drop shadow depth in pixels")
    all_caps: bool = Field(default=True, description="Transform subtitle text to uppercase")
    position: str = Field(
        default="bottom",
        description="Vertical alignment ('bottom', 'center', 'top')",
    )
    margin_v: int = Field(default=120, description="Vertical margin in pixels from edge")


class RenderVideoRequest(BaseModel):
    """Request payload to burn synchronized subtitles and render short-form video."""

    video_url: Optional[str] = Field(
        default=None,
        description="Source video URL or local file path to process",
    )
    video_base64: Optional[str] = Field(
        default=None,
        description="Optional base64-encoded source video data",
    )
    subtitles: List[SubtitleSegment] = Field(
        default_factory=list,
        description="Synchronized subtitle segments to burn",
    )
    style_preset: Optional[str] = Field(
        default="hormozi",
        description="Shortcut preset name ('hormozi', 'beast', 'clean', 'neon')",
    )
    style: Optional[CaptionStyleConfig] = Field(
        default=None,
        description="Fine-grained styling overrides",
    )
    output_format: Optional[str] = Field(
        default="mp4",
        description="Target video container format ('mp4' or 'webm')",
    )
    aspect_ratio: Optional[str] = Field(
        default="9:16",
        description="Target aspect ratio ('9:16' standard short-form or '16:9')",
    )


class RenderVideoResponse(BaseModel):
    """Response payload for video render jobs."""

    task_id: str = Field(..., description="Unique job execution identifier")
    status: str = Field(
        default="completed",
        description="Job completion status ('completed', 'pending', 'failed')",
    )
    output_url: Optional[str] = Field(
        default=None,
        description="URL or accessible path to the rendered video file",
    )
    output_filename: Optional[str] = Field(
        default=None,
        description="Name of the generated video output file",
    )
    duration_sec: Optional[float] = Field(
        default=None,
        description="Duration of the rendered output in seconds",
    )
    render_log: Optional[str] = Field(
        default=None,
        description="Execution log summary or FFmpeg output details",
    )
    error: Optional[str] = Field(
        default=None,
        description="Descriptive failure reason if processing did not succeed",
    )
