"""Adversarial stress test harness for ViralCut backend API endpoints.

Empirically tests edge cases, malformed payloads, invalid parameters,
boundary conditions, and potential 500 error triggers.
"""

import os
import sys
import json
import io
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

results = []

def run_test(name, fn):
    try:
        fn()
        results.append({"name": name, "status": "PASS", "details": "Verified successfully"})
        print(f"  [PASS] {name}")
    except AssertionError as e:
        results.append({"name": name, "status": "FAIL", "details": str(e)})
        print(f"  [FAIL] {name}: {e}")
    except Exception as e:
        results.append({"name": name, "status": "ERROR", "details": f"Unhandled exception: {e}"})
        print(f"  [ERROR] {name}: {e}")

# =========================================================================
# SUITE 1: Health & Root Discovery Endpoints
# =========================================================================
print("\n--- Suite 1: Health & Root Discovery Endpoints ---")

def test_health_success():
    resp = client.get("/api/health")
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
    data = resp.json()
    assert data.get("status") == "ok", f"Status not ok: {data}"
    assert "version" in data
    assert "ffmpeg_available" in data
    assert "python_version" in data

def test_health_with_unexpected_query_params():
    resp = client.get("/api/health?foo=bar&inject=<script>&number=-999")
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
    assert resp.json().get("status") == "ok"

def test_health_invalid_method_post():
    resp = client.post("/api/health", json={"test": True})
    assert resp.status_code == 405, f"Expected 405 Method Not Allowed, got {resp.status_code}"

def test_root_discovery():
    resp = client.get("/")
    assert resp.status_code == 200
    assert resp.json().get("status") == "online"

def test_not_found_route():
    resp = client.get("/api/nonexistent-endpoint-xyz")
    assert resp.status_code == 404, f"Expected 404, got {resp.status_code}"

run_test("GET /api/health standard contract", test_health_success)
run_test("GET /api/health with extraneous query params", test_health_with_unexpected_query_params)
run_test("POST /api/health method not allowed (405)", test_health_invalid_method_post)
run_test("GET / root discovery", test_root_discovery)
run_test("GET /api/nonexistent-endpoint-xyz returns 404", test_not_found_route)

# =========================================================================
# SUITE 2: YouTube Extraction Endpoint (/api/extract-youtube)
# =========================================================================
print("\n--- Suite 2: YouTube Extraction Endpoint ---")

def test_yt_missing_body():
    resp = client.post("/api/extract-youtube", json={})
    assert resp.status_code == 422, f"Expected 422 for missing required 'url', got {resp.status_code}"

def test_yt_empty_url():
    resp = client.post("/api/extract-youtube", json={"url": ""})
    assert resp.status_code == 400, f"Expected 400 for empty url, got {resp.status_code}"
    assert "empty" in resp.json().get("detail", "").lower()

def test_yt_whitespace_url():
    resp = client.post("/api/extract-youtube", json={"url": "    \t \n  "})
    assert resp.status_code == 400, f"Expected 400 for whitespace url, got {resp.status_code}"

def test_yt_wrong_datatype_url():
    resp = client.post("/api/extract-youtube", json={"url": 12345})
    assert resp.status_code == 422, f"Expected 422 for numeric url, got {resp.status_code}"

def test_yt_array_url():
    resp = client.post("/api/extract-youtube", json={"url": ["https://youtube.com"]})
    assert resp.status_code == 422, f"Expected 422 for list url, got {resp.status_code}"

def test_yt_direct_video_id():
    resp = client.post("/api/extract-youtube", json={"url": "dQw4w9WgXcQ"})
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
    data = resp.json()
    assert data.get("video_id") == "dQw4w9WgXcQ"
    assert "title" in data
    assert "status" in data

def test_yt_non_youtube_url():
    # Defensive behavior: Should not crash with 500, should return partial or 200 fallback
    resp = client.post("/api/extract-youtube", json={"url": "https://example.com/not-a-video"})
    assert resp.status_code in [200, 400, 422], f"Unexpected status {resp.status_code}: {resp.text}"
    if resp.status_code == 200:
        data = resp.json()
        assert data.get("status") in ["partial", "success"]

