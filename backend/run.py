"""Runner script for ViralCut FastAPI backend server."""

import os
import sys
from pathlib import Path

# Ensure backend root is on sys.path
backend_root = Path(__file__).resolve().parent
if str(backend_root) not in sys.path:
    sys.path.insert(0, str(backend_root))

from app.config import settings
import uvicorn

if __name__ == "__main__":
    port = int(os.environ.get("PORT", settings.port))
    host = os.environ.get("HOST", settings.host)
    print(f"Starting ViralCut Backend server on http://{host}:{port}")
    uvicorn.run("app.main:app", host=host, port=port, reload=settings.debug)
