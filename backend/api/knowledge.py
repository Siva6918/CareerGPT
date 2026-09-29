"""CareerGPT — Knowledge Base API"""
from fastapi import APIRouter
import json
from pathlib import Path

router = APIRouter()
DATA_DIR = Path(__file__).resolve().parent.parent / "data" / "roadmaps"

@router.get("/languages")
async def get_languages():
    lang_file = DATA_DIR / "languages.json"
    if lang_file.exists():
        try:
            with open(lang_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                return {"languages": data}
        except Exception:
            pass
    return {
        "languages": [
            {"id": "python", "name": "Python", "domains": ["AI & Data Science", "Backend Engineering", "Data Engineering"]},
            {"id": "java", "name": "Java", "domains": ["Backend Engineering", "Android Development"]},
            {"id": "javascript", "name": "JavaScript", "domains": ["Frontend Engineering", "Full Stack Development"]},
            {"id": "typescript", "name": "TypeScript", "domains": ["Frontend Engineering", "Full Stack Development"]},
            {"id": "c", "name": "C", "domains": ["Embedded Systems & IoT", "VLSI"]},
            {"id": "cpp", "name": "C++", "domains": ["Embedded Systems", "Game Development", "AI"]},
            {"id": "csharp", "name": "C#", "domains": ["Full Stack Development", "Game Development"]},
            {"id": "go", "name": "Go", "domains": ["Backend Engineering", "DevOps & Cloud"]},
            {"id": "rust", "name": "Rust", "domains": ["Systems Programming", "Embedded"]},
            {"id": "kotlin", "name": "Kotlin", "domains": ["Android Development"]},
            {"id": "verilog", "name": "Verilog", "domains": ["VLSI Design & Verification"]},
            {"id": "vhdl", "name": "VHDL", "domains": ["VLSI Design & Verification"]},
            {"id": "matlab", "name": "MATLAB", "domains": ["Signal Processing", "Power Systems", "Control Systems"]},
            {"id": "r", "name": "R", "domains": ["Data Science", "Bioinformatics"]},
            {"id": "sql", "name": "SQL", "domains": ["Data Engineering", "Backend Engineering"]},
        ]
    }


@router.get("/technologies")
async def get_technologies():
    tech_file = DATA_DIR / "technologies.json"
    if tech_file.exists():
        try:
            with open(tech_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                return {"technologies": data}
        except Exception:
            pass
    return {
        "technologies": [
            {"id": "spring_boot", "name": "Spring Boot", "domain": "Backend Engineering", "language": "Java"},
            {"id": "fastapi", "name": "FastAPI", "domain": "Backend Engineering", "language": "Python"},
            {"id": "django", "name": "Django", "domain": "Backend Engineering", "language": "Python"},
            {"id": "flask", "name": "Flask", "domain": "Backend Engineering", "language": "Python"},
            {"id": "nodejs", "name": "Node.js", "domain": "Backend Engineering", "language": "JavaScript"},
            {"id": "react", "name": "React", "domain": "Frontend Engineering", "language": "JavaScript"},
            {"id": "docker", "name": "Docker", "domain": "DevOps & Cloud"},
            {"id": "kubernetes", "name": "Kubernetes", "domain": "DevOps & Cloud"},
            {"id": "pytorch", "name": "PyTorch", "domain": "AI & Data Science", "language": "Python"},
            {"id": "tensorflow", "name": "TensorFlow", "domain": "AI & Data Science", "language": "Python"},
        ]
    }


