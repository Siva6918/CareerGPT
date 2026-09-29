"""CareerGPT — Profile API"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
import uuid

from database.connection import get_db
from api.auth import get_current_user
from models.models import User, UserProfile, LearningGoal, LearningGoalType, LearningGoalStatus
from api.learning_goals import suggest_roadmap_slugs

router = APIRouter()

def _sync_primary_learning_goal(db: Session, user_id: str, profile: UserProfile):
    """Ensure the user has a PRIMARY learning goal matching their target role."""
    primary = db.query(LearningGoal).filter(
        LearningGoal.user_id == user_id,
        LearningGoal.is_primary == True
    ).first()

    title = profile.target_role or profile.target_domain or "General Engineering"
    roadmap_slugs = suggest_roadmap_slugs(title, "role")

    if primary:
        primary.title = title
        primary.domain = profile.target_domain
        primary.track = profile.target_role
        primary.branch = profile.branch
        if profile.preferred_languages:
            primary.technology = profile.preferred_languages[0]
        # Only overwrite slugs if we actually found suggestions, else keep existing
        if roadmap_slugs:
            primary.roadmap_slugs = roadmap_slugs
        db.commit()
    else:
        new_primary = LearningGoal(
            id=str(uuid.uuid4()),
            user_id=user_id,
            goal_type=LearningGoalType.ROLE,
            is_primary=True,
            title=title,
            domain=profile.target_domain,
            track=profile.target_role,
            branch=profile.branch,
            technology=profile.preferred_languages[0] if profile.preferred_languages else None,
            roadmap_slugs=roadmap_slugs,
            status=LearningGoalStatus.ACTIVE,
            progress_pct=0.0
        )
        db.add(new_primary)
        db.commit()


class ProfileCreate(BaseModel):
    branch: str
    target_domain: str
    target_role: str
    preferred_languages: List[str] = []
    preferred_technologies: List[str] = []
    experience_level: str = "student"
    college: Optional[str] = None
    year_of_study: Optional[int] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    bio: Optional[str] = None


@router.post("/create")
async def create_profile(
    profile_data: ProfileCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create or update user career profile."""
    existing = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    
    if existing:
        for key, val in profile_data.dict().items():
            setattr(existing, key, val)
        db.commit()
        db.refresh(existing)
        _sync_primary_learning_goal(db, current_user.id, existing)
        return {"message": "Profile updated", "profile_id": existing.id}
    
    profile = UserProfile(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        **profile_data.dict()
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)
    _sync_primary_learning_goal(db, current_user.id, profile)
    
    return {"message": "Profile created", "profile_id": profile.id, "profile": profile_data.dict()}


@router.get("/me")
async def get_my_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's career profile."""
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    
    if not profile:
        return {"has_profile": False, "message": "Please create your career profile first"}
    
    return {
        "has_profile": True,
        "id": profile.id,
        "branch": profile.branch,
        "target_domain": profile.target_domain,
        "target_role": profile.target_role,
        "preferred_languages": profile.preferred_languages,
        "preferred_technologies": profile.preferred_technologies,
        "experience_level": profile.experience_level,
        "college": profile.college,
        "year_of_study": profile.year_of_study,
        "linkedin_url": profile.linkedin_url,
        "github_url": profile.github_url,
    }
