"""
CareerGPT — Roadmap.sh Repository Importer
===========================================

Scans the local developer-roadmap-master repository and imports all roadmaps
and their topic content into the CareerGPT database.

Usage:
    cd backend
    python data/career_master/scripts/roadmap_importer.py

Features:
- Idempotent: safe to run multiple times without duplicates
- Parses roadmaps/<slug>/content/*.md files
- Extracts: title, description, resources, node IDs
- Generates external URLs from slugs: https://roadmap.sh/<slug>
- Classifies roadmaps as role-based or skill-based
- Populates RoadmapSource and RoadmapTopic tables
- Seeds SourceRegistry with roadmap.sh entry
"""

import sys
import os
import re
import json
import uuid
import logging
from pathlib import Path
from datetime import datetime, timezone

# Add backend directory to path
backend_dir = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(backend_dir))

from database.connection import SessionLocal, engine
from models.models import Base, RoadmapSource, RoadmapTopic, SourceRegistry

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(name)s | %(levelname)s | %(message)s"
)
logger = logging.getLogger("roadmap_importer")

# ── Configuration ──────────────────────────────────────────────────────────
# Path to the cloned developer-roadmap-master repository
REPO_ROOT = Path(__file__).resolve().parents[5] / "developer-roadmap-master"

# Roadmap category classification
ROLE_BASED_SLUGS = {
    "frontend", "backend", "full-stack", "ai-engineer", "ai-data-scientist",
    "data-engineer", "machine-learning", "mlops", "devops", "cyber-security",
    "android", "ios", "blockchain", "game-developer", "qa", "ux-design",
    "product-manager", "product-design", "software-architect",
    "software-design-architecture", "devrel", "devsecops", "engineering-manager",
    "technical-writer", "bi-analyst", "data-analyst", "network-engineer",
    "forward-deployed-engineer", "server-side-game-developer",
    "ai-agents", "ai-product-builder", "ai-red-teaming",
    "backend-beginner", "frontend-beginner", "devops-beginner",
    "git-github-beginner",
}

# Human-friendly titles for roadmaps (override auto-generated)
TITLE_OVERRIDES = {
    "ai-engineer": "AI Engineer",
    "ai-data-scientist": "AI and Data Scientist",
    "ai-agents": "AI Agents",
    "ai-product-builder": "AI Product Builder",
    "ai-red-teaming": "AI Red Teaming",
    "full-stack": "Full Stack Developer",
    "cyber-security": "Cyber Security",
    "devops": "DevOps Engineer",
    "mlops": "MLOps Engineer",
    "data-engineer": "Data Engineer",
    "machine-learning": "Machine Learning",
    "backend-beginner": "Backend (Beginner)",
    "frontend-beginner": "Frontend (Beginner)",
    "devops-beginner": "DevOps (Beginner)",
    "git-github-beginner": "Git and GitHub (Beginner)",
    "postgresql-dba": "PostgreSQL / DBA",
    "cpp": "C++",
    "datastructures-and-algorithms": "Data Structures and Algorithms",
    "software-design-architecture": "Software Design and Architecture",
    "system-design": "System Design",
    "api-design": "API Design",
    "design-system": "Design System",
    "computer-science": "Computer Science",
    "ruby-on-rails": "Ruby on Rails",
    "react-native": "React Native",
    "swift-ui": "SwiftUI",
    "aspnet-core": "ASP.NET Core",
    "spring-boot": "Spring Boot",
    "shell-bash": "Shell / Bash",
    "git-github": "Git and GitHub",
    "r-programming": "R Programming",
    "python-data-analysis": "Python for Data Analysis",
    "power-bi": "Power BI",
    "vibe-coding": "Vibe Coding",
    "claude-code": "Claude Code",
    "forward-deployed-engineer": "Forward Deployed Engineer",
    "server-side-game-developer": "Server-Side Game Developer",
    "bi-analyst": "BI Analyst",
    "data-analyst": "Data Analyst",
    "network-engineer": "Network Engineer",
    "engineering-manager": "Engineering Manager",
    "technical-writer": "Technical Writer",
    "game-developer": "Game Developer",
    "product-manager": "Product Manager",
    "product-design": "Product Design",
    "ux-design": "UX Design",
    "software-architect": "Software Architect",
}

