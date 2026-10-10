from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from database.connection import get_db
from api.auth import get_current_user
from models.models import User
from models.portfolio import (
    PortfolioProfile, UserEducation, UserExperience, UserCertification,
    ExternalPlatform, UserProject
)
import uuid

router = APIRouter()

class ProfileSetupData(BaseModel):
    headline: Optional[str] = None
    location: Optional[str] = None
    preferred_location: Optional[str] = None
    public_slug: Optional[str] = None
    is_public: Optional[bool] = True
    show_resume: Optional[bool] = False
    show_github: Optional[bool] = True
    educations: List[Dict[str, Any]] = []
    experiences: List[Dict[str, Any]] = []
    certifications: List[Dict[str, Any]] = []
    external_platforms: List[Dict[str, Any]] = []
    projects: List[Dict[str, Any]] = []

@router.get("/me")
def get_my_portfolio(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    portfolio = db.query(PortfolioProfile).filter(PortfolioProfile.user_id == current_user.id).first()
    if not portfolio:
        return {}
    
    educations = db.query(UserEducation).filter(UserEducation.user_id == current_user.id).all()
    experiences = db.query(UserExperience).filter(UserExperience.user_id == current_user.id).all()
    certifications = db.query(UserCertification).filter(UserCertification.user_id == current_user.id).all()
    external_platforms = db.query(ExternalPlatform).filter(ExternalPlatform.user_id == current_user.id).all()
    projects = db.query(UserProject).filter(UserProject.user_id == current_user.id).all()
    
    # We must strip internal sa state
    def strip_sa(obj):
        if not obj: return None
        d = obj.__dict__.copy()
        d.pop('_sa_instance_state', None)
        return d
        
    return {
        "profile": {
            "headline": portfolio.headline,
            "location": portfolio.location,
            "preferred_location": portfolio.preferred_location,
            "public_slug": portfolio.public_slug,
            "is_public": portfolio.is_public,
            "show_resume": portfolio.show_resume,
            "show_github": portfolio.show_github
        },
        "educations": [strip_sa(e) for e in educations],
        "experiences": [strip_sa(e) for e in experiences],
        "certifications": [strip_sa(e) for e in certifications],
        "external_platforms": [strip_sa(e) for e in external_platforms],
        "projects": [strip_sa(e) for e in projects]
    }

@router.post("/me")
def update_my_portfolio(data: ProfileSetupData, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    portfolio = db.query(PortfolioProfile).filter(PortfolioProfile.user_id == current_user.id).first()
    if not portfolio:
        portfolio = PortfolioProfile(id=str(uuid.uuid4()), user_id=current_user.id)
        db.add(portfolio)
    
    portfolio.headline = data.headline
    portfolio.location = data.location
    portfolio.preferred_location = data.preferred_location
    if data.public_slug:
        # Check if slug is taken by someone else
        existing_slug = db.query(PortfolioProfile).filter(PortfolioProfile.public_slug == data.public_slug, PortfolioProfile.user_id != current_user.id).first()
        if existing_slug:
            raise HTTPException(status_code=400, detail="Public slug is already taken.")
        portfolio.public_slug = data.public_slug
    portfolio.is_public = data.is_public
    portfolio.show_resume = data.show_resume
    portfolio.show_github = data.show_github
    
    # Handle educations
    db.query(UserEducation).filter(UserEducation.user_id == current_user.id).delete()
    for ed in data.educations:
        new_ed = UserEducation(
            id=str(uuid.uuid4()),
            user_id=current_user.id,
            institution=ed.get('institution'),
            degree=ed.get('degree'),
            department=ed.get('department'),
            start_year=ed.get('start_year'),
            end_year=ed.get('end_year'),
            grade=ed.get('grade'),
            coursework=ed.get('coursework')
        )
        db.add(new_ed)
        
    # Handle experiences
    db.query(UserExperience).filter(UserExperience.user_id == current_user.id).delete()
    for ex in data.experiences:
        new_ex = UserExperience(
            id=str(uuid.uuid4()),
            user_id=current_user.id,
            role=ex.get('role'),
            company=ex.get('company'),
            location=ex.get('location'),
            start_date=ex.get('start_date'),
            end_date=ex.get('end_date'),
            is_current=ex.get('is_current', False),
            description=ex.get('description')
        )
        db.add(new_ex)
        
    # Handle certifications
    db.query(UserCertification).filter(UserCertification.user_id == current_user.id).delete()
    for cert in data.certifications:
        new_cert = UserCertification(
            id=str(uuid.uuid4()),
            user_id=current_user.id,
            name=cert.get('name'),
            issuer=cert.get('issuer'),
            issue_date=cert.get('issue_date'),
            url=cert.get('url')
        )
        db.add(new_cert)
        
    # Handle external platforms
    db.query(ExternalPlatform).filter(ExternalPlatform.user_id == current_user.id).delete()
    for ext in data.external_platforms:
        new_ext = ExternalPlatform(
            id=str(uuid.uuid4()),
            user_id=current_user.id,
            platform_name=ext.get('platform_name'),
            username=ext.get('username'),
            profile_url=ext.get('profile_url')
        )
        db.add(new_ext)
        
    # Handle projects
    db.query(UserProject).filter(UserProject.user_id == current_user.id).delete()
    for i, proj in enumerate(data.projects):
        new_proj = UserProject(
            id=str(uuid.uuid4()),
            user_id=current_user.id,
            title=proj.get('title'),
            description=proj.get('description'),
            languages=proj.get('languages', []),
            repo_url=proj.get('repo_url'),
            demo_url=proj.get('demo_url'),
            is_featured=proj.get('is_featured', False),
            order_index=i,
            source=proj.get('source', 'manual')
        )
        db.add(new_proj)
        
    db.commit()
    return {"message": "Portfolio updated successfully"}

@router.get("/public/{slug}")
def get_public_portfolio(slug: str, db: Session = Depends(get_db)):
    portfolio = db.query(PortfolioProfile).filter(PortfolioProfile.public_slug == slug).first()
    if not portfolio or not portfolio.is_public:
        raise HTTPException(status_code=404, detail="Portfolio not found or private.")
        
    user = db.query(User).filter(User.id == portfolio.user_id).first()
    educations = db.query(UserEducation).filter(UserEducation.user_id == portfolio.user_id).all()
    experiences = db.query(UserExperience).filter(UserExperience.user_id == portfolio.user_id).all()
    certifications = db.query(UserCertification).filter(UserCertification.user_id == portfolio.user_id).all()
    external_platforms = db.query(ExternalPlatform).filter(ExternalPlatform.user_id == portfolio.user_id).all()
    projects = db.query(UserProject).filter(UserProject.user_id == portfolio.user_id).order_by(UserProject.order_index).all()
    
    # We should also return standard UserProfile stuff
    from models.models import UserProfile
    basic_profile = db.query(UserProfile).filter(UserProfile.user_id == portfolio.user_id).first()
    
    def strip_sa(obj):
        if not obj: return None
        d = obj.__dict__.copy()
        d.pop('_sa_instance_state', None)
        return d
        
    return {
        "user": {
            "full_name": user.full_name,
            "username": user.username,
        },
        "basic_profile": strip_sa(basic_profile),
        "portfolio": strip_sa(portfolio),
        "educations": [strip_sa(e) for e in educations],
        "experiences": [strip_sa(e) for e in experiences],
        "certifications": [strip_sa(e) for e in certifications],
        "external_platforms": [strip_sa(e) for e in external_platforms],
        "projects": [strip_sa(e) for e in projects]
    }
