"""
CareerGPT Backend - Configuration Settings
"""
from pydantic_settings import BaseSettings
from typing import List, Optional
import os


class Settings(BaseSettings):
    # App
    app_name: str = "CareerGPT"
    app_env: str = "development"
    log_level: str = "INFO"
    
    # Database
    database_url: str = "sqlite:///./careergpt.db"
    
    # JWT Auth
    secret_key: str = "dev-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 10080  # 7 days
    
    # LLM
    openai_api_key: Optional[str] = None
    gemini_api_key: Optional[str] = None
    llm_provider: str = "gemini"  # openai | gemini | mock
    gemini_model: str = "gemini-flash-latest"
    openai_model: str = "gpt-4o-mini"
    
    # Demo mode
    demo_mode: bool = False
    
    # Supabase & Persistent Storage
    supabase_url: Optional[str] = None
    supabase_publishable_key: Optional[str] = None
    supabase_secret_key: Optional[str] = None
    storage_provider: str = "supabase"  # supabase | local
    resume_bucket: str = "career-resumes"
    audio_bucket: str = "interview-audio"
    video_bucket: str = "interview-video"
    document_bucket: str = "user-documents"
    
    # File upload
    upload_dir: str = "./uploads"
    max_upload_size_mb: int = 10
    
    # CORS
    allowed_origins: str = "http://localhost:5173,http://localhost:3000"
    
    # Features
    enable_speech: bool = True
    enable_vision: bool = True
    
    # Redis (optional)
    redis_url: Optional[str] = None
    
    # Email (Resend)
    resend_api_key: Optional[str] = None
    email_from: str = "onboarding@resend.dev"

    @property
    def cors_origins(self) -> List[str]:
        return [o.strip() for o in self.allowed_origins.split(",")]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


settings = Settings()

# Ensure upload dir exists
os.makedirs(settings.upload_dir, exist_ok=True)
