"""CLI and module for robust YouTube metadata, subtitles, and audio extraction using yt-dlp."""

import sys
import json
import base64
import argparse
import urllib.request
import re
import os
import tempfile
from typing import Optional, Dict, Any

def clean_xml_subtitles(xml_text: str) -> str:
    """Parse YouTube timedtext XML into formatted [MM:SS] lines."""
    matches = re.findall(r'<text start="([\d\.]+)"(?: dur="([\d\.]+)")?[^>]*>(.*?)</text>', xml_text, re.DOTALL)
    if not matches:
        return ""
    lines = []
    for start_str, _, text in matches:
        try:
            start = float(start_str)
            mins = int(start // 60)
            secs = int(start % 60)
            timecode = f"[{mins:02d}:{secs:02d}]"
            decoded = (
                text.replace("&amp;", "&")
                .replace("&quot;", '"')
                .replace("&#39;", "'")
                .replace("&lt;", "<")
                .replace("&gt;", ">")
                .replace("\n", " ")
                .strip()
            )
            if len(decoded) > 1:
                lines.append(f"{timecode} {decoded}")
        except Exception:
            continue
    return "\n".join(lines)

def clean_vtt_subtitles(vtt_text: str) -> str:
    """Parse WebVTT subtitle format into [MM:SS] lines."""
    lines = []
    blocks = re.split(r'\n\s*\n', vtt_text)
    for block in blocks:
        block = block.strip()
        # Look for timestamp line 00:00:00.000 --> 00:00:03.000
        time_match = re.search(r'(?:(\d{2}):)?(\d{2}):(\d{2})\.\d{3}\s*-->', block)
        if time_match:
            hours = int(time_match.group(1) or 0)
            mins = int(time_match.group(2)) + (hours * 60)
            secs = int(time_match.group(3))
            timecode = f"[{mins:02d}:{secs:02d}]"
            # Get text lines after timestamp
            text_lines = [l for l in block.split('\n') if '-->' not in l and not l.isdigit()]
            text = " ".join(text_lines).strip()
            # Clean VTT tags like <c> </c>
            text = re.sub(r'<[^>]+>', '', text).strip()
            if text:
                lines.append(f"{timecode} {text}")
    return "\n".join(lines)

def extract(url: str, download_audio_if_no_subtitles: bool = True) -> Dict[str, Any]:
    import yt_dlp

    ydl_opts: Dict[str, Any] = {
        "quiet": True,
        "no_warnings": True,
        "skip_download": True,
        "writesubtitles": True,
        "writeautomaticsub": True,
        "subtitleslangs": ["en", "en-US", "ur", "auto"],
        "extractor_args": {
            "youtube": {
                "player_client": ["android", "ios", "mweb"]
            }
        }
    }

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=False)
        if not info:
            raise ValueError(f"Could not extract info for URL: {url}")

        video_id = info.get("id") or "unknown"
        title = info.get("title") or f"YouTube Video ({video_id})"
        author = info.get("uploader") or info.get("channel") or "Unknown Creator"
        duration = float(info.get("duration") or 0.0)
        thumbnail_url = info.get("thumbnail") or f"https://img.youtube.com/vi/{video_id}/maxresdefault.jpg"

        # Check for subtitles
        subs = info.get("subtitles") or info.get("automatic_captions") or {}
        transcript_text = ""

        # Priority language codes
        lang_keys = ["en", "en-US", "en-GB", "ur", "auto"]
        selected_lang = None
        for k in lang_keys:
            if k in subs:
                selected_lang = k
                break
        if not selected_lang and subs:
            selected_lang = list(subs.keys())[0]

        if selected_lang and subs.get(selected_lang):
            sub_list = subs[selected_lang]
            # Try to fetch subtitle content
            for sub_entry in sub_list:
                sub_url = sub_entry.get("url")
                sub_ext = sub_entry.get("ext", "vtt")
                if not sub_url:
                    continue
                try:
                    req = urllib.request.Request(sub_url, headers={"User-Agent": "Mozilla/5.0"})
                    with urllib.request.urlopen(req, timeout=10) as resp:
                        raw = resp.read().decode("utf-8", errors="ignore")
                        if "xml" in sub_ext or "<text start=" in raw:
                            transcript_text = clean_xml_subtitles(raw)
                        else:
                            transcript_text = clean_vtt_subtitles(raw)
                        if len(transcript_text) > 50:
                            break
                except Exception as e:
                    continue

        audio_path = None
        audio_mime = None

        # If no transcript found and audio download allowed, download lightweight audio
        if not transcript_text and download_audio_if_no_subtitles:
            try:
                temp_dir = tempfile.gettempdir()
                out_tmpl = os.path.join(temp_dir, f"yt_audio_{video_id}.%(ext)s")
                dl_opts = {
                    "quiet": True,
                    "no_warnings": True,
                    "format": "bestaudio/best",
                    "outtmpl": out_tmpl,
                    "extractor_args": {
                        "youtube": {
                            "player_client": ["android", "ios", "mweb"]
                        }
                    }
                }
                with yt_dlp.YoutubeDL(dl_opts) as dl:
                    dl.download([url])
                
                # Find downloaded audio file
                for ext in ["m4a", "mp3", "webm", "opus", "mp4"]:
                    candidate = os.path.join(temp_dir, f"yt_audio_{video_id}.{ext}")
                    if os.path.exists(candidate):
                        audio_path = candidate
                        audio_mime = f"audio/{ext}" if ext != "m4a" else "audio/mp4"
                        break
            except Exception as e:
                sys.stderr.write(f"Audio fallback error: {e}\n")

        return {
            "videoId": video_id,
            "title": title,
            "author": author,
            "duration": duration,
            "thumbnailUrl": thumbnail_url,
            "transcript": transcript_text or None,
            "hasTranscript": bool(transcript_text and len(transcript_text) > 50),
            "audioPath": audio_path,
            "mimeType": audio_mime,
        }

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Extract YouTube metadata, captions, or audio.")
    parser.add_argument("--url", required=True, help="YouTube video URL or ID")
    parser.add_argument("--no-audio-download", action="store_true", help="Skip downloading audio if subtitles are absent")
    args = parser.parse_args()

    try:
        res = extract(args.url, download_audio_if_no_subtitles=not args.no_audio_download)
        print(json.dumps(res))
    except Exception as err:
        print(json.dumps({"error": str(err)}))
        sys.exit(1)
