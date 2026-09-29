"""CareerGPT — Roadmap Sources API

Serves parsed roadmap.sh data and external source registry.
Provides the Roadmap Explorer functionality.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from database.connection import get_db
from api.auth import get_current_user
from models.models import (
    User, RoadmapSource, RoadmapTopic,
    LearningGoal, LearningGoalProgress, TopicProgressStatus, SourceRegistry
)

router = APIRouter()


# ── Routes ─────────────────────────────────────────────────────────────────

@router.get("")
async def list_roadmaps(
    category: Optional[str] = Query(None, description="role-based | skill-based | technology | all"),
    search: Optional[str] = Query(None, description="Search roadmap titles"),
    tags: Optional[str] = Query(None, description="Comma-separated tag filters"),
    limit: int = Query(100, le=200),
    offset: int = Query(0),
    db: Session = Depends(get_db)
):
    """List all available roadmaps with optional filtering.
    This is the Explore Roadmaps page data source.
    """
    q = db.query(RoadmapSource).filter(RoadmapSource.is_active == True)

    if category and category != "all":
        q = q.filter(RoadmapSource.category == category)

    if search:
        search_lower = search.lower()
        q = q.filter(RoadmapSource.title.ilike(f"%{search_lower}%"))

    total = q.count()
    sources = q.order_by(RoadmapSource.category, RoadmapSource.title).offset(offset).limit(limit).all()

    # Tag filtering (post-query, since JSON array filtering varies by DB)
    if tags:
        tag_list = [t.strip().lower() for t in tags.split(",")]
        sources = [
            s for s in sources
            if any(t in (s.tags or []) for t in tag_list)
        ]

    return {
        "total": total,
        "roadmaps": [_serialize_source(s) for s in sources],
        "categories": {
            "role-based": db.query(RoadmapSource).filter(
                RoadmapSource.category == "role-based", RoadmapSource.is_active == True
            ).count(),
            "technology": db.query(RoadmapSource).filter(
                RoadmapSource.category == "technology", RoadmapSource.is_active == True
            ).count(),
            "skill-based": db.query(RoadmapSource).filter(
                RoadmapSource.category == "skill-based", RoadmapSource.is_active == True
            ).count(),
        }
    }


@router.get("/my")
async def get_my_roadmaps(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get roadmaps associated with the user's learning goals."""
    goals = db.query(LearningGoal).filter(
        LearningGoal.user_id == current_user.id,
        LearningGoal.status == "active"
    ).all()

    # Collect all unique slugs from the user's active goals
    slugs = set()
    for g in goals:
        for slug in (g.roadmap_slugs or []):
            slugs.add(slug)

    my_roadmaps = []
    for slug in slugs:
        source = db.query(RoadmapSource).filter(RoadmapSource.slug == slug).first()
        if source:
            # Get user's progress for this roadmap
            progress = _get_user_roadmap_progress(db, current_user.id, slug)
            data = _serialize_source(source)
            data["user_progress"] = progress
            my_roadmaps.append(data)

    return {"roadmaps": my_roadmaps}


@router.get("/sources")
async def list_sources(db: Session = Depends(get_db)):
    """List all authoritative data sources in the registry."""
    sources = db.query(SourceRegistry).filter(SourceRegistry.status == "active").all()
    return {
        "sources": [{
            "id": s.id,
            "name": s.name,
            "source_type": s.source_type,
            "url": s.url,
            "status": s.status,
            "last_imported": s.last_imported.isoformat() if s.last_imported else None,
        } for s in sources]
    }


@router.get("/{slug}")
async def get_roadmap(
    slug: str,
    db: Session = Depends(get_db)
):
    """Get a specific roadmap with all its topics."""
    source = db.query(RoadmapSource).filter(RoadmapSource.slug == slug).first()

    if not source:
        raise HTTPException(status_code=404, detail=f"Roadmap '{slug}' not found")

    topics = db.query(RoadmapTopic).filter(
        RoadmapTopic.source_id == source.id
    ).order_by(RoadmapTopic.order_index).all()

    return {
        **_serialize_source(source),
        "topics": [{
            "id": t.id,
            "node_id": t.node_id,
            "topic_slug": t.topic_slug,
            "title": t.title,
            "description": t.description,
            "resources": t.resources or [],
            "prerequisites": t.prerequisites or [],
            "order_index": t.order_index,
        } for t in topics]
    }


@router.get("/{slug}/topics")
async def get_roadmap_topics(
    slug: str,
    limit: int = Query(50, le=200),
    offset: int = Query(0),
    db: Session = Depends(get_db)
):
    """Get paginated topics for a specific roadmap."""
    source = db.query(RoadmapSource).filter(RoadmapSource.slug == slug).first()

    if not source:
        raise HTTPException(status_code=404, detail=f"Roadmap '{slug}' not found")

    total = db.query(RoadmapTopic).filter(RoadmapTopic.source_id == source.id).count()
    topics = db.query(RoadmapTopic).filter(
        RoadmapTopic.source_id == source.id
    ).order_by(RoadmapTopic.order_index).offset(offset).limit(limit).all()

    return {
        "roadmap_slug": slug,
        "roadmap_title": source.title,
        "external_url": source.external_url,
        "total_topics": total,
        "topics": [{
            "id": t.id,
            "node_id": t.node_id,
            "topic_slug": t.topic_slug,
            "title": t.title,
            "description": t.description,
            "resources": t.resources or [],
            "order_index": t.order_index,
        } for t in topics]
    }


@router.get("/{slug}/progress")
async def get_roadmap_progress(
    slug: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get the current user's progress on a specific roadmap."""
    source = db.query(RoadmapSource).filter(RoadmapSource.slug == slug).first()
    if not source:
        raise HTTPException(status_code=404, detail=f"Roadmap '{slug}' not found")

    progress = _get_user_roadmap_progress(db, current_user.id, slug)
    return {
        "roadmap_slug": slug,
        "roadmap_title": source.title,
        **progress
    }


# ── Helpers ──────────────────────────────────────────────────────────────────

def _serialize_source(source: RoadmapSource) -> dict:
    """Serialize a RoadmapSource to dict."""
    return {
        "id": source.id,
        "provider": source.provider,
        "slug": source.slug,
        "title": source.title,
        "description": source.description,
        "category": source.category,
        "tags": source.tags or [],
        "external_url": source.external_url,
        "topic_count": source.topic_count,
        "is_active": source.is_active,
        "last_imported": source.last_imported.isoformat() if source.last_imported else None,
    }


def _get_user_roadmap_progress(db: Session, user_id: str, slug: str) -> dict:
    """Get aggregated user progress on a roadmap slug."""
    entries = db.query(LearningGoalProgress).filter(
        LearningGoalProgress.user_id == user_id,
        LearningGoalProgress.roadmap_source_slug == slug
    ).all()

    if not entries:
        return {"completed": 0, "in_progress": 0, "not_started": 0, "progress_pct": 0.0}

    completed = sum(1 for e in entries if e.status == TopicProgressStatus.COMPLETED)
    in_progress = sum(1 for e in entries if e.status == TopicProgressStatus.IN_PROGRESS)
    not_started = sum(1 for e in entries if e.status == TopicProgressStatus.NOT_STARTED)

    total = len(entries)
    pct = round((completed / total) * 100, 1) if total > 0 else 0.0

    return {
        "completed": completed,
        "in_progress": in_progress,
        "not_started": not_started,
        "total_tracked": total,
        "progress_pct": pct,
    }
