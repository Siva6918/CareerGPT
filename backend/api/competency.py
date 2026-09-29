"""CareerGPT — Competency, Reports, and Knowledge APIs"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database.connection import get_db
from api.auth import get_current_user
from models.models import User, CompetencyNode

router = APIRouter()


@router.get("/graph")
async def get_competency_graph(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's persistent competency graph from PostgreSQL database."""
    nodes = db.query(CompetencyNode).filter(
        CompetencyNode.user_id == current_user.id
    ).all()

    nodes_data = [
        {
            "id": n.id,
            "skill_id": n.skill_id,
            "skill_name": n.skill_name,
            "competency_state": n.competency_state.value if hasattr(n.competency_state, "value") else str(n.competency_state),
            "competency_score": n.competency_score,
            "uncertainty": n.uncertainty,
            "evidence_count": n.evidence_count or 0,
            "evidence_from_resume": n.evidence_from_resume or False,
            "evidence_from_interview": n.evidence_from_interview or False,
            "category": n.category or "General",
            "last_assessed": n.last_assessed.isoformat() if n.last_assessed else None
        }
        for n in nodes
    ]

    return {
        "user_id": current_user.id,
        "total_nodes": len(nodes_data),
        "nodes": nodes_data,
        "edges": []
    }
