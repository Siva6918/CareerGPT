from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Text, JSON, ForeignKey, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .models import Base, gen_uuid

class PortfolioProfile(Base):
    __tablename__ = "portfolio_profiles"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    headline = Column(String)
    location = Column(String)
    preferred_location = Column(String)
    public_slug = Column(String, unique=True, index=True)
    
    is_public = Column(Boolean, default=True)
    show_resume = Column(Boolean, default=False)
    show_github = Column(Boolean, default=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class UserEducation(Base):
    __tablename__ = "user_education"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    institution = Column(String)
    degree = Column(String)
    department = Column(String)
    start_year = Column(Integer)
    end_year = Column(Integer)
    grade = Column(String)
    coursework = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class UserExperience(Base):
    __tablename__ = "user_experiences"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    role = Column(String)
    company = Column(String)
    location = Column(String)
    start_date = Column(String)
    end_date = Column(String)
    is_current = Column(Boolean, default=False)
    description = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class UserCertification(Base):
    __tablename__ = "user_certifications"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name = Column(String)
    issuer = Column(String)
    issue_date = Column(String)
    url = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class ExternalPlatform(Base):
    __tablename__ = "external_platforms"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    platform_name = Column(String) # github, leetcode, codechef, etc.
    username = Column(String)
    profile_url = Column(String)
    stats_json = Column(JSON, default=dict)
    last_synced = Column(DateTime(timezone=True))
    sync_status = Column(String) # success | failed
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    __table_args__ = (
        Index("ix_external_platform_user", "user_id", "platform_name", unique=True),
    )

class UserProject(Base):
    __tablename__ = "user_projects"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title = Column(String)
    description = Column(Text)
    languages = Column(JSON, default=list)
    repo_url = Column(String)
    demo_url = Column(String)
    stars = Column(Integer, default=0)
    forks = Column(Integer, default=0)
    is_featured = Column(Boolean, default=False)
    is_hidden = Column(Boolean, default=False)
    last_updated = Column(String)
    source = Column(String, default="manual") # manual or github
    order_index = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
