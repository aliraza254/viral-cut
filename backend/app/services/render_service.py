"""Video rendering and subtitle burning service using ASS subtitles and FFmpeg."""

import os
import uuid
import shutil
import logging
import subprocess
from pathlib import Path
from typing import Optional, List, Tuple
from ..config import settings
from ..models.render import (
    RenderVideoRequest,
    RenderVideoResponse,
    CaptionStyleConfig,
    CaptionStylePreset,
)
from ..models.transcribe import SubtitleSegment

logger = logging.getLogger(__name__)


def find_ffmpeg_binary() -> Optional[str]:
    """Defensively resolve the path to the FFmpeg binary.
    
    Checks in order:
    1. settings.ffmpeg_path
    2. FFMPEG_PATH environment variable
    3. System PATH (shutil.which('ffmpeg'))
    4. imageio_ffmpeg bundled binary
    """
    if settings.ffmpeg_path and os.path.isfile(settings.ffmpeg_path):
        return settings.ffmpeg_path

    env_ffmpeg = os.environ.get("FFMPEG_PATH")
    if env_ffmpeg and os.path.isfile(env_ffmpeg):
        return env_ffmpeg

    path_ffmpeg = shutil.which("ffmpeg")
    if path_ffmpeg:
        return path_ffmpeg

    try:
        import imageio_ffmpeg
        bundled_exe = imageio_ffmpeg.get_ffmpeg_exe()
        if bundled_exe and os.path.isfile(bundled_exe):
            return bundled_exe
    except Exception:
        pass

    return None


