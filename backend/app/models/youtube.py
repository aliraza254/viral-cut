"""YouTube stream and transcript extraction models."""

from typing import Optional
from pydantic import BaseModel, Field


class YouTubeExtractRequest(BaseModel):
    """Request payload for extracting YouTube metadata and streams."""

    url: str = Field(..., description="YouTube video URL or 11-character video ID")
    preferred_quality: Optional[str] = Field(
        default="bestaudio/best",
        description="Preferred stream quality or format specifier",
    )
    extract_audio: bool = Field(
        default=True,
        description="Whether to extract/resolve direct audio stream URL",
    )
    max_duration_seconds: Optional[int] = Field(
        default=900,
        description="Maximum allowed duration in seconds (default 15 minutes)",
    )


class YouTubeExtractResponse(BaseModel):
    """Response payload containing video metadata and media stream URLs."""

    video_id: str = Field(..., description="11-character YouTube video ID")
    title: str = Field(..., description="Video title")
    author: Optional[str] = Field(default="Unknown Creator", description="Channel or uploader name")
    duration: float = Field(default=0.0, description="Video duration in seconds")
    thumbnail_url: Optional[str] = Field(None, description="Primary thumbnail image URL")
    audio_url: Optional[str] = Field(None, description="Direct audio stream or downloaded file URL")
    video_url: Optional[str] = Field(None, description="Direct video stream URL if requested")
    transcript: Optional[str] = Field(None, description="Extracted video transcript text if available")
    has_transcript: bool = Field(default=False, description="Whether subtitles/transcript was extracted")
    status: str = Field(default="success", description="Extraction status ('success' or 'partial')")
