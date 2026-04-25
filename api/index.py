import sys
from pathlib import Path

# Add backend directory to Python path
sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

from app.main import app

# Export the FastAPI app for Vercel
__all__ = ["app"]
