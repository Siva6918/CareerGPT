"""
CareerGPT — Production Resume API
Handles persistent upload to Supabase private storage, local caching, parsing,
database persistence, and automatic competency graph baseline initialization.
"""
import uuid
import os
import logging
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import Optional, List

from database.connection import get_db
from api.auth import get_current_user
from models.models import User, Resume, ResumeSkill, CompetencyNode, CompetencyState, Roadmap
from resume.parser import ResumeParser, DemoResumeParser
from storage.service import storage_service
from config import settings
from core.security import rate_limit

router = APIRouter()
logger = logging.getLogger(__name__)

ALLOWED_TYPES = {
    "application/pdf": ".pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx"
}


@router.post("/upload", dependencies=[Depends(rate_limit(requests=5, window=86400))])
async def upload_resume(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Upload and parse resume file.
    Persists original file to Supabase private storage bucket.
    Extracts skills, projects, and initializes competency graph.
    """
    if file.content_type not in ALLOWED_TYPES and not file.filename.endswith((".pdf", ".docx")):
        raise HTTPException(status_code=400, detail="Only PDF and DOCX files are supported")
    
    # Check file size
    contents = await file.read()
    size_mb = len(contents) / (1024 * 1024)
    if size_mb > settings.max_upload_size_mb:
        raise HTTPException(status_code=400, detail=f"File too large. Max {settings.max_upload_size_mb}MB")
    
    resume_id = str(uuid.uuid4())
    ext = ".pdf" if file.filename.endswith(".pdf") else ".docx"
    clean_filename = f"{resume_id}{ext}"
    
    # 1. Save temporary local copy for text/PDF parsing
    os.makedirs(settings.upload_dir, exist_ok=True)
    temp_file_path = os.path.join(settings.upload_dir, clean_filename)
    with open(temp_file_path, "wb") as f:
        f.write(contents)
    
    # 2. Upload original file to Supabase Private Storage Bucket
    storage_path = f"{current_user.id}/{resume_id}/{file.filename}"
    upload_ok, stored_uri = storage_service.upload_file(
        bucket=settings.resume_bucket,
        path=storage_path,
        file_bytes=contents,
        content_type=file.content_type or "application/pdf"
    )
    
    # 3. Parse resume with local parser
    try:
        parser = ResumeParser()
        parsed = await parser.parse_async(temp_file_path)
    except Exception as e:
        logger.error(f"Resume parsing failed: {e}")
        parsed = {"error": str(e), "skills": []}
    
    # 4. Mark previous resumes as inactive
    db.query(Resume).filter(
        Resume.user_id == current_user.id,
        Resume.is_active == True
    ).update({"is_active": False})
    
    # 5. Save Resume to PostgreSQL DB
    resume = Resume(
        id=resume_id,
        user_id=current_user.id,
        filename=file.filename,
        file_path=stored_uri,
        file_type=ext.lstrip("."),
        raw_text=parsed.get("raw_text", ""),
        parsed_data=parsed,
        is_active=True
    )
    db.add(resume)
    
    # 6. Save extracted skills to ResumeSkill and update CompetencyNode baseline
    extracted_skills = parsed.get("skills", [])
    for skill_info in extracted_skills:
        skill_name = skill_info.get("skill_name") or skill_info.get("name")
        canonical_id = skill_info.get("canonical_id") or skill_name.lower().replace(" ", "_").replace("-", "_")
        confidence = float(skill_info.get("confidence", 0.8))
        
        # Save resume skill item
        r_skill = ResumeSkill(
            resume_id=resume_id,
            skill_name=skill_name,
            normalized_skill_id=canonical_id,
            confidence=confidence,
            context=skill_info.get("context", ""),
            source_section=skill_info.get("section", "skills")
        )
        db.add(r_skill)
        
        # Upsert CompetencyNode for user
        existing_node = db.query(CompetencyNode).filter(
            CompetencyNode.user_id == current_user.id,
            CompetencyNode.skill_id == canonical_id
        ).first()
        
        if existing_node:
            existing_node.evidence_from_resume = True
            existing_node.evidence_count = (existing_node.evidence_count or 0) + 1
            if existing_node.competency_state == CompetencyState.UNKNOWN:
                existing_node.competency_state = CompetencyState.EMERGING
                existing_node.uncertainty = 0.65
        else:
            new_node = CompetencyNode(
                user_id=current_user.id,
                skill_id=canonical_id,
                skill_name=skill_name,
                category=skill_info.get("category", "Technical"),
                competency_state=CompetencyState.EMERGING,
                competency_score=0.55,
                uncertainty=0.65,
                evidence_count=1,
                evidence_from_resume=True
            )
            db.add(new_node)
            
    # 7. Invalidate active roadmap so frontend recalculates it with new competencies
    db.query(Roadmap).filter(
        Roadmap.user_id == current_user.id,
        Roadmap.is_active == True
    ).update({"is_active": False})

    db.commit()
    db.refresh(resume)
    
    return {
        "resume_id": resume_id,
        "filename": file.filename,
        "storage_uri": stored_uri,
        "skills_extracted": len(extracted_skills),
        "skills": extracted_skills,
        "sections_detected": [k for k in ["education", "experience", "projects", "certifications"] 
                              if parsed.get(f"{k}_section")],
        "status": "parsed"
    }


@router.get("/demo/sample")
async def get_demo_resume(current_user: User = Depends(get_current_user)):
    """Get a sample demo resume for testing."""
    parser = DemoResumeParser()
    return parser.get_demo_data()


@router.get("/{resume_id}")
async def get_resume(
    resume_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get resume details with user authorization check."""
    resume = db.query(Resume).filter(
        Resume.id == resume_id,
        Resume.user_id == current_user.id
    ).first()
    
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    
    # Generate signed URL for private Supabase file if available
    download_url = None
    if resume.file_path and resume.file_path.startswith("supabase://"):
        parts = resume.file_path.replace("supabase://", "").split("/", 1)
        if len(parts) == 2:
            bucket, path = parts
            download_url = storage_service.get_signed_url(bucket=bucket, path=path, expires_in=3600)
    
    return {
        "id": resume.id,
        "filename": resume.filename,
        "file_path": resume.file_path,
        "download_url": download_url,
        "skills": resume.parsed_data.get("skills", []) if resume.parsed_data else [],
        "education": resume.parsed_data.get("education", []) if resume.parsed_data else [],
        "experience": resume.parsed_data.get("experience", []) if resume.parsed_data else [],
        "projects": resume.parsed_data.get("projects", []) if resume.parsed_data else [],
    }
