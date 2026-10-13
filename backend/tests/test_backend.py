"""Unit tests for ViralCut FastAPI backend models, services, and endpoints."""

import os
import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.models.health import HealthResponse
from app.models.youtube import YouTubeExtractRequest, YouTubeExtractResponse
from app.models.transcribe import (
    SubtitleWord,
    SubtitleSegment,
    TranscribeRequest,
    TranscribeResponse,
)
from app.models.render import (
    CaptionStylePreset,
    CaptionStyleConfig,
    RenderVideoRequest,
    RenderVideoResponse,
)
from app.services.render_service import (
    find_ffmpeg_binary,
    format_ass_time,
    generate_ass_content,
    get_style_defaults,
    RenderService,
)
from app.services.youtube_service import extract_youtube_video_id, YouTubeService
from app.services.transcribe_service import TranscribeService
from app.main import app


def test_youtube_video_id_extraction():
    """Verify regex extraction of YouTube video IDs from various URL formats."""
    assert extract_youtube_video_id("https://www.youtube.com/watch?v=dQw4w9WgXcQ") == "dQw4w9WgXcQ"
    assert extract_youtube_video_id("https://youtu.be/dQw4w9WgXcQ") == "dQw4w9WgXcQ"
    assert extract_youtube_video_id("https://www.youtube.com/shorts/dQw4w9WgXcQ") == "dQw4w9WgXcQ"
    assert extract_youtube_video_id("dQw4w9WgXcQ") == "dQw4w9WgXcQ"
    assert extract_youtube_video_id("https://invalid-url.com") is None


def test_ass_time_formatting():
    """Verify ASS time formatting H:MM:SS.cs."""
    assert format_ass_time(0.0) == "0:00:00.00"
    assert format_ass_time(1.5) == "0:00:01.50"
    assert format_ass_time(65.25) == "0:01:05.25"
    assert format_ass_time(3661.05) == "1:01:01.05"


def test_style_defaults():
    """Verify style defaults for known presets."""
    font, primary, outline, width, shadow = get_style_defaults("hormozi")
    assert "Montserrat" in font
    assert primary == "&H0000FFFF"

    font_beast, primary_beast, _, _, _ = get_style_defaults("beast")
    assert "Impact" in font_beast

    font_neon, _, _, _, _ = get_style_defaults("neon")
    assert "Arial" in font_neon


def test_generate_ass_content():
    """Verify generation of valid ASS subtitle script."""
    subtitles = [
        SubtitleSegment(
            id="sub-1",
            start=0.5,
            end=2.0,
            text="Stop scrolling right now",
            on_screen_text="STOP 🛑",
        ),
        SubtitleSegment(
            id="sub-2",
            start=2.1,
            end=4.0,
            text="Watch this breakdown",
        ),
    ]
    ass_text = generate_ass_content(subtitles, preset="hormozi")
    assert "[Script Info]" in ass_text
    assert "PlayResX: 1080" in ass_text
    assert "PlayResY: 1920" in ass_text
    assert "[V4+ Styles]" in ass_text
    assert "[Events]" in ass_text
    assert "Dialogue: 0,0:00:00.50,0:00:02.00,Default,,0,0,0,,STOP SCROLLING RIGHT NOW" in ass_text
    assert "Dialogue: 0,0:00:02.10,0:00:04.00,Default,,0,0,0,,WATCH THIS BREAKDOWN" in ass_text


def test_find_ffmpeg_binary_defensive():
    """Verify find_ffmpeg_binary returns string or None without crashing."""
    binary = find_ffmpeg_binary()
    # It should return a string path or None
    assert binary is None or isinstance(binary, str)


def test_transcribe_fallback():
    """Verify TranscribeService returns structured response even when offline."""
    req = TranscribeRequest(
        audio_base64=None,
        language="en",
        video_title="Test Reel",
    )
    res = TranscribeService.transcribe(req)
    assert isinstance(res, TranscribeResponse)
    assert len(res.segments) > 0
    assert res.transcript != ""


def test_render_service_without_subtitles():
    """Verify RenderService validates empty subtitles with informative error."""
    req = RenderVideoRequest(
        video_url=None,
        subtitles=[],
    )
    res = RenderService.render_video(req)
    assert res.status == "failed"
    assert "subtitle" in res.error.lower()


def test_fastapi_routes_registered():
    """Verify all 4 core endpoints are registered in the FastAPI app."""
    openapi_paths = list(app.openapi()["paths"].keys())
    assert "/api/health" in openapi_paths
    assert "/api/extract-youtube" in openapi_paths
    assert "/api/transcribe" in openapi_paths
    assert "/api/render-video" in openapi_paths


if __name__ == "__main__":
    print("Running backend tests...")
    test_youtube_video_id_extraction()
    test_ass_time_formatting()
    test_style_defaults()
    test_generate_ass_content()
    test_find_ffmpeg_binary_defensive()
    test_transcribe_fallback()
    test_render_service_without_subtitles()
    test_fastapi_routes_registered()
    print("All backend tests passed successfully!")