# Tags for categorization
ROADMAP_TAGS = {
    "ai-engineer": ["ai", "machine-learning", "llm"],
    "ai-data-scientist": ["ai", "data-science", "machine-learning"],
    "ai-agents": ["ai", "agents", "llm"],
    "ai-product-builder": ["ai", "product"],
    "ai-red-teaming": ["ai", "security"],
    "machine-learning": ["ai", "machine-learning"],
    "mlops": ["ai", "devops", "machine-learning"],
    "data-engineer": ["data", "engineering"],
    "bi-analyst": ["data", "analytics"],
    "data-analyst": ["data", "analytics"],
    "devops": ["devops", "cloud", "infrastructure"],
    "devsecops": ["devops", "security"],
    "cyber-security": ["security", "networking"],
    "network-engineer": ["networking", "infrastructure"],
    "frontend": ["frontend", "web"],
    "backend": ["backend", "web"],
    "full-stack": ["frontend", "backend", "web"],
    "android": ["mobile", "android"],
    "ios": ["mobile", "ios"],
    "react-native": ["mobile", "react"],
    "flutter": ["mobile"],
    "blockchain": ["blockchain", "web3"],
    "game-developer": ["game", "graphics"],
    "server-side-game-developer": ["game", "backend"],
    "react": ["frontend", "javascript"],
    "nextjs": ["frontend", "javascript"],
    "angular": ["frontend", "javascript"],
    "vue": ["frontend", "javascript"],
    "nodejs": ["backend", "javascript"],
    "javascript": ["language", "web"],
    "typescript": ["language", "web"],
    "python": ["language", "ai"],
    "java": ["language", "backend"],
    "cpp": ["language", "systems"],
    "c": ["language", "systems"],
    "rust": ["language", "systems"],
    "golang": ["language", "backend"],
    "docker": ["devops", "containers"],
    "kubernetes": ["devops", "containers"],
    "aws": ["cloud"],
    "terraform": ["devops", "infrastructure"],
    "sql": ["database"],
    "postgresql-dba": ["database"],
    "mongodb": ["database"],
    "redis": ["database", "caching"],
    "linux": ["systems", "devops"],
    "computer-science": ["fundamentals"],
    "datastructures-and-algorithms": ["fundamentals"],
    "system-design": ["architecture"],
    "software-architect": ["architecture"],
    "software-design-architecture": ["architecture"],
}


def slugify_to_title(slug: str) -> str:
    """Convert a slug to a human-readable title."""
    if slug in TITLE_OVERRIDES:
        return TITLE_OVERRIDES[slug]
    return slug.replace("-", " ").title()


def classify_roadmap(slug: str) -> str:
    """Return 'role-based', 'skill-based', or 'technology'."""
    if slug in ROLE_BASED_SLUGS:
        return "role-based"
    # Technology-focused roadmaps
    tech_keywords = [
        "react", "nextjs", "nodejs", "python", "java", "cpp", "c",
        "javascript", "typescript", "golang", "rust", "ruby", "php",
        "swift", "kotlin", "scala", "docker", "kubernetes", "aws",
        "terraform", "sql", "mongodb", "redis", "linux", "html", "css",
        "spring", "django", "laravel", "angular", "vue", "flutter",
        "aspnet", "rails", "elasticsearch", "graphql", "r-programming",
        "power-bi", "wordpress", "shell", "git-github", "postgresql",
    ]
    for kw in tech_keywords:
        if kw in slug:
            return "technology"
    return "skill-based"


