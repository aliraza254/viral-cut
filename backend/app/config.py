"""Application configuration for ViralCut backend."""

import os
from pathlib import Path
from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

# Base directory for the backend
BACKEND_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    """Configuration settings loaded from environment or .env file."""

    model_config = SettingsConfigDict(
        env_file=str(BACKEND_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Server settings
    host: str = Field(default="127.0.0.1", description="FastAPI host")
    port: int = Field(default=8000, description="FastAPI port")
    debug: bool = Field(default=True, description="Debug mode")
    app_version: str = Field(default="1.0.0", description="Backend version")

    # API Keys & External Services
    gemini_api_key: Optional[str] = Field(
        default=None,
        description="Google Gemini API Key",
        alias="GEMINI_API_KEY",
    )

    # FFmpeg executable path
    ffmpeg_path: Optional[str] = Field(
        default=None,
        description="Explicit path to ffmpeg binary",
        alias="FFMPEG_PATH",
    )

    # Storage paths
    upload_dir: str = Field(
        default=str(BACKEND_DIR / "uploads"),
        description="Directory for temporary uploaded media",
    )
    render_dir: str = Field(
        default=str(BACKEND_DIR / "renders"),
        description="Directory for rendered video outputs",
    )
    temp_dir: str = Field(
        default=str(BACKEND_DIR / "temp"),
        description="Directory for temporary processing files",
    )

    # CORS
    cors_origins: List[str] = Field(
        default=[
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "*",
        ],
        description="Allowed CORS origins",
    )


settings = Settings()

# Ensure directories exist
for path_str in [settings.upload_dir, settings.render_dir, settings.temp_dir]:
    try:
        Path(path_str).mkdir(parents=True, exist_ok=True)
    except Exception:
        pass
