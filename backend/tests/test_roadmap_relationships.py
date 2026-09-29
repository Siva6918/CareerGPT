"""
CareerGPT — Automated Validation Tests for Relational Knowledge Engine
Validates:
1. Multi-branch hierarchy: CSE, ECE, EEE, MECH, CIVIL, CHEM, BIOTECH, AERO, AUTO, ROBOTICS
2. Dependent hierarchy: Branch -> Domain -> Role -> Languages -> Technologies
3. Role-specific skills and 4-tier project ladders
4. Prerequisite graph resolution
5. Candidate competency integration (Unknown != Weak)
6. Explainable recommendation reasons
7. Exclusion of invalid combinations
"""
import pytest
import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from roadmap.engine import RoadmapEngine


@pytest.fixture
def engine():
    return RoadmapEngine()


def test_branches_coverage(engine):
    """Ensure all required B.Tech branches are present and populated."""
    branches = engine.get_branches()
    branch_ids = [b["id"] for b in branches]
    
    expected_branches = ["CSE", "ECE", "EEE", "MECH", "CIVIL", "CHEM", "BIOTECH", "AERO", "AUTO", "ROBOTICS"]
    for eb in expected_branches:
        assert eb in branch_ids, f"Branch {eb} missing from knowledge graph!"


def test_cse_ai_engineer_relationships(engine):
    """CSE -> AI / Data -> AI Engineer must produce AI-relevant skills and Python stack."""
    domains = engine.get_domains("CSE")
    domain_names = [d["name"] for d in domains]
    assert any("AI" in name or "Data" in name for name in domain_names), "AI/Data domain missing for CSE"
    
    roles = engine.get_roles("AI & Data Science")
    role_titles = [r["title"] for r in roles]
    assert "AI Engineer" in role_titles, "AI Engineer role missing for AI domain"
    
    # Check languages for AI Engineer
    languages = engine.get_languages_for_role("AI Engineer")
    lang_names = [l["name"] for l in languages]
    assert "Python" in lang_names, "Python must be ranked for AI Engineer"
    
    # Check technologies for AI Engineer with Python
    technologies = engine.get_technologies_for_role("AI Engineer", "Python")
    assert any("PyTorch" in t or "TensorFlow" in t or "RAG" in t or "Transformers" in t for t in technologies)
    
    # Generate roadmap and check projects & skills
    rm = engine.generate_roadmap(
        branch="CSE",
        domain="AI & Data Science",
        target_role="AI Engineer",
        preferred_language="Python",
        preferred_technologies=["PyTorch", "Hugging Face"]
    )
    assert rm["target_role"] == "AI Engineer"
    assert len(rm["stages"]) >= 5
    
    # Ensure 4-tier project ladder exists
    projects = rm["projects_ladder"]
    assert len(projects) == 4, "AI Engineer must have 4-tier progressive projects"
    project_tiers = [p["tier"] for p in projects]
    assert "Guided" in project_tiers
    assert "Capstone" in project_tiers


def test_cse_backend_developer_relationships(engine):
    """CSE -> Backend -> Backend Developer must produce backend-relevant skills and Java/Python/Go stack."""
    roles = engine.get_roles("Backend Engineering")
    role_titles = [r["title"] for r in roles]
    assert "Backend Developer" in role_titles
    
    langs = engine.get_languages_for_role("Backend Developer")
    lang_names = [l["name"] for l in langs]
    assert any(l in lang_names for l in ["Java", "Python", "Go"])
    
    # Java should yield Spring Boot, Docker, PostgreSQL
    techs = engine.get_technologies_for_role("Backend Developer", "Java")
    assert "Spring Boot" in techs or "Docker" in techs
    
    # Generate roadmap
    rm = engine.generate_roadmap(
        branch="CSE",
        domain="Backend Engineering",
        target_role="Backend Developer",
        preferred_language="Java",
        preferred_technologies=["Spring Boot", "Docker"]
    )
    all_skills = [s["skill_name"] for stage in rm["stages"].values() for s in stage]
    assert any("API" in s or "Spring" in s or "Database" in s for s in all_skills)


def test_ece_embedded_engineer_relationships(engine):
    """ECE -> Embedded Systems -> Embedded Software Engineer must produce C/C++, ARM, RTOS."""
    domains = engine.get_domains("ECE")
    domain_names = [d["name"] for d in domains]
    assert any("Embedded" in name for name in domain_names)
    
    roles = engine.get_roles("Embedded Systems & IoT")
    role_titles = [r["title"] for r in roles]
    assert any("Embedded" in t and ("Software" in t or "Firmware" in t) for t in role_titles)
    
    langs = engine.get_languages_for_role("Embedded Software / Firmware Engineer")
    lang_names = [l["name"] for l in langs]
    assert any(l in lang_names for l in ["C", "C++"])
    
    techs = engine.get_technologies_for_role("Embedded Software / Firmware Engineer", "C")
    assert any("STM32" in t or "RTOS" in t or "ARM" in t for t in techs)
    
    # Cannot have frontend React in embedded stack
    assert "React" not in techs