def parse_topic_file(filepath: Path) -> dict:
    """Parse a single topic .md file and extract metadata."""
    filename = filepath.stem

    # Extract topic-slug and node-id
    at_idx = filename.rfind("@")
    if at_idx >= 0:
        topic_slug = filename[:at_idx]
        node_id = filename[at_idx + 1:]
    else:
        topic_slug = filename
        node_id = ""

    content = ""
    try:
        content = filepath.read_text(encoding="utf-8", errors="replace")
    except Exception as e:
        logger.warning(f"Could not read {filepath}: {e}")
        return {}

    lines = content.split("\n")
    title = ""
    description_lines = []
    resources = []
    in_resources = False

    for line in lines:
        stripped = line.strip()
        if stripped.startswith("# ") and not title:
            title = stripped[2:].strip()
        elif stripped.lower().startswith("visit the following"):
            in_resources = True
        elif in_resources and stripped.startswith("- "):
            resource = parse_resource_line(stripped)
            if resource:
                resources.append(resource)
        elif not in_resources and stripped and not stripped.startswith("#"):
            description_lines.append(stripped)

    description = " ".join(description_lines).strip()
    if not title:
        title = slugify_to_title(topic_slug)

    return {
        "topic_slug": topic_slug,
        "node_id": node_id,
        "title": title,
        "description": description[:1000] if description else "",
        "resources": resources,
    }


def parse_resource_line(line: str):
    """Parse a markdown resource line like: - [@article@Title](url)"""
    # Match: - [@type@Title](url)
    pattern = r"- \[@?([a-z]+)@(.+?)\]\((.+?)\)"
    m = re.match(pattern, line)
    if m:
        return {"type": m.group(1), "title": m.group(2).strip(), "url": m.group(3).strip()}

    # Simpler pattern: - [Title](url)
    pattern2 = r"- \[(.+?)\]\((.+?)\)"
    m2 = re.match(pattern2, line)
    if m2:
        return {"type": "link", "title": m2.group(1).strip(), "url": m2.group(2).strip()}

    return None


def import_roadmaps(db):
    """Main import function — scans repo, imports all roadmaps."""
    roadmaps_dir = REPO_ROOT / "roadmaps"

    if not roadmaps_dir.exists():
        logger.error(f"Roadmaps directory not found: {roadmaps_dir}")
        return 0

    roadmap_dirs = [d for d in roadmaps_dir.iterdir() if d.is_dir()]
    logger.info(f"Found {len(roadmap_dirs)} roadmap directories")

    imported_count = 0
    updated_count = 0

    for rdir in sorted(roadmap_dirs):
        slug = rdir.name
        content_dir = rdir / "content"

        if not content_dir.exists():
            continue

        topic_files = list(content_dir.glob("*.md"))
        if not topic_files:
            continue

        title = slugify_to_title(slug)
        category = classify_roadmap(slug)
        external_url = f"https://roadmap.sh/{slug}"
        tags = ROADMAP_TAGS.get(slug, [])

        existing_source = db.query(RoadmapSource).filter(RoadmapSource.slug == slug).first()

        if existing_source:
            existing_source.title = title
            existing_source.category = category
            existing_source.external_url = external_url
            existing_source.tags = tags
            existing_source.local_path = str(rdir)
            existing_source.last_imported = datetime.now(timezone.utc)
            existing_source.topic_count = len(topic_files)
            source = existing_source
            updated_count += 1
        else:
            source = RoadmapSource(
                provider="roadmap.sh",
                slug=slug,
                title=title,
                category=category,
                external_url=external_url,
                local_path=str(rdir),
                tags=tags,
                topic_count=len(topic_files),
                last_imported=datetime.now(timezone.utc),
                is_active=True,
            )
            db.add(source)
            db.flush()
            imported_count += 1

        _import_topics(db, source, topic_files)
        logger.info(f"  {'Updated' if existing_source else 'Imported'}: [{category}] {slug} ({len(topic_files)} topics)")

    db.commit()
    logger.info(f"Import complete: {imported_count} new + {updated_count} updated roadmaps")
    return imported_count + updated_count


