from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database.connection import get_db
from models.models import User, UserProfile
from api.auth import get_current_user

from career.readiness_engine import CareerReadinessEngine
from career.project_engine import ProjectRecommendationEngine
from career.action_engine import NextBestActionEngine
from career.role_matching import RoleMatchingEngine

router = APIRouter(prefix="/career", tags=["Career Intelligence"])

@router.get("/readiness")
async def get_readiness(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    target_role = profile.target_role if profile else "Software Developer"
    
    engine = CareerReadinessEngine(db)
    readiness = engine.calculate_readiness(current_user.id, target_role)
    
    return {
        "target_role": readiness.target_role,
        "readiness_level": readiness.readiness_level,
        "estimated_score": readiness.estimated_score,
        "dimensions": readiness.dimensions,
        "confidence": readiness.confidence,
        "last_assessed": readiness.last_assessed
    }

@router.get("/skill-gaps")
async def get_skill_gaps(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    target_role = profile.target_role if profile else "Software Developer"
    
    # Normally we calculate this dynamically or fetch from db
    from models.models import SkillGap
    gaps = db.query(SkillGap).filter(
        SkillGap.user_id == current_user.id,
        SkillGap.target_role == target_role,
        SkillGap.is_active == True
    ).order_by(SkillGap.priority).all()
    
    return {"gaps": gaps}

@router.get("/projects/recommended")
async def get_recommended_projects(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    target_role = profile.target_role if profile else "Software Developer"
    
    engine = ProjectRecommendationEngine(db)
    projects = engine.get_recommended_projects(current_user.id, target_role)
    
    return {"projects": projects}

@router.get("/roles/matches")
async def get_role_matches(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    engine = RoleMatchingEngine(db)
    matches = engine.get_role_matches(current_user.id)
    return {"matches": matches}

@router.get("/next-action")
async def get_next_action(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    target_role = profile.target_role if profile else "Software Developer"
    
    engine = NextBestActionEngine(db)
    action = engine.determine_next_action(current_user.id, target_role)
    return action

@router.get("/dashboard")
async def get_career_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Aggregated endpoint for the frontend dashboard
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    target_role = profile.target_role if profile else "Software Developer"
    
    r_engine = CareerReadinessEngine(db)
    readiness = r_engine.calculate_readiness(current_user.id, target_role)
    
    from models.models import SkillGap
    gaps = db.query(SkillGap).filter(
        SkillGap.user_id == current_user.id,
        SkillGap.target_role == target_role,
        SkillGap.is_active == True
    ).order_by(SkillGap.priority).all()
    
    p_engine = ProjectRecommendationEngine(db)
    projects = p_engine.get_recommended_projects(current_user.id, target_role, limit=2)
    
    a_engine = NextBestActionEngine(db)
    action = a_engine.determine_next_action(current_user.id, target_role)
    
    return {
        "readiness": readiness,
        "top_gaps": gaps[:4] if gaps else [],
        "projects": projects,
        "next_action": action
    }
