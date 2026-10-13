"""Empirical Challenger Test Suite for Milestone 1 Render Pipeline & ASS Presets."""

import os
import sys
import shutil
import subprocess
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.models.render import (
    CaptionStylePreset,
    CaptionStyleConfig,
    RenderVideoRequest,
    RenderVideoResponse,
)
from app.models.transcribe import SubtitleSegment
from app.services.render_service import (
    find_ffmpeg_binary,
    format_ass_time,
    generate_ass_content,
    get_style_defaults,
    RenderService,
)
from app.config import settings

def test_all_presets_and_casing():
    """Verify ASS content generation for all 4 presets with mixed casing."""
    presets = ["hormozi", "Hormozi", "HORMOZI", "beast", "Beast", "BEAST", "clean", "Clean", "neon", "NEON", "unknown_preset"]
    sub = [SubtitleSegment(id="1", start=1.0, end=3.0, text="Test Preset")]
    for p in presets:
        ass = generate_ass_content(sub, preset=p)
        assert "[Script Info]" in ass, f"Missing Script Info for preset {p}"
        assert "[V4+ Styles]" in ass, f"Missing V4+ Styles for preset {p}"
        assert "Style: Default," in ass, f"Missing Default style for preset {p}"
        assert "Dialogue: 0,0:00:01.00,0:00:03.00,Default,,0,0,0,,TEST PRESET" in ass

    # Verify preset-specific fonts and colors
    hormozi_ass = generate_ass_content(sub, preset="hormozi")
    assert "Montserrat" in hormozi_ass
    assert "&H0000FFFF" in hormozi_ass

    beast_ass = generate_ass_content(sub, preset="beast")
    assert "Impact" in beast_ass
    assert "&H00FFFFFF" in beast_ass

    clean_ass = generate_ass_content(sub, preset="clean")
    assert "Inter" in clean_ass

    neon_ass = generate_ass_content(sub, preset="neon")
    assert "Arial Black" in neon_ass
    assert "&H00FFFF00" in neon_ass
    print("[PASS] test_all_presets_and_casing")


def test_custom_style_config():
    """Verify custom style configurations override defaults properly."""
    sub = [SubtitleSegment(id="1", start=0.0, end=2.5, text="lowercase text with all_caps false")]
    config = CaptionStyleConfig(
        font_family="Roboto",
        font_size=40,
        primary_color="&H00FF0000",
        outline_color="&H00FFFFFF",
        outline_width=6,
        shadow_depth=4,
        all_caps=False,
        margin_v=200,
    )
    ass = generate_ass_content(sub, style=config, preset="clean")
    assert "Roboto" in ass
    assert "&H00FF0000" in ass
    assert "200,1" in ass  # margin_v
    # all_caps is False, text should remain lowercase
    assert "Dialogue: 0,0:00:00.00,0:00:02.50,Default,,0,0,0,,lowercase text with all_caps false" in ass
    print("[PASS] test_custom_style_config")


def test_multiline_and_special_characters():
    """Verify multiline substitution and handling of special characters."""
    subs = [
        SubtitleSegment(id="1", start=0.0, end=2.0, text="First Line\nSecond Line\nThird Line"),
        SubtitleSegment(id="2", start=2.0, end=4.0, text="CRLF\r\nLine Two"),
        SubtitleSegment(id="3", start=4.0, end=6.0, text='Quotes: "Single" and \'Double\' and commas, here, and $100 & 50%'),
        SubtitleSegment(id="4", start=6.0, end=8.0, text="Unicode & Emojis: Urdu یہ ویڈیو ہے 🔥 🚀 🛑"),
        SubtitleSegment(id="5", start=8.0, end=10.0, text="Braces {test} and \\backslash"),
    ]
    ass = generate_ass_content(subs, preset="hormozi")
    # Multiline \n should be replaced with \N
    assert "FIRST LINE\\NSECOND LINE\\NTHIRD LINE" in ass
    # Commas within text must be present
    assert "COMMAS, HERE," in ass
    assert "URDU یہ ویڈیو ہے 🔥 🚀 🛑" in ass
    print("[PASS] test_multiline_and_special_characters")


def test_real_ffmpeg_rendering_synthetic_canvas():
    """Empirically invoke RenderService to render 9:16 video on synthetic canvas."""
    ffmpeg_bin = find_ffmpeg_binary()
    assert ffmpeg_bin is not None, "FFmpeg binary must be found"
    print(f"Testing with FFmpeg: {ffmpeg_bin}")

    subs = [
        SubtitleSegment(id="1", start=0.2, end=1.5, text="VIRAL HOOK 💥\nStop Scrolling!"),
        SubtitleSegment(id="2", start=1.6, end=3.0, text="This is 1080x1920 short-form video."),
    ]
    req = RenderVideoRequest(
        video_url=None,
        subtitles=subs,
        style_preset="neon",
        output_format="mp4",
        aspect_ratio="9:16",
    )
    resp = RenderService.render_video(req)
    assert resp.status == "completed", f"Render failed: {resp.error}"
    assert resp.output_filename is not None
    assert resp.output_url.startswith("/renders/")
    
    # Check rendered file on disk
    rendered_file = Path(settings.render_dir) / resp.output_filename
    assert rendered_file.exists(), f"Rendered file does not exist at {rendered_file}"
    file_size = rendered_file.stat().st_size
    assert file_size > 10000, f"Rendered video size is too small: {file_size} bytes"
    print(f"Rendered video created successfully: {rendered_file} ({file_size} bytes)")

    # Probe resolution with ffmpeg
    probe_cmd = [
        ffmpeg_bin,
        "-i", str(rendered_file),
    ]
    proc = subprocess.run(probe_cmd, capture_output=True, text=True)
    combined_output = proc.stdout + proc.stderr
    assert "1080x1920" in combined_output, f"Expected 1080x1920 resolution in output: {combined_output}"
    print(f"[PASS] test_real_ffmpeg_rendering_synthetic_canvas (verified 1080x1920)")


