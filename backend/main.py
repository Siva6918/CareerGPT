"""
CareerGPT — FastAPI Main Application

Agentic AI-Based Career Mentoring & Placement Readiness System
"""
import logging
import sys
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import time

from config import settings
from database.connection import init_db

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.log_level),
    format="%(asctime)s | %(name)s | %(levelname)s | %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)


import asyncio
import os
import httpx


async def keep_alive_task():
    """Background task to keep Render instance active.

    Runs every 14 minutes 30 seconds.  Guarded so only the *first*
    Uvicorn/Gunicorn worker (identified by RENDER_WORKER_INDEX == "0",
    which we set in the start command) fires the HTTP ping.  All other
    workers skip the network call, preventing N simultaneous pings when
    N workers are running.
    """
    sleep_interval = 14 * 60 + 30

    # Only the designated worker fires the ping.
    # If running with a single worker the env var may be absent; that is
    # also treated as "worker 0" so the ping still fires.
    worker_index = os.environ.get("RENDER_WORKER_INDEX", "0")
    if worker_index != "0":
        logger.debug(
            f"Worker {worker_index}: skipping keep-alive (handled by worker 0)"
        )
        return

    while True:
        await asyncio.sleep(sleep_interval)
        url = os.environ.get("RENDER_EXTERNAL_URL")
        if not url:
            logger.debug("No RENDER_EXTERNAL_URL found, skipping keep-alive ping")
            continue
        health_url = f"{url.rstrip('/')}/health"
        logger.info(f"Ping keep-alive endpoint: {health_url}")
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(health_url)
                logger.debug(f"Keep-alive ping status: {resp.status_code}")
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Keep-alive ping failed: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    logger.info("=" * 60)
    logger.info("CareerGPT — Agentic AI Career System")
    logger.info("=" * 60)
    
    # Initialize database
    init_db()
    logger.info("Database initialized")
    
    # Seed initial data
    await seed_initial_data()
    
    # Initialize LLM provider
    from llm.provider import get_llm_provider
    provider = get_llm_provider()
    try:
        healthy = await asyncio.wait_for(provider.health_check(), timeout=4.0)
    except Exception:
        healthy = False
    logger.info(f"LLM Provider: {type(provider).__name__} | Healthy: {healthy}")
    
    if settings.demo_mode:
        logger.info("*** DEMO MODE ACTIVE — Mock data will be used ***")
    
    # Start the keep-alive task
    keep_alive = asyncio.create_task(keep_alive_task())
    
    logger.info("CareerGPT ready")
    yield
    logger.info("CareerGPT shutting down")
    
    # Cancel keep-alive task
    keep_alive.cancel()
    try:
        await keep_alive
    except asyncio.CancelledError:
        pass


app = FastAPI(
    title="CareerGPT API",
    description="""
    CareerGPT — An Agentic AI-Based Career Mentoring & Placement Readiness System
    
    ## Modules
    - **Module 1**: Dynamic Candidate Competency Graph
    - **Module 2**: Uncertainty-Aware Multimodal Competency Estimator  
    - **Module 3**: Adaptive Evidence Acquisition and Interview Policy Engine
    
    ## Agentic Loop
    OBSERVE → DECIDE → ASK → ANALYZE → UPDATE → REPEAT
    """,
    version="1.0.0",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request timing middleware
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    return response


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error. Please try again.", "type": type(exc).__name__}
    )


# Import and register routers (each registered exactly once)
from api import auth, resume, profile, interview, roadmap, competency, reports, knowledge
from api import learning_goals, roadmap_sources, career, system, notifications, portfolio

app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
app.include_router(resume.router, prefix="/resume", tags=["Resume"])
app.include_router(profile.router, prefix="/profile", tags=["Profile"])
app.include_router(portfolio.router, prefix="/portfolio", tags=["Portfolio"])
app.include_router(interview.router, prefix="/interview", tags=["Interview"])
app.include_router(roadmap.router, prefix="/roadmap", tags=["Roadmap"])
app.include_router(competency.router, prefix="/competency", tags=["Competency"])
app.include_router(reports.router, prefix="/reports", tags=["Reports"])
app.include_router(knowledge.router, prefix="/knowledge", tags=["Knowledge Base"])
app.include_router(learning_goals.router, prefix="/learning-goals", tags=["Learning Goals"])
app.include_router(roadmap_sources.router, prefix="/roadmaps", tags=["Roadmap Explorer"])
app.include_router(career.router, prefix="/api", tags=["Career Intelligence"])
app.include_router(system.router, tags=["System"])
app.include_router(notifications.router, prefix="/notifications", tags=["Notifications"])


@app.get("/", tags=["Health"])
async def root():
    return {
        "name": "CareerGPT API",
        "version": "2.0.0",
        "status": "running",
        "demo_mode": settings.demo_mode,
        "llm_provider": settings.llm_provider,
        "description": "Agentic AI Career Mentoring System — Multi-Domain Learning Edition"
    }


@app.get("/career/index", tags=["Career Knowledge"])
async def get_career_index():
    """Serve the Excel-derived career index (branches → domains → tracks)."""
    import json
    from pathlib import Path
    career_index_path = Path(__file__).resolve().parent / "data" / "career_index.json"
    if career_index_path.exists():
        with open(career_index_path, "r", encoding="utf-8") as f:
            return json.load(f)
    return {"error": "Career index not built. Run import_master_roadmap.py"}


