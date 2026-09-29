"""
CareerGPT — Master Excel Dataset Importer
==========================================

Reads CareerGPT_Master_All_Tracks_Learning_Roadmap.xlsx and imports
all structured data into the CareerGPT database.

Sheets processed:
  - Track_Master       → Branch/Domain/Track/Role mappings
  - Domain_Master      → Domain catalogue per branch
  - Technology_Master  → Technology prerequisites and families
  - Learning_Roadmap   → Stage-ordered learning steps per track
  - Prerequisite_Graph → Skill dependency graph edges
  - Role_Requirements  → Role competencies and evidence requirements
  - RoadmapSH_Current  → roadmap.sh roadmap catalogue

Usage:
    cd backend
    python data/career_master/scripts/import_master_roadmap.py

Idempotent: safe to run multiple times without creating duplicates.
"""

import sys
import os
import json
import logging
from pathlib import Path
from datetime import datetime, timezone

backend_dir = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(backend_dir))

try:
    import openpyxl
except ImportError:
    print("ERROR: openpyxl not installed. Run: pip install openpyxl")
    sys.exit(1)

from database.connection import SessionLocal, engine
from models.models import (
    Base, Skill, SkillDependency, JobRole, RoadmapSource
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(name)s | %(levelname)s | %(message)s"
)
logger = logging.getLogger("excel_importer")

# ── Locate Excel file ──────────────────────────────────────────────────────
# Search in parent directories
def find_excel():
    candidates = [
        Path(__file__).resolve().parents[5] / "CareerGPT_Master_All_Tracks_Learning_Roadmap (1).xlsx",
        Path(__file__).resolve().parents[5] / "CareerGPT_Master_All_Tracks_Learning_Roadmap.xlsx",
    ]
    for c in candidates:
        if c.exists():
            return c
    return None


# ── Helpers ────────────────────────────────────────────────────────────────

def read_sheet(wb, sheet_name: str) -> list[dict]:
    """Read a sheet and return rows as list of dicts keyed by header."""
    if sheet_name not in wb.sheetnames:
        logger.warning(f"Sheet '{sheet_name}' not found")
        return []
    ws = wb[sheet_name]
    rows = list(ws.iter_rows(values_only=True))
    if not rows:
        return []
    headers = [str(h).strip() if h else "" for h in rows[0]]
    result = []
    for row in rows[1:]:
        if not any(row):  # skip empty rows
            continue
        d = {}
        for h, v in zip(headers, row):
            if h:
                d[h] = str(v).strip() if v is not None else ""
        result.append(d)
    return result


def normalize_branch(b: str) -> str:
    """Normalize branch names."""
    mapping = {
        "CSE / IT": "CSE",
        "CSE": "CSE",
        "ECE": "ECE",
        "EEE": "EEE",
        "Mechanical": "Mechanical",
        "Civil": "Civil",
        "Chemical": "Chemical",
        "Biotechnology / Biomedical": "Biotechnology",
        "Aerospace / Aeronautical": "Aerospace",
        "Automotive": "Automotive",
        "Mechatronics / Robotics": "Mechatronics",
        "Instrumentation & Control": "Instrumentation",
        "Metallurgy / Materials": "Metallurgy",
        "Mining": "Mining",
        "Textile": "Textile",
        "Agricultural / Food Technology": "Agricultural",
    }
    return mapping.get(b.strip(), b.strip())


# ── Importers ──────────────────────────────────────────────────────────────

def import_skills_from_technology_master(db, rows: list[dict]) -> dict:
    """Import Technology_Master sheet into the Skill table.
    Returns a dict mapping technology_name -> skill_id.
    """
    skill_map = {}
    imported = 0
    skipped = 0

    for row in rows:
        name = row.get("Technology", "").strip()
        if not name:
            continue

        family = row.get("Family", "").strip()
        prereqs_raw = row.get("Prerequisites", "").strip()
        tracks_raw = row.get("Relevant Track Families", "").strip()
        description = row.get("Learning Focus", "").strip()

        # Determine category from family
        cat_map = {
            "Web": "framework", "Database": "tool", "AI/ML": "concept",
            "DevOps": "tool", "Cloud": "tool", "Language": "language",
            "Systems": "concept", "Mobile": "framework",
        }
        category = cat_map.get(family, "concept")

        existing = db.query(Skill).filter(Skill.name == name).first()
        if existing:
            skipped += 1
            skill_map[name] = existing.id
            continue

        import uuid
        skill_id = str(uuid.uuid4())
        skill = Skill(
            id=skill_id,
            name=name,
            category=category,
            branch="cross",
            domain=family,
            description=description,
            aliases=[],
            related_roles=[r.strip() for r in tracks_raw.split(";") if r.strip()],
        )
        db.add(skill)
        skill_map[name] = skill_id
        imported += 1

    db.flush()
    logger.info(f"Technology_Master: {imported} new skills, {skipped} existing")
    return skill_map


