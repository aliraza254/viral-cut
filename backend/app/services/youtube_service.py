"""YouTube extraction service using yt-dlp."""

import re
import logging
from typing import Optional, Dict, Any
from ..models.youtube import YouTubeExtractRequest, YouTubeExtractResponse

logger = logging.getLogger(__name__)


def extract_youtube_video_id(url: str) -> Optional[str]:
    """Extract 11-character video ID from common YouTube URL formats."""
    patterns = [
        r"(?:v=|\/v\/|embed\/|shorts\/|youtu\.be\/|watch\?v=|\/e\/)([\w-]{11})",
        r"^([\w-]{11})$",
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    return None


class YouTubeService:
    """Service for retrieving YouTube stream URLs and transcripts."""

    @staticmethod
    def extract_info(request: YouTubeExtractRequest) -> YouTubeExtractResponse:
        """Extract metadata, stream URLs, and transcripts using yt-dlp."""
        video_id = extract_youtube_video_id(request.url)
        normalized_url = f"https://www.youtube.com/watch?v={video_id}" if video_id else request.url

        try:
            import yt_dlp
        except ImportError:
            logger.warning("yt-dlp package is not installed; returning placeholder metadata.")
            return YouTubeExtractResponse(
                video_id=video_id or "unknown",
                title=f"YouTube Video ({video_id or 'unknown'})",
                author="Unknown Channel",
                duration=0.0,
                thumbnail_url=f"https://img.youtube.com/vi/{video_id}/maxresdefault.jpg" if video_id else None,
                audio_url=None,
                video_url=None,
                transcript=None,
                has_transcript=False,
                status="partial",
            )

        ydl_opts: Dict[str, Any] = {
            "quiet": True,
            "no_warnings": True,
            "skip_download": True,
            "writesubtitles": True,
            "writeautomaticsub": True,
            "subtitleslangs": ["en", "ur", "en-US"],
        }

        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(normalized_url, download=False)
                if not info:
                    raise ValueError(f"Could not extract info for URL: {request.url}")

                extracted_id = info.get("id") or video_id or "unknown"
                title = info.get("title") or f"YouTube Video ({extracted_id})"
                uploader = info.get("uploader") or info.get("channel") or "Unknown Creator"
                duration = float(info.get("duration") or 0.0)
                thumbnail = info.get("thumbnail") or (
                    f"https://img.youtube.com/vi/{extracted_id}/maxresdefault.jpg" if extracted_id else None
                )

                # Find best audio or video format URL
                audio_url = None
                video_url = None
                formats = info.get("formats", [])
                
                # Search for direct audio streams
                for f in reversed(formats):
                    if f.get("acodec") != "none" and f.get("vcodec") == "none" and f.get("url"):
                        audio_url = f.get("url")
                        break

                # If no audio-only stream found, check combined formats
                for f in reversed(formats):
                    if f.get("url") and f.get("ext") == "mp4":
                        video_url = f.get("url")
                        if not audio_url:
                            audio_url = f.get("url")
                        break

                # Check for captions
                transcript_text = None
                has_transcript = False
                subtitles = info.get("subtitles") or info.get("automatic_captions")
                if subtitles:
                    has_transcript = True

                return YouTubeExtractResponse(
                    video_id=extracted_id,
                    title=title,
                    author=uploader,
                    duration=duration,
                    thumbnail_url=thumbnail,
                    audio_url=audio_url,
                    video_url=video_url,
                    transcript=transcript_text,
                    has_transcript=has_transcript,
                    status="success",
                )
        except Exception as e:
            logger.error(f"Error during yt-dlp extraction: {e}")
            # Fallback response so frontend does not fail completely
            return YouTubeExtractResponse(
                video_id=video_id or "unknown",
                title=f"YouTube Video ({video_id or 'unknown'})",
                author="Unknown Channel",
                duration=0.0,
                thumbnail_url=f"https://img.youtube.com/vi/{video_id}/maxresdefault.jpg" if video_id else None,
                audio_url=None,
                video_url=None,
                transcript=None,
                has_transcript=False,
                status="partial",
            )