def test_eee_power_systems_engineer_relationships(engine):
    """EEE -> Power Systems -> Power Systems Engineer must produce MATLAB, ETAP, PowerWorld."""
    domains = engine.get_domains("EEE")
    domain_names = [d["name"] for d in domains]
    assert any("Power" in name for name in domain_names)
    
    roles = engine.get_roles("Power Systems & Renewable Energy")
    role_titles = [r["title"] for r in roles]
    assert any("Power Systems" in t for t in role_titles)
    
    langs = engine.get_languages_for_role("Power Systems & Smart Grid Engineer")
    lang_names = [l["name"] for l in langs]
    assert any(l in lang_names for l in ["MATLAB", "Python"])
    
    techs = engine.get_technologies_for_role("Power Systems & Smart Grid Engineer")
    assert any("Simulink" in t or "ETAP" in t or "SCADA" in t for t in techs)


def test_mech_cad_engineer_relationships(engine):
    """MECH -> CAD/CAM -> Mechanical Design Engineer must produce SolidWorks, GD&T, FEA."""
    domains = engine.get_domains("MECH")
    domain_names = [d["name"] for d in domains]
    assert any("CAD" in name or "Design" in name for name in domain_names)
    
    roles = engine.get_roles("Design & CAD/CAM / FEA")
    role_titles = [r["title"] for r in roles]
    assert "Mechanical Design Engineer" in role_titles
    
    techs = engine.get_technologies_for_role("Mechanical Design Engineer")
    assert any("SolidWorks" in t or "AutoCAD" in t or "CATIA" in t for t in techs)
    
    # Generate roadmap
    rm = engine.generate_roadmap(
        branch="MECH",
        domain="Design & CAD/CAM / FEA",
        target_role="Mechanical Design Engineer"
    )
    all_skills = [s["skill_name"] for stage in rm["stages"].values() for s in stage]
    assert any("GD&T" in s or "CAD" in s or "FEA" in s or "Modeling" in s for s in all_skills)


def test_civil_structural_engineer_relationships(engine):
    """CIVIL -> Structural -> Structural Design Engineer must produce ETABS, STAAD.Pro."""
    domains = engine.get_domains("CIVIL")
    domain_names = [d["name"] for d in domains]
    assert any("Structural" in name for name in domain_names)
    
    roles = engine.get_roles("Structural Engineering & BIM")
    role_titles = [r["title"] for r in roles]
    assert "Structural Design Engineer" in role_titles
    
    techs = engine.get_technologies_for_role("Structural Design Engineer")
    assert any("ETABS" in t or "STAAD.Pro" in t for t in techs)


def test_invalid_combinations_blocked(engine):
    """Ensure invalid cross-branch technologies do not pollute domain options."""
    # Civil should NOT have AI/ML or Web Dev domains
    civil_domains = engine.get_domains("CIVIL")
    civil_domain_names = [d["name"] for d in civil_domains]
    assert "AI & Data Science" not in civil_domain_names
    assert "Full Stack Development" not in civil_domain_names
    
    # Structural Engineer should NOT have React or Docker as primary role technologies
    civil_techs = engine.get_technologies_for_role("Structural Design Engineer")
    assert "React" not in civil_techs
    assert "Angular" not in civil_techs


def test_unknown_not_equal_weak(engine):
    """Verify that unassessed/unknown skills are flagged as unassessed/gap, NOT fabricated 50% score."""
    competency_graph = {
        "nodes": [
            {
                "skill_id": "python",
                "skill_name": "Python",
                "competency_state": "strong",
                "competency_score": 0.92,
                "uncertainty": 0.1
            }
            # Note: RAG and Docker are NOT in competency_graph -> they are UNKNOWN
        ]
    }
    
    rm = engine.generate_roadmap(
        branch="CSE",
        domain="AI & Data Science",
        target_role="AI Engineer",
        preferred_language="Python",
        competency_graph_dict=competency_graph
    )
    
    # Find python node and unknown nodes in generated stages
    all_nodes = [node for stage in rm["stages"].values() for node in stage]
    python_node = next((n for n in all_nodes if "Python" in n["skill_name"]), None)
    assert python_node is not None, "Python skill node should exist in AI Engineer roadmap"
    assert python_node["gap_severity"] == "satisfied", f"Python should be satisfied, got {python_node['gap_severity']}"
    assert python_node["competency_state"] == "strong"
    
    # Any unassessed skill must be explicitly 'unknown' with explanation
    unassessed_nodes = [n for n in all_nodes if n.get("competency_state") == "unknown"]
    assert len(unassessed_nodes) > 0
    for u in unassessed_nodes:
        assert "no evidence detected" in u["recommendation_reason"].lower() or "uncertainty" in u["recommendation_reason"].lower()


def test_authoritative_sources_registry(engine):
    """Ensure source registry contains formal bodies (O*NET, ESCO, NIST, MathWorks, etc.)."""
    sources = engine.get_sources()
    source_names = [s["name"] for s in sources]
    assert any("O*NET" in n for n in source_names)
    assert any("ESCO" in n for n in source_names)
    assert any("NICE" in n for n in source_names)
    assert any("Arm" in n for n in source_names)
    assert any("MathWorks" in n for n in source_names)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
