"""Audio transcription endpoint router."""

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from typing import Optional
import base64
from ..models.transcribe import TranscribeRequest, TranscribeResponse
from ..services.transcribe_service import TranscribeService

router = APIRouter(tags=["Transcription"])


@router.post("/transcribe", response_model=TranscribeResponse)
def transcribe_audio(request: TranscribeRequest) -> TranscribeResponse:
    """Transcribe speech and generate synchronized subtitle lines from JSON payload."""
    if not request.audio_base64 and not request.audio_url:
        raise HTTPException(
            status_code=400,
            detail="Either audio_base64 or audio_url must be provided for transcription.",
        )
    return TranscribeService.transcribe(request)


@router.post("/transcribe-video", response_model=TranscribeResponse)
def transcribe_video_alias(request: TranscribeRequest) -> TranscribeResponse:
    """Backwards-compatible alias for existing frontend callers."""
    return transcribe_audio(request)


@router.post("/transcribe/upload", response_model=TranscribeResponse)
async def transcribe_audio_file(
    file: UploadFile = File(...),
    language: Optional[str] = Form("auto"),
    video_title: Optional[str] = Form("Uploaded Video"),
) -> TranscribeResponse:
    """Handle multipart file upload for audio transcription."""
    file_bytes = await file.read()
    b64_audio = base64.b64encode(file_bytes).decode("utf-8")

    request = TranscribeRequest(
        audio_base64=b64_audio,
        mime_type=file.content_type or "audio/wav",
        language=language,
        video_title=video_title or file.filename or "Uploaded Video",
    )
    return TranscribeService.transcribe(request)
