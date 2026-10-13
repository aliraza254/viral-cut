"""YouTube extraction router."""

from fastapi import APIRouter, HTTPException
from ..models.youtube import YouTubeExtractRequest, YouTubeExtractResponse
from ..services.youtube_service import YouTubeService

router = APIRouter(tags=["YouTube"])


@router.post("/extract-youtube", response_model=YouTubeExtractResponse)
def extract_youtube(request: YouTubeExtractRequest) -> YouTubeExtractResponse:
    """Extract metadata, media streams, and auto-captions from YouTube URL."""
    if not request.url or not request.url.strip():
        raise HTTPException(status_code=400, detail="YouTube URL cannot be empty.")
    
    return YouTubeService.extract_info(request)
