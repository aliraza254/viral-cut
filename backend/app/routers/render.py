"""Video rendering and ASS subtitle burning router."""

from fastapi import APIRouter, HTTPException
from ..models.render import RenderVideoRequest, RenderVideoResponse
from ..services.render_service import RenderService

router = APIRouter(tags=["Video Rendering"])


@router.post("/render-video", response_model=RenderVideoResponse)
def render_video(request: RenderVideoRequest) -> RenderVideoResponse:
    """Burn synchronized subtitles into 9:16 short-form video with selected preset."""
    if not request.subtitles:
        raise HTTPException(
            status_code=400,
            detail="At least one subtitle segment is required for video rendering.",
        )
    return RenderService.render_video(request)