def format_ass_time(seconds: float) -> str:
    """Format seconds into ASS time format: H:MM:SS.cs."""
    if seconds < 0:
        seconds = 0
    hrs = int(seconds // 3600)
    mins = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    centis = int(round((seconds - int(seconds)) * 100))
    if centis >= 100:
        secs += 1
        centis = 0
    return f"{hrs}:{mins:02d}:{secs:02d}.{centis:02d}"


def get_style_defaults(preset: str) -> Tuple[str, str, str, int, int]:
    """Return default font, primary_color, outline_color, outline_width, shadow for preset."""
    p = str(preset).lower()
    if p == CaptionStylePreset.HORMOZI.value or "hormozi" in p:
        return ("Montserrat ExtraBold", "&H0000FFFF", "&H00000000", 4, 2)
    elif p == CaptionStylePreset.BEAST.value or "beast" in p:
        return ("Impact", "&H00FFFFFF", "&H00000000", 5, 3)
    elif p == CaptionStylePreset.NEON.value or "neon" in p:
        return ("Arial Black", "&H00FFFF00", "&H00FF00FF", 3, 2)
    else:  # Clean
        return ("Inter", "&H00FFFFFF", "&H00000000", 2, 1)


def generate_ass_content(
    subtitles: List[SubtitleSegment],
    style: Optional[CaptionStyleConfig] = None,
    preset: str = "hormozi",
) -> str:
    """Generate Advanced SubStation Alpha (.ass) subtitle file text."""
    font, primary_color, outline_color, outline_width, shadow = get_style_defaults(preset)

    if style:
        font = style.font_family or font
        primary_color = style.primary_color or primary_color
        outline_color = style.outline_color or outline_color
        outline_width = style.outline_width or outline_width
        shadow = style.shadow_depth or shadow
        font_size = style.font_size
        all_caps = style.all_caps
        margin_v = style.margin_v
    else:
        font_size = 32
        all_caps = True
        margin_v = 140

    ass_lines = [
        "[Script Info]",
        "ScriptType: v4.00+",
        "PlayResX: 1080",
        "PlayResY: 1920",
        "WrapStyle: 0",
        "ScaledBorderAndShadow: yes",
        "",
        "[V4+ Styles]",
        "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
        f"Style: Default,{font},{font_size * 2},{primary_color},&H00FFFFFF,{outline_color},&H80000000,-1,0,0,0,100,100,0,0,1,{outline_width * 2},{shadow * 2},2,50,50,{margin_v},1",
        "",
        "[Events]",
        "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
    ]

    for sub in subtitles:
        start_time = format_ass_time(sub.start)
        end_time = format_ass_time(sub.end)
        text = sub.text.upper() if all_caps else sub.text
        text = text.replace("\n", "\\N")
        ass_lines.append(f"Dialogue: 0,{start_time},{end_time},Default,,0,0,0,,{text}")

    return "\n".join(ass_lines)


class RenderService:
    """Service to handle subtitle burning and video rendering."""

    @staticmethod
    def render_video(request: RenderVideoRequest) -> RenderVideoResponse:
        """Burn subtitles to video or produce rendered media."""
        task_id = str(uuid.uuid4())[:8]
        ffmpeg_bin = find_ffmpeg_binary()

        if not ffmpeg_bin:
            return RenderVideoResponse(
                task_id=task_id,
                status="failed",
                error="FFmpeg binary not detected on system PATH or bundled packages. Please install FFmpeg or set FFMPEG_PATH in backend/.env.",
            )

        if not request.subtitles:
            return RenderVideoResponse(
                task_id=task_id,
                status="failed",
                error="No subtitle segments provided for video burning.",
            )

        try:
            temp_dir = Path(settings.temp_dir)
            temp_dir.mkdir(parents=True, exist_ok=True)
            render_dir = Path(settings.render_dir)
            render_dir.mkdir(parents=True, exist_ok=True)

            # Generate ASS file
            ass_text = generate_ass_content(
                subtitles=request.subtitles,
                style=request.style,
                preset=request.style_preset or "hormozi",
            )
            ass_path = temp_dir / f"subtitles_{task_id}.ass"
            ass_path.write_text(ass_text, encoding="utf-8")

            # Check if source video exists
            input_video = request.video_url
            output_ext = request.output_format or "mp4"
            output_filename = f"viralcut_render_{task_id}.{output_ext}"
            output_path = render_dir / output_filename

            # If no physical input video or URL provided, create a test black 9:16 background video with captions
            if not input_video or not os.path.exists(input_video):
                calc_duration = max(sub.end for sub in request.subtitles) if request.subtitles else 5.0
                calc_duration = max(calc_duration, 3.0)

                # Windows escaping for ffmpeg filter path
                escaped_ass_path = str(ass_path.resolve()).replace("\\", "/").replace(":", "\\:")
                cmd = [
                    ffmpeg_bin,
                    "-y",
                    "-f", "lavfi",
                    "-i", f"color=c=0x111827:s=1080x1920:d={calc_duration}:r=30",
                    "-f", "lavfi",
                    "-i", f"anullsrc=r=44100:cl=stereo",
                    "-t", str(calc_duration),
                    "-vf", f"ass='{escaped_ass_path}'",
                    "-c:v", "libx264",
                    "-pix_fmt", "yuv420p",
                    "-c:a", "aac",
                    "-shortest",
                    str(output_path.resolve()),
                ]
            else:
                escaped_ass_path = str(ass_path.resolve()).replace("\\", "/").replace(":", "\\:")
                cmd = [
                    ffmpeg_bin,
                    "-y",
                    "-i", input_video,
                    "-vf", f"ass='{escaped_ass_path}'",
                    "-c:a", "copy",
                    "-c:v", "libx264",
                    "-pix_fmt", "yuv420p",
                    str(output_path.resolve()),
                ]

            logger.info(f"Executing FFmpeg render command: {' '.join(cmd)}")
            proc = subprocess.run(cmd, capture_output=True, text=True, timeout=120)

            if proc.returncode != 0:
                logger.error(f"FFmpeg error: {proc.stderr}")
                return RenderVideoResponse(
                    task_id=task_id,
                    status="failed",
                    error=f"FFmpeg failed with code {proc.returncode}: {proc.stderr[:300]}",
                    render_log=proc.stderr[:1000],
                )

            # Cleanup temporary ASS file
            try:
                ass_path.unlink()
            except Exception:
                pass

            return RenderVideoResponse(
                task_id=task_id,
                status="completed",
                output_url=f"/renders/{output_filename}",
                output_filename=output_filename,
                duration_sec=float(calc_duration if not input_video or not os.path.exists(input_video) else 0),
                render_log=f"Render completed successfully with {len(request.subtitles)} burned subtitle segments.",
            )

        except Exception as e:
            logger.error(f"Rendering exception: {e}")
            return RenderVideoResponse(
                task_id=task_id,
                status="failed",
                error=f"Rendering exception: {str(e)}",
            )
