"""Audio transcription and synchronized subtitle models."""

from typing import List, Optional
from pydantic import BaseModel, Field


class SubtitleWord(BaseModel):
    """Word-level timing information."""

    word: str = Field(..., description="Individual word token")
    start: float = Field(..., description="Start offset in seconds")
    end: float = Field(..., description="End offset in seconds")


class SubtitleSegment(BaseModel):
    """Synchronized subtitle sentence or phrase segment."""

    id: Optional[str] = Field(default=None, description="Unique segment identifier")
    start: float = Field(..., description="Segment start offset in seconds")
    end: float = Field(..., description="Segment end offset in seconds")
    text: str = Field(..., description="Subtitle text")
    timecode: Optional[str] = Field(default=None, description="Formatted timecode string (e.g. 00:01 - 00:03)")
    words: Optional[List[SubtitleWord]] = Field(default=None, description="Word-level timings")
    on_screen_text: Optional[str] = Field(default=None, description="Highlight text or kinetic emphasis")
    visual_cue: Optional[str] = Field(default=None, description="Visual description or b-roll hint")
    sound_effect: Optional[str] = Field(default=None, description="Sound effect trigger hint (e.g. [whoosh])")


class TranscribeRequest(BaseModel):
    """Payload for audio transcription."""

    audio_url: Optional[str] = Field(default=None, description="URL of audio file to transcribe")
    audio_base64: Optional[str] = Field(default=None, description="Base64 encoded audio string")
    mime_type: Optional[str] = Field(default="audio/wav", description="Audio MIME type")
    language: Optional[str] = Field(default="auto", description="Target language ('auto', 'en', 'roman-urdu')")
    video_title: Optional[str] = Field(default="Uploaded Video", description="Contextual video title")


class TranscribeResponse(BaseModel):
    """Response containing transcript and synchronized subtitle segments."""

    transcript: str = Field(..., description="Full spoken transcript text")
    language: str = Field(default="auto", description="Detected or requested language")
    segments: List[SubtitleSegment] = Field(default_factory=list, description="Synchronized subtitle segments")
    duration_sec: Optional[float] = Field(default=None, description="Total audio duration in seconds")
    summary: Optional[str] = Field(default=None, description="Short AI summary of spoken content")
    suggested_title: Optional[str] = Field(default=None, description="Generated viral reel title")
    engine: str = Field(default="google-genai", description="Transcription engine used")