def import_skill_dependencies(db, rows: list[dict], skill_map: dict):
    """Import Prerequisite_Graph sheet into SkillDependency table."""
    imported = 0

    for row in rows:
        from_node = row.get("From Node", "").strip()
        to_node = row.get("To Node", "").strip()
        relation = row.get("Relation", "prerequisite").strip()

        if not from_node or not to_node:
            continue

        # Ensure skills exist (create if missing)
        from_id = skill_map.get(from_node)
        to_id = skill_map.get(to_node)

        import uuid
        if not from_id:
            # Check in DB
            s = db.query(Skill).filter(Skill.name == from_node).first()
            if not s:
                s = Skill(id=str(uuid.uuid4()), name=from_node, category="concept",
                          branch="cross", aliases=[], related_roles=[])
                db.add(s)
                db.flush()
            from_id = s.id
            skill_map[from_node] = from_id

        if not to_id:
            s = db.query(Skill).filter(Skill.name == to_node).first()
            if not s:
                s = Skill(id=str(uuid.uuid4()), name=to_node, category="concept",
                          branch="cross", aliases=[], related_roles=[])
                db.add(s)
                db.flush()
            to_id = s.id
            skill_map[to_node] = to_id

        # Check if dependency already exists
        existing = db.query(SkillDependency).filter(
            SkillDependency.skill_id == to_id,
            SkillDependency.depends_on_id == from_id
        ).first()

        if not existing:
            dep = SkillDependency(
                id=str(uuid.uuid4()),
                skill_id=to_id,      # "React" depends on "JavaScript"
                depends_on_id=from_id,
                relation_type=relation,
            )
            db.add(dep)
            imported += 1

    db.flush()
    logger.info(f"Prerequisite_Graph: {imported} dependencies imported")


def import_job_roles(db, rows: list[dict]):
    """Import Role_Requirements sheet into JobRole table."""
    imported = 0
    skipped = 0

    for row in rows:
        title = row.get("Track / Role", "").strip()
        branch_raw = row.get("Branch", "CSE / IT").strip()
        domain = row.get("Domain", "").strip()
        languages_raw = row.get("Languages", "").strip()
        competencies_raw = row.get("Key Competencies", "").strip()
        techs_raw = row.get("Technologies / Tools", "").strip()

        if not title:
            continue

        branch = normalize_branch(branch_raw)

        # Check if already exists
        existing = db.query(JobRole).filter(
            JobRole.title == title,
            JobRole.branch == branch
        ).first()

        if existing:
            skipped += 1
            continue

        required_skills = [s.strip() for s in competencies_raw.split(";") if s.strip()]
        preferred_skills = [s.strip() for s in techs_raw.split(",") if s.strip()]

        import uuid
        job = JobRole(
            id=str(uuid.uuid4()),
            title=title,
            domain=domain,
            branch=branch,
            required_skills=required_skills,
            preferred_skills=preferred_skills,
            description=f"{title} role in {domain} domain",
            companies=[],
            is_active=True,
        )
        db.add(job)
        imported += 1

    db.flush()
    logger.info(f"Role_Requirements: {imported} new roles, {skipped} existing")


def build_career_index(db, track_rows: list[dict], domain_rows: list[dict]) -> dict:
    """Build in-memory index of branch->domain->tracks for the API.
    Saves to a JSON file for the RoadmapEngine to consume.
    """
    index = {}

    for row in track_rows:
        branch_raw = row.get("Branch", "").strip()
        domain = row.get("Domain", "").strip()
        track = row.get("Track / Role", "").strip()
        langs_raw = row.get("Languages", "").strip()
        techs_raw = row.get("Core Technologies / Tools", "").strip()
        career_family = row.get("Career Family", "").strip()

        if not branch_raw or not track:
            continue

        branch = normalize_branch(branch_raw)

        if branch not in index:
            index[branch] = {}
        if domain not in index[branch]:
            index[branch][domain] = {"tracks": [], "career_family": career_family}

        index[branch][domain]["tracks"].append({
            "title": track,
            "languages": [l.strip() for l in langs_raw.split("/") if l.strip()],
            "technologies": [t.strip() for t in techs_raw.split(",") if t.strip()],
        })

    # Save to career_index.json for backend consumption
    output_path = Path(__file__).resolve().parents[2] / "career_index.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(index, f, indent=2, ensure_ascii=False)

    logger.info(f"Career index saved to: {output_path}")
    logger.info(f"  Branches: {list(index.keys())}")

    return index


