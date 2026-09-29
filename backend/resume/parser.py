"""
CareerGPT — Resume Parser and Skill Extractor

Pipeline:
Resume (PDF/DOCX)
 → Text extraction
 → Section detection
 → Skill extraction
 → Project extraction
 → Experience extraction
 → Education extraction
 → Competency mapping
"""
import logging
import re
import json
from typing import Dict, List, Optional, Tuple
from pathlib import Path
import os

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────
# SKILL TAXONOMY (normalized skill names)
# ─────────────────────────────────────────────────────────────

SKILL_TAXONOMY = {
    # Programming Languages
    "python": ["python", "python3", "py"],
    "java": ["java", "java8", "java11", "java17", "j2ee", "jvm"],
    "javascript": ["javascript", "js", "es6", "es2015", "ecmascript"],
    "typescript": ["typescript", "ts"],
    "c": ["c programming", "c language", "c99"],
    "cpp": ["c++", "cpp", "c++ programming"],
    "csharp": ["c#", "c sharp", ".net", "dotnet"],
    "go": ["golang", "go programming"],
    "rust": ["rust", "rust programming"],
    "kotlin": ["kotlin"],
    "swift": ["swift"],
    "r": ["r programming", "r language"],
    "matlab": ["matlab"],
    "scala": ["scala"],
    "sql": ["sql", "mysql", "postgresql", "postgres", "sqlite", "oracle sql"],

    # Frameworks/Libraries
    "spring_boot": ["spring boot", "springboot", "spring framework", "spring mvc"],
    "django": ["django"],
    "fastapi": ["fastapi", "fast api"],
    "flask": ["flask"],
    "react": ["react", "reactjs", "react.js"],
    "angular": ["angular", "angularjs"],
    "vue": ["vue", "vuejs", "vue.js"],
    "nodejs": ["node", "nodejs", "node.js"],
    "express": ["express", "expressjs", "express.js"],
    "pytorch": ["pytorch", "torch"],
    "tensorflow": ["tensorflow", "tf"],
    "scikit_learn": ["scikit-learn", "sklearn"],
    "pandas": ["pandas"],
    "numpy": ["numpy"],

    # Databases
    "postgresql": ["postgresql", "postgres", "psql"],
    "mysql": ["mysql"],
    "mongodb": ["mongodb", "mongo"],
    "redis": ["redis"],
    "elasticsearch": ["elasticsearch", "elastic search"],
    "sqlite": ["sqlite"],

    # Cloud/DevOps
    "docker": ["docker", "dockerfile"],
    "kubernetes": ["kubernetes", "k8s"],
    "aws": ["aws", "amazon web services", "ec2", "s3", "lambda"],
    "azure": ["azure", "microsoft azure"],
    "gcp": ["gcp", "google cloud", "google cloud platform"],
    "git": ["git", "github", "gitlab", "bitbucket"],
    "cicd": ["ci/cd", "jenkins", "github actions", "gitlab ci", "travis"],

    # CS Concepts
    "data_structures": ["data structures", "dsa", "algorithms", "leetcode", "competitive programming"],
    "rest_api": ["rest api", "restful", "rest", "api design", "web api"],
    "system_design": ["system design", "distributed systems", "scalability"],
    "machine_learning": ["machine learning", "ml", "supervised learning", "classification", "regression"],
    "deep_learning": ["deep learning", "neural network", "cnn", "rnn", "lstm"],
    "nlp": ["nlp", "natural language processing", "text processing"],
    "computer_vision": ["computer vision", "image processing", "opencv"],

    # Soft Skills
    "teamwork": ["teamwork", "collaboration", "team player"],
    "communication": ["communication", "presentation", "verbal communication"],
    "leadership": ["leadership", "team lead", "mentoring"],
    "problem_solving": ["problem solving", "analytical thinking", "critical thinking"],
}

# Reverse mapping: alias -> canonical
ALIAS_TO_CANONICAL: Dict[str, str] = {}
for canonical, aliases in SKILL_TAXONOMY.items():
    for alias in aliases:
        ALIAS_TO_CANONICAL[alias.lower()] = canonical


