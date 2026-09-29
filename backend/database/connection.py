"""
CareerGPT - Database Connection and Session Management
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from typing import Generator
from config import settings
import logging

logger = logging.getLogger(__name__)

# Handle PostgreSQL connection string for Supabase / PostgreSQL
DATABASE_URL = settings.database_url
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

if DATABASE_URL.startswith("postgresql"):
    engine = create_engine(
        DATABASE_URL,
        pool_size=10,
        max_overflow=20,
        pool_pre_ping=True,
        pool_recycle=300,
        connect_args={"connect_timeout": 15}
    )
else:
    # SQLite fallback for offline development
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False}
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency for database sessions."""
    db = SessionLocal()
    try:
        yield db
    except Exception as e:
        logger.error(f"Database error: {e}")
        db.rollback()
        raise
    finally:
        db.close()


def init_db():
    """Initialize database - create all tables."""
    global engine, SessionLocal
    from models.models import Base
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created successfully on primary PostgreSQL")
    except Exception as e:
        logger.warning(f"Primary PostgreSQL connection failed ({e}). Falling back to local SQLite engine...")
        engine = create_engine("sqlite:///./careergpt.db", connect_args={"check_same_thread": False})
        SessionLocal.configure(bind=engine)
        Base.metadata.create_all(bind=engine)
        logger.info("Local SQLite database tables initialized successfully")

