"""CLI script for local Python Whisper transcription.
Supports faster-whisper or standard whisper if installed locally,
with structured JSON output matching the ViralCut subtitle schema.
"""

import sys
import os
import json
import argparse
import tempfile
from typing import Dict, Any, List

def format_timecode(seconds: float) -> str:
    mins = int(seconds // 60)
    secs = int(seconds % 60)
    return f"{mins:02d}:{secs:02d}"

def transcribe_local(audio_path: str, model_size: str = "base") -> Dict[str, Any]:
    # 1. Try faster-whisper first (fastest CTranslate2 engine)
    try:
        from faster_whisper import WhisperModel
        # Use CPU with int8 quantization for lightweight fast local execution
        model = WhisperModel(model_size, device="cpu", compute_type="int8")
        segments_gen, info = model.transcribe(audio_path, beam_size=5, word_timestamps=True)
        
        subtitles: List[Dict[str, Any]] = []
        full_transcript_parts: List[str] = []
        
        seg_idx = 1
        for seg in segments_gen:
            words = []
            if hasattr(seg, 'words') and seg.words:
                for w in seg.words:
                    words.append({
                        "word": w.word.strip(),
                        "startSec": round(w.start, 2),
                        "endSec": round(w.end, 2)
                    })
            
            clean_text = seg.text.strip()
            if not clean_text:
                continue
                
            timecode = f"{format_timecode(seg.start)} - {format_timecode(seg.end)}"
            subtitles.append({
                "id": f"sub-{seg_idx}",
                "startSec": round(seg.start, 2),
                "endSec": round(seg.end, 2),
                "timecode": timecode,
                "text": clean_text,
                "onScreenText": " ".join(clean_text.split()[:3]).upper(),
                "visualCue": "Cut to speaker" if seg_idx % 2 == 1 else "Wide shot cut",
                "soundEffect": "Whoosh" if seg_idx == 1 else "-",
                "words": words
            })
            full_transcript_parts.append(clean_text)
            seg_idx += 1
            
        return {
            "engine": "local_faster_whisper",
            "detectedLanguage": info.language if hasattr(info, 'language') else "English",
            "durationSec": round(info.duration, 2) if hasattr(info, 'duration') else 0,
            "fullTranscript": "\n".join(full_transcript_parts),
            "subtitles": subtitles,
            "summary": "Transcribed locally via faster-whisper",
            "suggestedTitle": "Local Audio Recording"
        }
    except ImportError:
        pass
        
    # 2. Try standard openai whisper
    try:
        import whisper
        model = whisper.load_model(model_size, device="cpu")
        result = model.transcribe(audio_path, word_timestamps=True)
        
        subtitles = []
        full_transcript_parts = []
        seg_idx = 1
        
        for seg in result.get("segments", []):
            clean_text = seg.get("text", "").strip()
            if not clean_text:
                continue
                
            start = float(seg.get("start", 0))
            end = float(seg.get("end", 0))
            timecode = f"{format_timecode(start)} - {format_timecode(end)}"
            
            words = []
            for w in seg.get("words", []):
                words.append({
                    "word": w.get("word", "").strip(),
                    "startSec": round(float(w.get("start", 0)), 2),
                    "endSec": round(float(w.get("end", 0)), 2)
                })
                
            subtitles.append({
                "id": f"sub-{seg_idx}",
                "startSec": round(start, 2),
                "endSec": round(end, 2),
                "timecode": timecode,
                "text": clean_text,
                "onScreenText": " ".join(clean_text.split()[:3]).upper(),
                "visualCue": "Cut to speaker" if seg_idx % 2 == 1 else "Wide shot cut",
                "soundEffect": "Whoosh" if seg_idx == 1 else "-",
                "words": words
            })
            full_transcript_parts.append(clean_text)
            seg_idx += 1
            
        return {
            "engine": "local_whisper",
            "detectedLanguage": result.get("language", "English"),
            "durationSec": round(subtitles[-1]["endSec"] if subtitles else 0, 2),
            "fullTranscript": "\n".join(full_transcript_parts),
            "subtitles": subtitles,
            "summary": "Transcribed locally via OpenAI Whisper",
            "suggestedTitle": "Local Audio Recording"
        }
    except ImportError:
        pass

    raise RuntimeError("Neither 'faster_whisper' nor 'whisper' is installed in the local Python environment.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Transcribe audio file locally using Whisper.")
    parser.add_argument("--audio", required=True, help="Path to WAV/MP3/M4A/MP4 audio or video file")
    parser.add_argument("--model", default="base", help="Model size: tiny, base, small (default: base)")
    args = parser.parse_args()

    if not os.path.exists(args.audio):
        print(json.dumps({"error": f"Audio file not found: {args.audio}"}))
        sys.exit(1)

    try:
        data = transcribe_local(args.audio, model_size=args.model)
        print(json.dumps(data))
    except Exception as err:
        print(json.dumps({"error": str(err), "fallback_required": True}))
        sys.exit(2)