def test_yt_injection_attempt():
    url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ; rm -rf / ; cat /etc/passwd"
    resp = client.post("/api/extract-youtube", json={"url": url})
    assert resp.status_code in [200, 400, 422], f"Status code {resp.status_code}"
    assert resp.status_code != 500, f"Server crashed with 500: {resp.text}"

def test_yt_extremely_large_url():
    large_url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ&extra=" + ("A" * 50000)
    resp = client.post("/api/extract-youtube", json={"url": large_url})
    assert resp.status_code != 500, f"Server crashed with 500 on large URL: {resp.text}"

def test_yt_invalid_max_duration_type():
    resp = client.post("/api/extract-youtube", json={"url": "dQw4w9WgXcQ", "max_duration_seconds": "invalid"})
    assert resp.status_code == 422, f"Expected 422, got {resp.status_code}"

def test_yt_method_get_not_allowed():
    resp = client.get("/api/extract-youtube")
    assert resp.status_code == 405, f"Expected 405, got {resp.status_code}"

run_test("POST /api/extract-youtube missing body (422)", test_yt_missing_body)
run_test("POST /api/extract-youtube empty url (400)", test_yt_empty_url)
run_test("POST /api/extract-youtube whitespace url (400)", test_yt_whitespace_url)
run_test("POST /api/extract-youtube non-string datatype (422)", test_yt_wrong_datatype_url)
run_test("POST /api/extract-youtube array datatype (422)", test_yt_array_url)
run_test("POST /api/extract-youtube direct 11-char video ID", test_yt_direct_video_id)
run_test("POST /api/extract-youtube non-YouTube URL fallback", test_yt_non_youtube_url)
run_test("POST /api/extract-youtube command injection resilience", test_yt_injection_attempt)
run_test("POST /api/extract-youtube extremely large URL payload", test_yt_extremely_large_url)
run_test("POST /api/extract-youtube invalid max_duration_seconds type (422)", test_yt_invalid_max_duration_type)
run_test("GET /api/extract-youtube method not allowed (405)", test_yt_method_get_not_allowed)

# =========================================================================
# SUITE 3: Transcription Endpoints (/api/transcribe & /api/transcribe-video)
# =========================================================================
print("\n--- Suite 3: Transcription Endpoints ---")

def test_transcribe_missing_sources():
    resp = client.post("/api/transcribe", json={})
    assert resp.status_code == 400, f"Expected 400, got {resp.status_code}"
    assert "audio_base64 or audio_url" in resp.json().get("detail", "")

def test_transcribe_empty_strings():
    resp = client.post("/api/transcribe", json={"audio_url": "", "audio_base64": ""})
    assert resp.status_code == 400, f"Expected 400, got {resp.status_code}"

def test_transcribe_valid_audio_url():
    resp = client.post("/api/transcribe", json={
        "audio_url": "https://example.com/sample_podcast.mp3",
        "language": "en",
        "video_title": "How to Build Startups"
    })
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    data = resp.json()
    assert "transcript" in data
    assert "segments" in data
    assert len(data["segments"]) > 0
    assert data["segments"][0]["start"] >= 0

def test_transcribe_invalid_base64_string():
    # Defensive check: non-base64 garbage string should not produce unhandled 500
    resp = client.post("/api/transcribe", json={
        "audio_base64": "!!!NOT_VALID_BASE64_CORRUPTED_STREAM$$$",
        "mime_type": "audio/wav"
    })
    assert resp.status_code != 500, f"Server crashed with 500: {resp.text}"
    assert resp.status_code in [200, 400]

def test_transcribe_roman_urdu():
    resp = client.post("/api/transcribe", json={
        "audio_url": "https://example.com/urdu_clip.mp3",
        "language": "roman-urdu",
        "video_title": "Urdu Growth Hack"
    })
    assert resp.status_code == 200
    data = resp.json()
    assert len(data.get("segments", [])) > 0