def test_real_ffmpeg_rendering_with_source_video():
    """Empirically create a small dummy input video and burn subtitles onto it."""
    ffmpeg_bin = find_ffmpeg_binary()
    temp_dir = Path(settings.temp_dir)
    temp_dir.mkdir(parents=True, exist_ok=True)
    dummy_source = temp_dir / "challenger_dummy_input.mp4"

    # Generate a 2-second 1080x1920 source video
    create_cmd = [
        ffmpeg_bin,
        "-y",
        "-f", "lavfi",
        "-i", "color=c=0x1E3A8A:s=1080x1920:d=2:r=30",
        "-f", "lavfi",
        "-i", "anullsrc=r=44100:cl=stereo",
        "-t", "2",
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-shortest",
        str(dummy_source.resolve()),
    ]
    proc = subprocess.run(create_cmd, capture_output=True, text=True)
    assert proc.returncode == 0, f"Failed to create dummy source video: {proc.stderr}"
    assert dummy_source.exists()

    # Burn subtitles onto dummy source
    subs = [
        SubtitleSegment(id="1", start=0.1, end=1.8, text="Burned onto physical video source!"),
    ]
    req = RenderVideoRequest(
        video_url=str(dummy_source.resolve()),
        subtitles=subs,
        style_preset="beast",
        output_format="mp4",
    )
    resp = RenderService.render_video(req)
    assert resp.status == "completed", f"Render failed on source video: {resp.error}"
    rendered_file = Path(settings.render_dir) / resp.output_filename
    assert rendered_file.exists()
    assert rendered_file.stat().st_size > 10000
    print(f"[PASS] test_real_ffmpeg_rendering_with_source_video ({rendered_file.stat().st_size} bytes)")


def test_all_four_presets_render_execution():
    """Verify all 4 presets can be rendered without FFmpeg errors."""
    for preset_name in ["hormozi", "beast", "clean", "neon"]:
        subs = [SubtitleSegment(id="1", start=0.0, end=1.0, text=f"Testing {preset_name.upper()} preset")]
        req = RenderVideoRequest(
            video_url=None,
            subtitles=subs,
            style_preset=preset_name,
            output_format="mp4",
        )
        resp = RenderService.render_video(req)
        assert resp.status == "completed", f"Render failed for preset {preset_name}: {resp.error}"
        f = Path(settings.render_dir) / resp.output_filename
        assert f.exists()
        print(f"Preset '{preset_name}' rendered successfully -> {resp.output_filename}")
    print("[PASS] test_all_four_presets_render_execution")


def test_special_characters_render_execution():
    """Stress test FFmpeg ASS filter with special characters, emojis, and multiline."""
    subs = [
        SubtitleSegment(id="1", start=0.0, end=1.5, text="Quotes: 'Hello' & \"World\"\nCommas, & $100, 50%"),
        SubtitleSegment(id="2", start=1.6, end=3.0, text="Urdu: یہ ایک ٹیسٹ ہے 🔥 🚀"),
    ]
    req = RenderVideoRequest(
        video_url=None,
        subtitles=subs,
        style_preset="hormozi",
        output_format="mp4",
    )
    resp = RenderService.render_video(req)
    assert resp.status == "completed", f"Special characters render failed: {resp.error}"
    f = Path(settings.render_dir) / resp.output_filename
    assert f.exists()
    print(f"[PASS] test_special_characters_render_execution -> {resp.output_filename}")


def test_edge_cases():
    """Verify edge cases: missing subtitles, invalid preset, zero duration."""
    # 1. Empty subtitles
    req_empty = RenderVideoRequest(video_url=None, subtitles=[])
    resp_empty = RenderService.render_video(req_empty)
    assert resp_empty.status == "failed"
    assert "no subtitle" in resp_empty.error.lower()

    # 2. Non-existent source video falls back to synthetic canvas
    subs = [SubtitleSegment(id="1", start=0.0, end=1.0, text="Fallback test")]
    req_missing_source = RenderVideoRequest(video_url="C:/non_existent_folder/missing.mp4", subtitles=subs)
    resp_missing = RenderService.render_video(req_missing_source)
    assert resp_missing.status == "completed", f"Expected fallback to synthetic canvas, got {resp_missing.error}"
    
    # 3. Subtitle with start == end
    subs_zero = [SubtitleSegment(id="1", start=1.0, end=1.0, text="Zero duration")]
    req_zero = RenderVideoRequest(video_url=None, subtitles=subs_zero)
    resp_zero = RenderService.render_video(req_zero)
    assert resp_zero.status == "completed"
    print("[PASS] test_edge_cases")


if __name__ == "__main__":
    print("=== STARTING CHALLENGER RENDER & ASS TEST SUITE ===")
    test_all_presets_and_casing()
    test_custom_style_config()
    test_multiline_and_special_characters()
    test_real_ffmpeg_rendering_synthetic_canvas()
    test_real_ffmpeg_rendering_with_source_video()
    test_all_four_presets_render_execution()
    test_special_characters_render_execution()
    test_edge_cases()
    print("=== ALL CHALLENGER RENDER TESTS PASSED EMPIRICALLY! ===")
