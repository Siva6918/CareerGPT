"""CareerGPT — Learning Goals API

Multi-domain learning goals system.
One competency graph shared across all goals.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import uuid

from database.connection import get_db
from api.auth import get_current_user
from models.models import (
    User, UserProfile, LearningGoal, LearningGoalProgress,
    LearningGoalStatus, LearningGoalType, TopicProgressStatus,
    CompetencyNode, RoadmapSource
)

router = APIRouter()


# ── Schemas ────────────────────────────────────────────────────────────────

class LearningGoalCreate(BaseModel):
    goal_type: str = "role"        # primary | role | technology | domain | skill
    is_primary: bool = False
    title: str
    domain: Optional[str] = None
    track: Optional[str] = None
    technology: Optional[str] = None
    current_level: str = "beginner"
    target_level: str = "advanced"
    priority: int = 2              # 1=high, 2=medium, 3=low
    reason: Optional[str] = None
    roadmap_slugs: List[str] = []


class LearningGoalUpdate(BaseModel):
    priority: Optional[int] = None
    current_level: Optional[str] = None
    target_level: Optional[str] = None
    status: Optional[str] = None
    reason: Optional[str] = None
    roadmap_slugs: Optional[List[str]] = None


class TopicProgressUpdate(BaseModel):
    roadmap_source_slug: str
    topic_slug: str
    topic_title: str
    status: str    # not_started | in_progress | completed | needs_revision
    confidence: Optional[float] = None


# ── Helpers ─────────────────────────────────────────────────────────────────

ROLE_TO_SLUGS = {
    # Role-based → associated roadmap slugs
    "frontend developer": ["frontend", "javascript", "react", "html", "css"],
    "backend developer": ["backend", "nodejs", "sql", "docker"],
    "full stack developer": ["full-stack", "frontend", "backend", "javascript", "react", "nodejs", "sql", "docker"],
    "ai engineer": ["ai-engineer", "python", "machine-learning", "docker", "kubernetes"],
    "data scientist": ["ai-data-scientist", "python", "sql", "machine-learning"],
    "machine learning engineer": ["machine-learning", "python", "mlops"],
    "data engineer": ["data-engineer", "python", "sql", "docker"],
    "mlops engineer": ["mlops", "docker", "kubernetes", "python"],
    "devops engineer": ["devops", "docker", "kubernetes", "linux", "aws", "terraform"],
    "cloud engineer": ["aws", "docker", "kubernetes", "terraform"],
    "cybersecurity engineer": ["cyber-security", "linux", "networking"],
    "network engineer": ["network-engineer", "linux"],
    "android developer": ["android", "kotlin", "java"],
    "ios developer": ["ios", "swift-ui"],
    "react developer": ["react", "javascript", "typescript"],
    "react": ["react", "javascript"],
    "python": ["python"],
    "docker": ["docker"],
    "kubernetes": ["kubernetes"],
    "sql": ["sql", "postgresql-dba"],
    "cybersecurity": ["cyber-security", "linux"],
    "devops": ["devops", "docker", "kubernetes", "linux"],
    "data engineering": ["data-engineer", "python", "sql"],
}


def suggest_roadmap_slugs(title: str, goal_type: str) -> List[str]:
    """Suggest relevant roadmap.sh slugs for a learning goal."""
    t = title.lower().strip()
    # Direct match
    if t in ROLE_TO_SLUGS:
        return ROLE_TO_SLUGS[t]
    # Partial match
    for key, slugs in ROLE_TO_SLUGS.items():
        if key in t or t in key:
            return slugs
    # For technology goals, slug is usually the tech name
    if goal_type in ("technology", "skill"):
        slug = title.lower().replace(" ", "-").replace("/", "-")
        return [slug]
    return []


def calculate_goal_progress(db: Session, goal_id: str) -> float:
    """Calculate progress percentage for a learning goal based on topic completion."""
    total = db.query(LearningGoalProgress).filter(
        LearningGoalProgress.goal_id == goal_id
    ).count()

    if total == 0:
        return 0.0

    completed = db.query(LearningGoalProgress).filter(
        LearningGoalProgress.goal_id == goal_id,
        LearningGoalProgress.status == TopicProgressStatus.COMPLETED
    ).count()

    return round((completed / total) * 100, 1)


def enrich_goal(db: Session, goal: LearningGoal) -> Dict[str, Any]:
    """Serialize a LearningGoal with computed progress and roadmap info."""
    progress_pct = calculate_goal_progress(db, goal.id)

    # Count progress entries by status
    progress_entries = db.query(LearningGoalProgress).filter(
        LearningGoalProgress.goal_id == goal.id
    ).all()

    status_counts = {"not_started": 0, "in_progress": 0, "completed": 0, "needs_revision": 0}
    for p in progress_entries:
        s = p.status.value if hasattr(p.status, "value") else str(p.status)
        status_counts[s] = status_counts.get(s, 0) + 1

    # Get roadmap source info
    roadmap_info = []
    for slug in (goal.roadmap_slugs or []):
        source = db.query(RoadmapSource).filter(RoadmapSource.slug == slug).first()
        if source:
            roadmap_info.append({
                "slug": slug,
                "title": source.title,
                "category": source.category,
                "external_url": source.external_url,
                "topic_count": source.topic_count,
            })
        else:
            roadmap_info.append({
                "slug": slug,
                "title": slug.replace("-", " ").title(),
                "category": "unknown",
                "external_url": f"https://roadmap.sh/{slug}",
                "topic_count": 0,
            })

    return {
        "id": goal.id,
        "goal_type": goal.goal_type.value if hasattr(goal.goal_type, "value") else str(goal.goal_type),
        "is_primary": goal.is_primary,
        "title": goal.title,
        "domain": goal.domain,
        "track": goal.track,
        "technology": goal.technology,
        "branch": goal.branch,
        "current_level": goal.current_level,
        "target_level": goal.target_level,
        "priority": goal.priority,
        "reason": goal.reason,
        "roadmap_slugs": goal.roadmap_slugs or [],
        "roadmaps": roadmap_info,
        "status": goal.status.value if hasattr(goal.status, "value") else str(goal.status),
        "progress_pct": progress_pct,
        "topic_counts": status_counts,
        "created_at": goal.created_at.isoformat() if goal.created_at else None,
        "updated_at": goal.updated_at.isoformat() if goal.updated_at else None,
    }


# ── Routes ─────────────────────────────────────────────────────────────────

@router.get("")
async def list_learning_goals(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all learning goals for the current user."""
    goals = db.query(LearningGoal).filter(
        LearningGoal.user_id == current_user.id,
        LearningGoal.status != LearningGoalStatus.REMOVED
    ).order_by(LearningGoal.is_primary.desc(), LearningGoal.priority).all()

    return {
        "goals": [enrich_goal(db, g) for g in goals],
        "primary": next((enrich_goal(db, g) for g in goals if g.is_primary), None),
        "additional": [enrich_goal(db, g) for g in goals if not g.is_primary],
    }