def test_transcribe_alias_endpoint():
    resp = client.post("/api/transcribe-video", json={
        "audio_url": "https://example.com/alias_test.mp3"
    })
    assert resp.status_code == 200
    assert "transcript" in resp.json()

def test_transcribe_upload_no_file():
    resp = client.post("/api/transcribe/upload")
    assert resp.status_code == 422, f"Expected 422 for missing file, got {resp.status_code}"

def test_transcribe_upload_valid_mock_file():
    fake_audio = io.BytesIO(b"RIFF\x24\x00\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00\x44\xac\x00\x00")
    files = {"file": ("test_recording.wav", fake_audio, "audio/wav")}
    data = {"language": "en", "video_title": "Uploaded Audio Test"}
    resp = client.post("/api/transcribe/upload", files=files, data=data)
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    body = resp.json()
    assert len(body.get("segments", [])) > 0

run_test("POST /api/transcribe missing audio sources (400)", test_transcribe_missing_sources)
run_test("POST /api/transcribe empty strings (400)", test_transcribe_empty_strings)
run_test("POST /api/transcribe valid audio_url", test_transcribe_valid_audio_url)
run_test("POST /api/transcribe invalid base64 resilience", test_transcribe_invalid_base64_string)
run_test("POST /api/transcribe language=roman-urdu", test_transcribe_roman_urdu)
run_test("POST /api/transcribe-video backward compatibility alias", test_transcribe_alias_endpoint)
run_test("POST /api/transcribe/upload missing file (422)", test_transcribe_upload_no_file)
run_test("POST /api/transcribe/upload multipart audio upload", test_transcribe_upload_valid_mock_file)

# =========================================================================
# SUITE 4: Video Rendering Endpoint (/api/render-video)
# =========================================================================
print("\n--- Suite 4: Video Rendering Endpoint ---")

def test_render_missing_body():
    resp = client.post("/api/render-video", json={})
    assert resp.status_code == 400, f"Expected 400 for missing subtitles, got {resp.status_code}"

def test_render_empty_subtitles_list():
    resp = client.post("/api/render-video", json={"subtitles": []})
    assert resp.status_code == 400, f"Expected 400 for empty subtitles list, got {resp.status_code}"

def test_render_malformed_subtitle_segment():
    # Missing required text and end fields
    resp = client.post("/api/render-video", json={"subtitles": [{"start": 1.0}]})
    assert resp.status_code == 422, f"Expected 422 for incomplete subtitle segment, got {resp.status_code}"

def test_render_invalid_style_preset_graceful():
    # Passing an unknown style preset name
    payload = {
        "subtitles": [
            {"start": 0.0, "end": 2.0, "text": "Testing unknown preset"}
        ],
        "style_preset": "completely_unknown_preset_12345"
    }
    resp = client.post("/api/render-video", json=payload)
    assert resp.status_code == 200, f"Expected 200 graceful handling, got {resp.status_code}: {resp.text}"
    data = resp.json()
    assert data.get("status") == "completed", f"Render failed: {data}"
    assert data.get("output_url") is not None

def test_render_all_four_presets():
    presets = ["hormozi", "beast", "clean", "neon"]
    for p in presets:
        payload = {
            "subtitles": [{"start": 0.0, "end": 1.5, "text": f"Preset {p.upper()} Test"}],
            "style_preset": p
        }
        resp = client.post("/api/render-video", json=payload)
        assert resp.status_code == 200, f"Failed for preset {p}: {resp.status_code}"
        assert resp.json().get("status") == "completed", f"Render status not completed for preset {p}"