class ResumeParser:
    """
    Full resume parsing pipeline.
    Supports PDF and DOCX formats.
    """

    SECTION_PATTERNS = {
        "education": r"(education|academic|qualification|degree|university|college|school)",
        "experience": r"(experience|employment|work history|internship|internships|professional)",
        "skills": r"(skills|technical skills|technologies|competencies|expertise|proficiencies)",
        "projects": r"(projects|personal projects|academic projects|portfolio)",
        "certifications": r"(certification|certificate|certified|achievement|award)",
        "summary": r"(summary|objective|profile|about me|overview)"
    }

    def parse(self, file_path: str) -> Dict:
        """
        Parse resume file and return structured data.
        """
        ext = Path(file_path).suffix.lower()

        if ext == ".pdf":
            raw_text = self._extract_pdf(file_path)
        elif ext in (".docx", ".doc"):
            raw_text = self._extract_docx(file_path)
        else:
            raise ValueError(f"Unsupported file format: {ext}")

        if not raw_text:
            return {"error": "Could not extract text from resume"}

        parsed = self._parse_sections(raw_text)
        parsed["raw_text"] = raw_text
        parsed["skills"] = self.extract_skills(raw_text, parsed.get("skills_section", ""))
        return parsed

    def _extract_pdf(self, path: str) -> str:
        """Extract text from PDF using PyMuPDF."""
        try:
            import pymupdf
            doc = pymupdf.open(path)
            text = ""
            for page in doc:
                text += page.get_text()
            return text
        except ImportError:
            logger.warning("pymupdf not available, trying pdfminer")
            return self._extract_pdf_fallback(path)
        except Exception as e:
            logger.error(f"PDF extraction error: {e}")
            return ""

    def _extract_pdf_fallback(self, path: str) -> str:
        """Fallback PDF extraction."""
        try:
            from pdfminer.high_level import extract_text
            return extract_text(path)
        except Exception as e:
            logger.error(f"PDF fallback extraction error: {e}")
            return ""

    def _extract_docx(self, path: str) -> str:
        """Extract text from DOCX."""
        try:
            from docx import Document
            doc = Document(path)
            return "\n".join(para.text for para in doc.paragraphs)
        except Exception as e:
            logger.error(f"DOCX extraction error: {e}")
            return ""

    def _parse_sections(self, text: str) -> Dict:
        """Detect and extract resume sections."""
        lines = text.split("\n")
        sections: Dict[str, List[str]] = {
            "education": [],
            "experience": [],
            "skills": [],
            "projects": [],
            "certifications": [],
            "summary": [],
            "other": []
        }

        current_section = "other"
        for line in lines:
            line_stripped = line.strip()
            if not line_stripped:
                continue

            # Check if this line is a section header
            detected = self._detect_section(line_stripped)
            if detected:
                current_section = detected
            else:
                sections[current_section].append(line_stripped)

        return {
            "education_section": "\n".join(sections["education"]),
            "experience_section": "\n".join(sections["experience"]),
            "skills_section": "\n".join(sections["skills"]),
            "projects_section": "\n".join(sections["projects"]),
            "certifications_section": "\n".join(sections["certifications"]),
            "summary_section": "\n".join(sections["summary"]),
            "education": self._parse_education(sections["education"]),
            "experience": self._parse_experience(sections["experience"]),
            "projects": self._parse_projects(sections["projects"]),
        }

    def _detect_section(self, line: str) -> Optional[str]:
        """Detect if a line is a section header."""
        line_lower = line.lower()
        # Section headers are typically short lines
        if len(line) > 60:
            return None

        for section, pattern in self.SECTION_PATTERNS.items():
            if re.search(pattern, line_lower):
                return section
        return None

    def _parse_education(self, lines: List[str]) -> List[Dict]:
        """Extract education entries."""
        if not lines:
            return []
        return [{"raw": "\n".join(lines[:10])}]

    def _parse_experience(self, lines: List[str]) -> List[Dict]:
        """Extract work experience entries."""
        if not lines:
            return []
        return [{"raw": "\n".join(lines[:20])}]

    def _parse_projects(self, lines: List[str]) -> List[Dict]:
        """Extract project entries."""
        if not lines:
            return []
        return [{"raw": "\n".join(lines[:20])}]

    def extract_skills(self, full_text: str, skills_section: str) -> List[Dict]:
        """
        Extract and normalize skills from resume text.
        Returns list of {skill_name, canonical_id, confidence, context}
        """
        text_lower = full_text.lower()
        found_skills = []
        seen_canonicals = set()

        for alias, canonical in ALIAS_TO_CANONICAL.items():
            if canonical in seen_canonicals:
                continue

            # Check for skill in text
            if re.search(r'\b' + re.escape(alias) + r'\b', text_lower):
                # Determine context
                context = self._find_context(text_lower, alias)

                # Higher confidence if in skills section
                in_skills_section = alias in skills_section.lower()
                confidence = 0.9 if in_skills_section else 0.7

                found_skills.append({
                    "skill_name": SKILL_TAXONOMY[canonical][0].title(),
                    "canonical_id": canonical,
                    "confidence": confidence,
                    "context": context,
                    "source_section": "skills" if in_skills_section else "general"
                })
                seen_canonicals.add(canonical)

        return found_skills

    def _find_context(self, text: str, skill: str, window: int = 50) -> str:
        """Find surrounding context for a skill mention."""
        idx = text.find(skill)
        if idx == -1:
            return ""
        start = max(0, idx - window)
        end = min(len(text), idx + len(skill) + window)
        return text[start:end].strip()