def save_learning_roadmap(rows: list[dict]):
    """Save the Learning_Roadmap sheet as structured JSON for API consumption."""
    roadmap_data = {}

    for row in rows:
        branch_raw = row.get("Branch", "").strip()
        domain = row.get("Domain", "").strip()
        track = row.get("Track / Role", "").strip()
        stage = row.get("Stage", "").strip()
        order_str = row.get("Order", "0").strip()
        learning_area = row.get("Learning Area", "").strip()
        what_to_learn = row.get("What to Learn", "").strip()
        est_hours_str = row.get("Est. Hours", "20").strip()
        prerequisite = row.get("Prerequisite", "").strip()
        source_layer = row.get("Source Layer", "").strip()

        if not track or not learning_area:
            continue

        branch = normalize_branch(branch_raw)
        key = f"{branch}::{domain}::{track}"

        if key not in roadmap_data:
            roadmap_data[key] = {
                "branch": branch,
                "domain": domain,
                "track": track,
                "stages": {}
            }

        if stage not in roadmap_data[key]["stages"]:
            roadmap_data[key]["stages"][stage] = []

        try:
            order = int(order_str)
        except Exception:
            order = 0
        try:
            est_hours = int(float(est_hours_str))
        except Exception:
            est_hours = 20

        roadmap_data[key]["stages"][stage].append({
            "order": order,
            "learning_area": learning_area,
            "what_to_learn": what_to_learn,
            "est_hours": est_hours,
            "prerequisite": prerequisite,
            "source": source_layer,
        })

    # Sort each stage by order
    for key in roadmap_data:
        for stage in roadmap_data[key]["stages"]:
            roadmap_data[key]["stages"][stage].sort(key=lambda x: x["order"])

    output_path = Path(__file__).resolve().parents[2] / "learning_roadmap.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(roadmap_data, f, indent=2, ensure_ascii=False)

    logger.info(f"Learning roadmap saved ({len(roadmap_data)} tracks) to: {output_path}")
    return roadmap_data


def main():
    excel_path = find_excel()
    if not excel_path:
        logger.error("Excel file not found!")
        logger.error("Expected: CareerGPT_Master_All_Tracks_Learning_Roadmap (1).xlsx")
        sys.exit(1)

    logger.info("=" * 60)
    logger.info("CareerGPT — Master Excel Dataset Importer")
    logger.info("=" * 60)
    logger.info(f"Reading: {excel_path}")

    # Ensure tables exist
    Base.metadata.create_all(bind=engine)

    # Load workbook
    wb = openpyxl.load_workbook(str(excel_path), read_only=True, data_only=True)

    # Read all sheets
    track_rows = read_sheet(wb, "Track_Master")
    domain_rows = read_sheet(wb, "Domain_Master")
    tech_rows = read_sheet(wb, "Technology_Master")
    learning_rows = read_sheet(wb, "Learning_Roadmap")
    prereq_rows = read_sheet(wb, "Prerequisite_Graph")
    role_rows = read_sheet(wb, "Role_Requirements")

    logger.info(f"Track_Master: {len(track_rows)} rows")
    logger.info(f"Domain_Master: {len(domain_rows)} rows")
    logger.info(f"Technology_Master: {len(tech_rows)} rows")
    logger.info(f"Learning_Roadmap: {len(learning_rows)} rows")
    logger.info(f"Prerequisite_Graph: {len(prereq_rows)} rows")
    logger.info(f"Role_Requirements: {len(role_rows)} rows")

    db = SessionLocal()
    try:
        # 1. Import skills from Technology_Master
        skill_map = import_skills_from_technology_master(db, tech_rows)

        # 2. Import prerequisite graph edges
        import_skill_dependencies(db, prereq_rows, skill_map)

        # 3. Import job roles
        import_job_roles(db, role_rows)

        db.commit()
        logger.info("Database import complete")

        # 4. Build and save career index JSON (for RoadmapEngine)
        build_career_index(db, track_rows, domain_rows)

        # 5. Save learning roadmap JSON (for API)
        save_learning_roadmap(learning_rows)

    except Exception as e:
        logger.error(f"Import failed: {e}", exc_info=True)
        db.rollback()
        raise
    finally:
        db.close()

    logger.info("=" * 60)
    logger.info("Excel import complete.")
    logger.info("=" * 60)


if __name__ == "__main__":
    main()