def test_render_special_characters_ass_injection():
    # Text with single quotes, double quotes, ASS formatting tags, emoji, and newlines
    payload = {
        "subtitles": [
            {
                "start": 0.0,
                "end": 2.0,
                "text": "🔥 \"Quotes & Special\" {\n} \\N <html> 'single' and 100%!"
            }
        ],
        "style_preset": "hormozi"
    }
    resp = client.post("/api/render-video", json=payload)
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    assert resp.json().get("status") == "completed"

def test_render_inverted_timing():
    # start > end
    payload = {
        "subtitles": [
            {"start": 5.0, "end": 1.0, "text": "Inverted timing test"}
        ]
    }
    resp = client.post("/api/render-video", json=payload)
    assert resp.status_code != 500, f"Server crashed with 500 on inverted timing: {resp.text}"
    # Should complete or return structured response
    assert resp.status_code == 200

def test_render_negative_timing():
    payload = {
        "subtitles": [
            {"start": -10.5, "end": -2.0, "text": "Negative timing test"}
        ]
    }
    resp = client.post("/api/render-video", json=payload)
    assert resp.status_code != 500, f"Server crashed on negative timing: {resp.text}"

def test_render_path_traversal_in_output_format():
    # Attempt directory traversal via output_format
    payload = {
        "subtitles": [{"start": 0.0, "end": 1.0, "text": "Path traversal test"}],
        "output_format": "../../../traversal_test"
    }
    resp = client.post("/api/render-video", json=payload)
    assert resp.status_code != 500, f"Server crashed with 500 on traversal payload: {resp.text}"
    # File should not exist outside renders dir
    assert not os.path.exists("backend/traversal_test")
    assert not os.path.exists("traversal_test")

def test_render_webm_container():
    # Defensive check: WebM format does not produce unhandled 500 crashes
    payload = {
        "subtitles": [{"start": 0.0, "end": 1.0, "text": "WebM Render Test"}],
        "output_format": "webm"
    }
    resp = client.post("/api/render-video", json=payload)
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
    data = resp.json()
    assert resp.status_code != 500
    # Note: Returns structured failure due to H.264/AAC codec muxing conflict into WebM
    assert data.get("status") in ["completed", "failed"]
    if data.get("status") == "failed":
        assert "ffmpeg" in data.get("error", "").lower()

def test_transcribe_whitespace_audio_url():
    # Whitespace audio_url should not cause 500 crash
    resp = client.post("/api/transcribe", json={"audio_url": "   "})
    assert resp.status_code != 500
    assert resp.status_code in [200, 400]

run_test("POST /api/render-video missing body (400)", test_render_missing_body)
run_test("POST /api/render-video empty subtitles list (400)", test_render_empty_subtitles_list)
run_test("POST /api/render-video malformed subtitle item (422)", test_render_malformed_subtitle_segment)
run_test("POST /api/render-video unknown style preset graceful fallback", test_render_invalid_style_preset_graceful)
run_test("POST /api/render-video all 4 presets (hormozi, beast, clean, neon)", test_render_all_four_presets)
run_test("POST /api/render-video quotes, emojis, ASS injection resilience", test_render_special_characters_ass_injection)
run_test("POST /api/render-video inverted timing resilience", test_render_inverted_timing)
run_test("POST /api/render-video negative timing resilience", test_render_negative_timing)
run_test("POST /api/render-video path traversal resilience", test_render_path_traversal_in_output_format)
run_test("POST /api/render-video webm defensive container handling", test_render_webm_container)
run_test("POST /api/transcribe whitespace audio_url resilience", test_transcribe_whitespace_audio_url)

# =========================================================================
# SUMMARY
# =========================================================================
print("\n" + "=" * 60)
passes = sum(1 for r in results if r["status"] == "PASS")
fails = sum(1 for r in results if r["status"] == "FAIL")
errors = sum(1 for r in results if r["status"] == "ERROR")
total = len(results)
print(f"STRESS TEST SUMMARY: {total} tests executed. Passes: {passes}, Fails: {fails}, Errors: {errors}")
print("=" * 60)

if fails > 0 or errors > 0:
    sys.exit(1)
sys.exit(0)
