"""CareerGPT — Reports API"""
from fastapi import APIRouter, Depends
from api.auth import get_current_user
from models.models import User

router = APIRouter()

@router.get("/")
async def list_reports(current_user: User = Depends(get_current_user)):
    """List all reports for current user."""
    return {"reports": [], "message": "No reports generated yet. Complete an interview first."}
