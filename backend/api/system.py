from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from database.connection import get_db
from llm.provider import get_llm_provider
from config import settings
import os

router = APIRouter(prefix="/system", tags=["System & Health"])

@router.get("/llm-status")
async def get_llm_status():
    provider = get_llm_provider()
    # Check if they are configured
    openai_configured = bool(settings.openai_api_key)
    gemini_configured = bool(settings.gemini_api_key)
    
    healthy = await provider.health_check()
    
    return {
        "active_provider": type(provider).__name__,
        "is_healthy": healthy,
        "providers": {
            "openai": "available" if openai_configured else "not_configured",
            "gemini": "available" if gemini_configured else "not_configured",
            "mock": "available"
        }
    }

@router.get("/health/database")
async def get_db_health(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        return {"status": "healthy", "database": "PostgreSQL/SQLite"}
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}

@router.get("/health/storage")
async def get_storage_health():
    # Check uploads directory
    uploads_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
    try:
        if not os.path.exists(uploads_dir):
            os.makedirs(uploads_dir)
        # Check write permissions
        test_file = os.path.join(uploads_dir, ".test")
        with open(test_file, "w") as f:
            f.write("test")
        os.remove(test_file)
        return {"status": "healthy", "storage_path": "uploads/"}
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}

@router.get("/ready")
async def readiness_check(db: Session = Depends(get_db)):
    """Check if all critical dependencies are ready."""
    try:
        # Check database
        db.execute(text("SELECT 1"))
        db_ready = True
    except Exception:
        db_ready = False
        
    # Check LLM
    provider = get_llm_provider()
    llm_ready = await provider.health_check()
    
    if db_ready and llm_ready:
        return {"status": "ready"}
    else:
        return {
            "status": "not_ready",
            "database": "ready" if db_ready else "failing",
            "llm": "ready" if llm_ready else "failing"
        }