class DemoResumeParser:
    """
    Demo resume parser that returns sample data for demonstration.
    Used when DEMO_MODE=true or no actual resume uploaded.
    """

    DEMO_RESUME_DATA = {
        "raw_text": """
John Doe
B.Tech Computer Science Engineering
XYZ University, 2024

SKILLS
Java, Python, SQL, Git, HTML, CSS

EXPERIENCE
Software Intern - ABC Corp (2023)
- Developed RESTful APIs using Java and Spring Boot
- Worked with MySQL databases
- Collaborated with team using Git

PROJECTS
E-Commerce Backend System
- Built REST API using Java
- Used MySQL for data storage
- Implemented authentication

Student Grade Tracker
- Python web app using Flask
- SQLite database
- Deployed on Heroku

EDUCATION
B.Tech Computer Science - XYZ University - 2024 - CGPA 8.5
""",
        "skills": [
            {"skill_name": "Java", "canonical_id": "java", "confidence": 0.9, "source_section": "skills"},
            {"skill_name": "Python", "canonical_id": "python", "confidence": 0.9, "source_section": "skills"},
            {"skill_name": "SQL", "canonical_id": "sql", "confidence": 0.9, "source_section": "skills"},
            {"skill_name": "Git", "canonical_id": "git", "confidence": 0.9, "source_section": "skills"},
            {"skill_name": "REST API", "canonical_id": "rest_api", "confidence": 0.7, "source_section": "experience"},
        ],
        "experience_section": "Software Intern at ABC Corp - REST APIs, Java, Spring Boot, MySQL",
        "projects_section": "E-Commerce Backend, Student Grade Tracker",
        "education_section": "B.Tech Computer Science - XYZ University - 2024",
        "education": [{"institution": "XYZ University", "degree": "B.Tech CSE", "year": "2024"}],
        "experience": [{"company": "ABC Corp", "role": "Software Intern", "year": "2023"}],
        "projects": [
            {"name": "E-Commerce Backend", "tech": ["Java", "MySQL", "REST API"]},
            {"name": "Student Grade Tracker", "tech": ["Python", "Flask", "SQLite"]}
        ]
    }

    def get_demo_data(self, target_role: str = "Backend Developer") -> Dict:
        """Return contextually appropriate demo resume data."""
        return self.DEMO_RESUME_DATA.copy()