@app.get("/career/roadmap", tags=["Career Knowledge"])
async def get_learning_roadmap(
    branch: str = "CSE",
    domain: str = "",
    track: str = ""
):
    """Serve Excel-derived learning roadmap stages for a specific track."""
    import json
    from pathlib import Path
    roadmap_path = Path(__file__).resolve().parent / "data" / "learning_roadmap.json"
    if not roadmap_path.exists():
        return {"error": "Learning roadmap not built. Run import_master_roadmap.py"}
    with open(roadmap_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    key = f"{branch}::{domain}::{track}"
    if key in data:
        return data[key]
    # Return all tracks if no specific track requested
    if not track:
        branch_tracks = {k: v for k, v in data.items() if k.startswith(f"{branch}::")}
        return {"branch": branch, "tracks": list(branch_tracks.values())}
    return {"error": f"Track '{track}' not found", "available_keys": list(data.keys())[:20]}


@app.get("/health", tags=["Health"])
async def health_check():
    """Lightweight liveness probe.

    Intentionally does NOT call the LLM provider or load the knowledge
    graph so that the keep-alive ping (every 14 min 30 s) is cheap and
    cannot cause memory or quota pressure.
    """
    return {
        "title": "CareerGPT System Health",
        "status": "healthy",
        "demo_mode": settings.demo_mode,
        "services": {
            "Database": "healthy",
            "LLM": "configured",
            "Storage": "healthy",
            "Resume Parser": "healthy",
            "Interview": "healthy",
            "Competency": "healthy",
            "Roadmap": "healthy"
        }
    }


async def seed_initial_data():
    """Seed initial knowledge base data."""
    from database.connection import SessionLocal
    from models.models import Skill, JobRole
    
    db = SessionLocal()
    try:
        # Check if already seeded
        if db.query(Skill).first():
            logger.info("Data already seeded")
            return
        
        # Seed skills
        base_skills = [
            {"name": "Java", "category": "language", "branch": "CSE"},
            {"name": "Python", "category": "language", "branch": "CSE"},
            {"name": "JavaScript", "category": "language", "branch": "CSE"},
            {"name": "C", "category": "language", "branch": "ECE"},
            {"name": "C++", "category": "language", "branch": "ECE"},
            {"name": "Spring Boot", "category": "framework", "branch": "CSE", "domain": "Backend Engineering"},
            {"name": "React", "category": "framework", "branch": "CSE", "domain": "Frontend Engineering"},
            {"name": "FastAPI", "category": "framework", "branch": "CSE", "domain": "Backend Engineering"},
            {"name": "PostgreSQL", "category": "tool", "branch": "CSE", "domain": "Backend Engineering"},
            {"name": "Docker", "category": "tool", "branch": "CSE"},
            {"name": "Machine Learning", "category": "concept", "branch": "CSE", "domain": "AI & Data Science"},
            {"name": "Data Structures", "category": "concept", "branch": "CSE"},
            {"name": "REST API", "category": "concept", "branch": "CSE", "domain": "Backend Engineering"},
            {"name": "System Design", "category": "concept", "branch": "CSE", "domain": "Backend Engineering"},
            {"name": "Verilog", "category": "language", "branch": "ECE"},
        ]
        
        for s in base_skills:
            skill = Skill(
                name=s["name"],
                category=s.get("category", "concept"),
                branch=s.get("branch", "CSE"),
                domain=s.get("domain", ""),
                aliases=[]
            )
            db.add(skill)
        
        # Seed job roles
        job_roles = [
            {
                "title": "Backend Developer",
                "domain": "Backend Engineering",
                "branch": "CSE",
                "required_skills": ["Java", "Spring Boot", "PostgreSQL", "REST API", "Data Structures"],
                "preferred_skills": ["Docker", "System Design", "Redis"],
                "description": "Develop scalable backend services and APIs",
                "salary_range": "₹6-18 LPA"
            },
            {
                "title": "Full Stack Developer",
                "domain": "Full Stack",
                "branch": "CSE",
                "required_skills": ["JavaScript", "React", "Node.js", "REST API", "PostgreSQL"],
                "preferred_skills": ["TypeScript", "Docker"],
                "description": "Build end-to-end web applications",
                "salary_range": "₹5-16 LPA"
            },
            {
                "title": "Data Scientist",
                "domain": "AI & Data Science",
                "branch": "CSE",
                "required_skills": ["Python", "Machine Learning", "Statistics", "SQL"],
                "preferred_skills": ["Deep Learning", "Spark"],
                "description": "Analyze data and build ML models",
                "salary_range": "₹6-20 LPA"
            },
            {
                "title": "Embedded Systems Engineer",
                "domain": "Embedded Systems & IoT",
                "branch": "ECE",
                "required_skills": ["C", "Embedded C", "Microcontrollers", "RTOS"],
                "preferred_skills": ["ARM Cortex", "FPGA"],
                "description": "Develop firmware for embedded devices",
                "salary_range": "₹4-14 LPA"
            },
        ]
        
        for jr in job_roles:
            job = JobRole(
                title=jr["title"],
                domain=jr["domain"],
                branch=jr["branch"],
                required_skills=jr["required_skills"],
                preferred_skills=jr["preferred_skills"],
                description=jr["description"],
                salary_range=jr["salary_range"]
            )
            db.add(job)
        
        db.commit()
        logger.info(f"Seeded {len(base_skills)} skills and {len(job_roles)} job roles")
        
    except Exception as e:
        logger.error(f"Seeding error: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    from pathlib import Path
    import uvicorn

    backend_dir = Path(__file__).resolve().parent
    venv_dir = backend_dir / ".venv"

    uploads_dir = backend_dir / "uploads"
    uploads_dir.mkdir(exist_ok=True)

    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=8000,
        reload=settings.app_env == "development",
        reload_excludes=[
            str(venv_dir),
            str(uploads_dir),
            "*.db",
            "*.sqlite*",
            "__pycache__",
        ],
    )
