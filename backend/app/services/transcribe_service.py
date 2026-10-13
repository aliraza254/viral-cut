"""Audio transcription service using google-genai."""

import os
import json
import logging
from typing import Optional, List
from ..config import settings
from ..models.transcribe import (
    TranscribeRequest,
    TranscribeResponse,
    SubtitleSegment,
    SubtitleWord,
)

logger = logging.getLogger(__name__)


class TranscribeService:
    """Service for transcribing spoken audio into synchronized subtitle lines."""

    @staticmethod
    def transcribe(request: TranscribeRequest) -> TranscribeResponse:
        """Transcribe speech using Gemini Multimodal or provide graceful fallback."""
        api_key = settings.gemini_api_key or os.environ.get("GEMINI_API_KEY")

        if not api_key:
            logger.warning("GEMINI_API_KEY not configured; returning mock transcription.")
            return TranscribeService._create_mock_transcription(request)

        try:
            from google import genai
            from google.genai import types

            client = genai.Client(api_key=api_key)
            is_roman_urdu = request.language == "roman-urdu"

            prompt = f"""You are an expert audio transcriber and viral video subtitle synchronizer for short-form video (9:16 vertical shorts, reels, TikTok).
Your task is to transcribe the speech from this audio recording with precise timestamps and generate high-impact subtitle segments.

LANGUAGE INSTRUCTIONS:
{"- Conversational ROMAN URDU or Urdu/English mix." if is_roman_urdu else "- Transcribe in the spoken language (primarily English)."}

SUBTITLE REQUIREMENTS:
1. Break down the speech into punchy, chronological subtitle lines (approx 1 to 4 seconds each).
2. For each subtitle segment, provide:
   - id: string e.g. "sub-1"
   - start: number (start seconds)
   - end: number (end seconds)
   - timecode: formatted string e.g. "00:00 - 00:03"
   - text: verbatim words spoken.
   - on_screen_text: short sticker/headline (2-4 words)
   - visual_cue: camera cut / b-roll hint
   - sound_effect: sound effect trigger hint (e.g. "Whoosh")
   - words: array of word-level objects: [{{"word": "string", "start": number, "end": number}}]
3. Also provide:
   - full_transcript: complete verbatim text
   - detected_language: e.g. "English" or "Roman Urdu"
   - duration_sec: total estimated duration
   - summary: 1-2 sentence concise summary
   - suggested_title: engaging viral title

Return ONLY a valid JSON object matching this structure."""

            contents = []
            if request.audio_base64:
                import base64
                raw_bytes = base64.b64decode(request.audio_base64)
                contents.append(
                    types.Part.from_bytes(
                        data=raw_bytes,
                        mime_type=request.mime_type or "audio/wav",
                    )
                )

            contents.append(prompt)

            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=contents,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                ),
            )

            result_data = json.loads(response.text)
            subtitles_raw = result_data.get("subtitles") or result_data.get("segments") or []
            segments: List[SubtitleSegment] = []

            for idx, item in enumerate(subtitles_raw):
                words_raw = item.get("words") or []
                words_list = [
                    SubtitleWord(
                        word=w.get("word", ""),
                        start=float(w.get("start", w.get("startSec", 0))),
                        end=float(w.get("end", w.get("endSec", 0))),
                    )
                    for w in words_raw
                ]
                segments.append(
                    SubtitleSegment(
                        id=item.get("id") or f"sub-{idx + 1}",
                        start=float(item.get("start", item.get("startSec", 0))),
                        end=float(item.get("end", item.get("endSec", 0))),
                        text=item.get("text", ""),
                        timecode=item.get("timecode"),
                        words=words_list if words_list else None,
                        on_screen_text=item.get("on_screen_text") or item.get("onScreenText"),
                        visual_cue=item.get("visual_cue") or item.get("visualCue"),
                        sound_effect=item.get("sound_effect") or item.get("soundEffect"),
                    )
                )

            return TranscribeResponse(
                transcript=result_data.get("full_transcript") or result_data.get("fullTranscript") or "",
                language=result_data.get("detected_language") or result_data.get("detectedLanguage") or "English",
                segments=segments,
                duration_sec=float(result_data.get("duration_sec") or result_data.get("durationSec") or 0),
                summary=result_data.get("summary"),
                suggested_title=result_data.get("suggested_title") or result_data.get("suggestedTitle"),
                engine="google-genai",
            )

        except Exception as e:
            logger.error(f"Error in Gemini transcription: {e}")
            return TranscribeService._create_mock_transcription(request)

    @staticmethod
    def _create_mock_transcription(request: TranscribeRequest) -> TranscribeResponse:
        """Fallback mock transcription when Gemini is unreachable or key is missing."""
        mock_segments = [
            SubtitleSegment(
                id="sub-1",
                start=0.0,
                end=2.5,
                timecode="00:00 - 00:02",
                text="Stop scrolling if you want to grow your audience.",
                on_screen_text="STOP SCROLLING ⚠️",
                visual_cue="Fast punch-in zoom",
                sound_effect="Sub bass boom",
                words=[
                    SubtitleWord(word="Stop", start=0.0, end=0.4),
                    SubtitleWord(word="scrolling", start=0.4, end=0.9),
                    SubtitleWord(word="if", start=0.9, end=1.1),
                    SubtitleWord(word="you", start=1.1, end=1.3),
                    SubtitleWord(word="want", start=1.3, end=1.6),
                    SubtitleWord(word="to", start=1.6, end=1.8),
                    SubtitleWord(word="grow", start=1.8, end=2.1),
                    SubtitleWord(word="audience", start=2.1, end=2.5),
                ],
            ),
            SubtitleSegment(
                id="sub-2",
                start=2.5,
                end=5.0,
                timecode="00:02 - 00:05",
                text="Here is the exact 3-step hook formula that works.",
                on_screen_text="3-STEP FORMULA 🚀",
                visual_cue="Highlight card on screen",
                sound_effect="Camera click",
                words=[
                    SubtitleWord(word="Here", start=2.5, end=2.8),
                    SubtitleWord(word="is", start=2.8, end=3.0),
                    SubtitleWord(word="the", start=3.0, end=3.2),
                    SubtitleWord(word="exact", start=3.2, end=3.6),
                    SubtitleWord(word="formula", start=3.6, end=4.2),
                    SubtitleWord(word="works", start=4.2, end=5.0),
                ],
            ),
        ]
        return TranscribeResponse(
            transcript="Stop scrolling if you want to grow your audience. Here is the exact 3-step hook formula that works.",
            language=request.language or "en",
            segments=mock_segments,
            duration_sec=5.0,
            summary="Demonstration of viral short-form caption synchronization.",
            suggested_title=request.video_title or "3-Step Viral Growth Formula",
            engine="fallback-simulation",
        )
