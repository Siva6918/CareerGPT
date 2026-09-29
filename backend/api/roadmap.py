"""CareerGPT — Roadmap API"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional, Dict, Any

from database.connection import get_db
from api.auth import get_current_user
from models.models import User, Roadmap, RoadmapNode, RoadmapStage, CompetencyNode
from roadmap.engine import RoadmapEngine

router = APIRouter()


class RoadmapRequest(BaseModel):
    branch: str = "CSE"
    domain: str = "Backend Engineering"
    target_role: str = "Backend Developer"
    preferred_language: str = "Java"
    preferred_technologies: List[str] = ["Spring Boot", "Docker"]
    competency_graph: Optional[Dict] = None


@router.post("/generate")
async def generate_roadmap(
    request: RoadmapRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate a personalized roadmap based on competency graph and persist to PostgreSQL."""
    # If no competency_graph passed in request, look up user's real competency graph from PostgreSQL
    graph_dict = request.competency_graph
    if not graph_dict:
        nodes = db.query(CompetencyNode).filter(CompetencyNode.user_id == current_user.id).all()
        if nodes:
            graph_dict = {
                "nodes": [
                    {
                        "skill_id": n.skill_id,
                        "skill_name": n.skill_name,
                        "competency_state": n.competency_state.value if hasattr(n.competency_state, "value") else str(n.competency_state),
                        "competency_score": n.competency_score,
                        "uncertainty": n.uncertainty
                    }
                    for n in nodes
                ]
            }

    engine = RoadmapEngine()
    roadmap = engine.generate_roadmap(
        branch=request.branch,
        domain=request.domain,
        target_role=request.target_role,
        preferred_language=request.preferred_language,
        preferred_technologies=request.preferred_technologies,
        competency_graph_dict=graph_dict
    )

    # Deactivate prior active roadmaps
    db.query(Roadmap).filter(
        Roadmap.user_id == current_user.id,
        Roadmap.is_active == True
    ).update({"is_active": False})

    # Save new active roadmap
    roadmap_rec = Roadmap(
        user_id=current_user.id,
        branch=request.branch,
        domain=request.domain,
        target_role=request.target_role,
        preferred_language=request.preferred_language,
        preferred_technologies=request.preferred_technologies,
        is_active=True
    )
    db.add(roadmap_rec)
    db.flush()

    # Save roadmap nodes
    for stage_name, stage_nodes in roadmap.get("stages", {}).items():
        try:
            stage_enum = RoadmapStage(stage_name)
        except Exception:
            stage_enum = RoadmapStage.FOUNDATION

        for n in stage_nodes:
            r_node = RoadmapNode(
                roadmap_id=roadmap_rec.id,
                skill_id=n["skill_id"],
                skill_name=n.get("skill_name", n["skill_id"]),
                stage=stage_enum,
                priority=n.get("priority", 0),
                is_gap=n.get("is_gap", True),
                tools=n.get("tools", []),
                resources=n.get("resources", []),
                recommended_projects=n.get("projects", []),
                estimated_effort_hours=n.get("estimated_effort_hours", 20)
            )
            db.add(r_node)

    db.commit()
    roadmap["roadmap_id"] = roadmap_rec.id
    return roadmap


@router.get("/current")
async def get_current_roadmap(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve the user's active persistent roadmap from PostgreSQL."""
    roadmap_rec = db.query(Roadmap).filter(
        Roadmap.user_id == current_user.id,
        Roadmap.is_active == True
    ).order_by(Roadmap.generated_at.desc()).first()

    if not roadmap_rec:
        return {"has_roadmap": False, "roadmap": None}

    nodes = db.query(RoadmapNode).filter(RoadmapNode.roadmap_id == roadmap_rec.id).all()
    stages_grouped = {}
    for n in nodes:
        stage_val = n.stage.value if hasattr(n.stage, "value") else str(n.stage)
        if stage_val not in stages_grouped:
            stages_grouped[stage_val] = []
        stages_grouped[stage_val].append({
            "skill_id": n.skill_id,
            "skill_name": n.skill_name,
            "stage": stage_val,
            "priority": n.priority,
            "is_gap": n.is_gap,
            "is_completed": n.is_completed,
            "tools": n.tools or [],
            "resources": n.resources or [],
            "projects": n.recommended_projects or [],
            "estimated_effort_hours": n.estimated_effort_hours or 20
        })

    gap_count = sum(1 for n in nodes if n.is_gap)
    total_effort = sum(n.estimated_effort_hours or 20 for n in nodes if n.is_gap)

    return {
        "has_roadmap": True,
        "roadmap_id": roadmap_rec.id,
        "branch": roadmap_rec.branch,
        "domain": roadmap_rec.domain,
        "target_role": roadmap_rec.target_role,
        "language": roadmap_rec.preferred_language,
        "technologies": roadmap_rec.preferred_technologies,
        "stages": stages_grouped,
        "summary": {
            "total_skills": len(nodes),
            "skills_to_learn": gap_count,
            "skills_known": len(nodes) - gap_count,
            "estimated_hours": total_effort,
            "stages_count": len(stages_grouped)
        }
    }


@router.get("/knowledge/branches")
async def get_branches():
    """Get all supported B.Tech branches from authoritative knowledge graph."""
    engine = RoadmapEngine()
    branches = engine.get_branches()
    return {"branches": branches}


@router.get("/knowledge/all-domains")
async def get_all_domains():
    """
    Return the COMPLETE domain taxonomy across ALL branches.
    Each domain includes: id, name, branch_id, category, description, role count.
    Grouped by category for the profile setup UI.
    """
    engine = RoadmapEngine()
    all_domains = engine.get_all_domains()
    # Group by category
    grouped: dict = {}
    for d in all_domains:
        cat = d.get("category", "General")
        if cat not in grouped:
            grouped[cat] = []
        grouped[cat].append(d)
    return {
        "total": len(all_domains),
        "domains": all_domains,
        "by_category": grouped
    }


@router.get("/knowledge/domains/{branch}")
async def get_domains(branch: str):
    """Get connected domains for a specific branch."""
    engine = RoadmapEngine()
    domains = engine.get_domains(branch)
    return {"branch": branch, "domains": domains}


@router.get("/knowledge/roles/{domain:path}")
async def get_roles(domain: str):
    """Get connected career roles for a domain."""
    engine = RoadmapEngine()
    roles = engine.get_roles(domain)
    return {"domain": domain, "roles": roles}


@router.get("/knowledge/languages/{role:path}")
async def get_languages_for_role(role: str):
    """Get ranked programming languages relevant to a role."""
    engine = RoadmapEngine()
    languages = engine.get_languages_for_role(role)
    return {"role": role, "languages": languages}


@router.get("/knowledge/technologies/{role:path}")
async def get_technologies_for_role(role: str, language: Optional[str] = None):
    """Get technologies and frameworks compatible with the role and preferred language."""
    engine = RoadmapEngine()
    technologies = engine.get_technologies_for_role(role, language)
    return {"role": role, "language": language, "technologies": technologies}


@router.get("/knowledge/role/{role:path}")
async def get_role_details(role: str):
    """Get complete role profile including competencies, 4-tier project ladder, salary, and source."""
    engine = RoadmapEngine()
    details = engine.get_role_details(role)
    if not details:
        raise HTTPException(status_code=404, detail=f"Role '{role}' not found in knowledge graph")
    return details


@router.get("/knowledge/sources")
async def get_sources():
    """Get authoritative sources registry."""
    engine = RoadmapEngine()
    sources = engine.get_sources()
    return {"sources": sources}