def _import_topics(db, source, topic_files):
    """Import all topic files for a single roadmap source using bulk insert."""
    # Get existing topic slugs for this source (just the slugs for dedup check)
    existing_slugs = set(
        row[0] for row in
        db.query(RoadmapTopic.topic_slug).filter(RoadmapTopic.source_id == source.id).all()
    )

    # Parse and deduplicate topics
    topics_by_slug = {}
    for tf in topic_files:
        parsed = parse_topic_file(tf)
        if parsed:
            tslug = parsed["topic_slug"]
            if tslug not in topics_by_slug:
                topics_by_slug[tslug] = parsed

    # Build new topics list (skip existing)
    new_topics = []
    for order_idx, (tslug, parsed) in enumerate(topics_by_slug.items()):
        if tslug not in existing_slugs:
            new_topics.append({
                "id": str(uuid.uuid4()),
                "source_id": source.id,
                "node_id": parsed.get("node_id", ""),
                "topic_slug": tslug,
                "title": parsed["title"],
                "description": parsed.get("description", ""),
                "resources": json.dumps(parsed.get("resources", [])),
                "order_index": order_idx,
                "prerequisites": json.dumps([]),
            })

    # Bulk insert all new topics in a single statement
    if new_topics:
        db.execute(
            RoadmapTopic.__table__.insert(),
            new_topics
        )

def seed_source_registry(db):
    """Seed the SourceRegistry with known sources."""
    sources = [
        {"name": "roadmap.sh", "source_type": "open-source",
         "url": "https://roadmap.sh/", "local_path": str(REPO_ROOT),
         "status": "active", "notes": "Local clone of developer-roadmap GitHub repo"},
        {"name": "NPTEL", "source_type": "academic", "url": "https://nptel.ac.in/", "status": "active"},
        {"name": "AICTE", "source_type": "official", "url": "https://www.aicte-india.org/", "status": "active"},
        {"name": "Microsoft Learn", "source_type": "vendor", "url": "https://learn.microsoft.com/", "status": "active"},
        {"name": "Google Cloud Skills Boost", "source_type": "vendor",
         "url": "https://www.cloudskillsboost.google/", "status": "active"},
        {"name": "AWS Skill Builder", "source_type": "vendor",
         "url": "https://skillbuilder.aws/", "status": "active"},
        {"name": "O*NET", "source_type": "official", "url": "https://www.onetonline.org/", "status": "active"},
        {"name": "ESCO", "source_type": "official", "url": "https://esco.ec.europa.eu/", "status": "active"},
        {"name": "NIST NICE", "source_type": "official", "url": "https://www.nist.gov/nice", "status": "active"},
        {"name": "MathWorks", "source_type": "vendor", "url": "https://www.mathworks.com/", "status": "active"},
        {"name": "Arm Developer", "source_type": "vendor", "url": "https://developer.arm.com/", "status": "active"},
    ]

    for src in sources:
        existing = db.query(SourceRegistry).filter(SourceRegistry.name == src["name"]).first()
        if existing:
            existing.last_imported = datetime.now(timezone.utc)
            if "local_path" in src:
                existing.local_path = src["local_path"]
        else:
            db.add(SourceRegistry(**src))

    db.commit()
    logger.info(f"SourceRegistry seeded with {len(sources)} sources")


def main():
    """Run the roadmap importer."""
    logger.info("=" * 60)
    logger.info("CareerGPT — Roadmap.sh Repository Importer")
    logger.info("=" * 60)
    logger.info(f"Repository path: {REPO_ROOT}")

    # Ensure tables exist
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        seed_source_registry(db)
        count = import_roadmaps(db)
        logger.info(f"Total processed: {count} roadmaps")
    except Exception as e:
        logger.error(f"Import failed: {e}", exc_info=True)
        db.rollback()
        raise
    finally:
        db.close()

    logger.info("=" * 60)
    logger.info("Import complete.")
    logger.info("=" * 60)


if __name__ == "__main__":
    main()