@router.post("")
async def create_learning_goal(
    data: LearningGoalCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new learning goal.
    If is_primary=True, demotes any existing primary goal.
    """
    # Get user branch from profile
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    branch = profile.branch if profile else "CSE"

    # Suggest roadmap slugs if not provided
    roadmap_slugs = data.roadmap_slugs
    if not roadmap_slugs:
        roadmap_slugs = suggest_roadmap_slugs(data.title, data.goal_type)

    # If creating primary, demote existing primary
    if data.is_primary:
        db.query(LearningGoal).filter(
            LearningGoal.user_id == current_user.id,
            LearningGoal.is_primary == True
        ).update({"is_primary": False})

    try:
        goal_type = LearningGoalType(data.goal_type)
    except ValueError:
        goal_type = LearningGoalType.ROLE

    goal = LearningGoal(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        goal_type=goal_type,
        is_primary=data.is_primary,
        title=data.title,
        domain=data.domain,
        track=data.track,
        technology=data.technology,
        branch=branch,
        current_level=data.current_level,
        target_level=data.target_level,
        priority=data.priority,
        reason=data.reason,
        roadmap_slugs=roadmap_slugs,
        status=LearningGoalStatus.ACTIVE,
        progress_pct=0.0,
    )
    db.add(goal)
    db.commit()
    db.refresh(goal)

    return {"message": "Learning goal created", "goal": enrich_goal(db, goal)}


@router.get("/{goal_id}")
async def get_learning_goal(
    goal_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific learning goal with progress details."""
    goal = db.query(LearningGoal).filter(
        LearningGoal.id == goal_id,
        LearningGoal.user_id == current_user.id
    ).first()

    if not goal:
        raise HTTPException(status_code=404, detail="Learning goal not found")

    # Get detailed progress
    progress = db.query(LearningGoalProgress).filter(
        LearningGoalProgress.goal_id == goal_id
    ).all()

    progress_list = [{
        "id": p.id,
        "roadmap_source_slug": p.roadmap_source_slug,
        "topic_slug": p.topic_slug,
        "topic_title": p.topic_title,
        "status": p.status.value if hasattr(p.status, "value") else str(p.status),
        "confidence": p.confidence,
        "started_at": p.started_at.isoformat() if p.started_at else None,
        "completed_at": p.completed_at.isoformat() if p.completed_at else None,
    } for p in progress]

    result = enrich_goal(db, goal)
    result["progress_entries"] = progress_list
    return result


@router.patch("/{goal_id}")
async def update_learning_goal(
    goal_id: str,
    data: LearningGoalUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a learning goal (priority, status, level, etc.)"""
    goal = db.query(LearningGoal).filter(
        LearningGoal.id == goal_id,
        LearningGoal.user_id == current_user.id
    ).first()

    if not goal:
        raise HTTPException(status_code=404, detail="Learning goal not found")

    if data.priority is not None:
        goal.priority = data.priority
    if data.current_level is not None:
        goal.current_level = data.current_level
    if data.target_level is not None:
        goal.target_level = data.target_level
    if data.reason is not None:
        goal.reason = data.reason
    if data.roadmap_slugs is not None:
        goal.roadmap_slugs = data.roadmap_slugs
    if data.status is not None:
        try:
            goal.status = LearningGoalStatus(data.status)
        except ValueError:
            pass

    db.commit()
    return {"message": "Learning goal updated", "goal": enrich_goal(db, goal)}


@router.delete("/{goal_id}")
async def remove_learning_goal(
    goal_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Soft-delete (remove) a learning goal."""
    goal = db.query(LearningGoal).filter(
        LearningGoal.id == goal_id,
        LearningGoal.user_id == current_user.id
    ).first()

    if not goal:
        raise HTTPException(status_code=404, detail="Learning goal not found")

    goal.status = LearningGoalStatus.REMOVED
    db.commit()
    return {"message": "Learning goal removed"}


@router.post("/{goal_id}/progress")
async def update_topic_progress(
    goal_id: str,
    data: TopicProgressUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update progress on a specific topic within a learning goal."""
    goal = db.query(LearningGoal).filter(
        LearningGoal.id == goal_id,
        LearningGoal.user_id == current_user.id
    ).first()

    if not goal:
        raise HTTPException(status_code=404, detail="Learning goal not found")

    # Check if progress entry exists
    existing = db.query(LearningGoalProgress).filter(
        LearningGoalProgress.goal_id == goal_id,
        LearningGoalProgress.topic_slug == data.topic_slug
    ).first()

    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)

    try:
        new_status = TopicProgressStatus(data.status)
    except ValueError:
        new_status = TopicProgressStatus.NOT_STARTED

    if existing:
        existing.status = new_status
        existing.confidence = data.confidence
        if new_status == TopicProgressStatus.IN_PROGRESS and not existing.started_at:
            existing.started_at = now
        if new_status == TopicProgressStatus.COMPLETED:
            existing.completed_at = now
        existing.last_reviewed = now
    else:
        entry = LearningGoalProgress(
            id=str(uuid.uuid4()),
            goal_id=goal_id,
            user_id=current_user.id,
            roadmap_source_slug=data.roadmap_source_slug,
            topic_slug=data.topic_slug,
            topic_title=data.topic_title,
            status=new_status,
            confidence=data.confidence,
            started_at=now if new_status == TopicProgressStatus.IN_PROGRESS else None,
            completed_at=now if new_status == TopicProgressStatus.COMPLETED else None,
        )
        db.add(entry)

    # Recalculate progress percentage
    goal.progress_pct = calculate_goal_progress(db, goal_id)

    db.commit()
    return {"message": "Progress updated", "progress_pct": goal.progress_pct}


@router.get("/{goal_id}/skill-gap")
async def get_skill_gap(
    goal_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get skill gap analysis for a learning goal.
    Cross-references the competency graph with goal requirements.
    Uses the shared competency graph — reuses already-known skills.
    """
    goal = db.query(LearningGoal).filter(
        LearningGoal.id == goal_id,
        LearningGoal.user_id == current_user.id
    ).first()

    if not goal:
        raise HTTPException(status_code=404, detail="Learning goal not found")

    # Get candidate's competency nodes (the shared graph)
    competency_nodes = db.query(CompetencyNode).filter(
        CompetencyNode.user_id == current_user.id
    ).all()

    known_skills = {
        n.skill_name.lower(): {
            "state": n.competency_state.value if hasattr(n.competency_state, "value") else str(n.competency_state),
            "score": n.competency_score,
            "uncertainty": n.uncertainty,
        }
        for n in competency_nodes
        if n.competency_state not in ("unknown",)
    }

    # Get topics for this goal's roadmaps
    required_topics = []
    for slug in (goal.roadmap_slugs or []):
        source = db.query(RoadmapSource).filter(RoadmapSource.slug == slug).first()
        if source:
            from models.models import RoadmapTopic
            topics = db.query(RoadmapTopic).filter(
                RoadmapTopic.source_id == source.id
            ).order_by(RoadmapTopic.order_index).limit(50).all()

            for t in topics:
                title_lower = t.title.lower()
                is_known = any(k in title_lower or title_lower in k for k in known_skills)
                required_topics.append({
                    "roadmap_slug": slug,
                    "topic_slug": t.topic_slug,
                    "title": t.title,
                    "known": is_known,
                    "competency": known_skills.get(title_lower, {}),
                })

    known_count = sum(1 for t in required_topics if t["known"])
    gap_count = len(required_topics) - known_count

    return {
        "goal_id": goal_id,
        "goal_title": goal.title,
        "total_topics": len(required_topics),
        "known_topics": known_count,
        "gap_topics": gap_count,
        "gap_pct": round((gap_count / max(len(required_topics), 1)) * 100, 1),
        "topics": required_topics,
        "reused_skills": list(known_skills.keys()),
    }
