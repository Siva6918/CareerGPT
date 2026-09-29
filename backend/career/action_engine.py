from sqlalchemy.orm import Session
from models.models import (
    SkillGap, Project, NextBestAction, CareerReadiness, ReadinessLevel, RoadmapNode
)
from llm.provider import get_llm_provider
import json

class NextBestActionEngine:
    def __init__(self, db: Session):
        self.db = db
        self.llm = get_llm_provider()

    def determine_next_action(self, user_id: str, target_role: str) -> NextBestAction:
        # Clear previous active actions
        self.db.query(NextBestAction).filter(
            NextBestAction.user_id == user_id
        ).update({"is_active": False})

        # 1. Fetch Readiness
        readiness = self.db.query(CareerReadiness).filter(
            CareerReadiness.user_id == user_id,
            CareerReadiness.target_role == target_role
        ).first()

        # 2. Fetch Gaps
        critical_gaps = self.db.query(SkillGap).filter(
            SkillGap.user_id == user_id,
            SkillGap.target_role == target_role,
            SkillGap.priority == "CRITICAL",
            SkillGap.is_active == True
        ).all()

        high_gaps = self.db.query(SkillGap).filter(
            SkillGap.user_id == user_id,
            SkillGap.target_role == target_role,
            SkillGap.priority == "HIGH",
            SkillGap.is_active == True
        ).all()

        # Simple Logic Tree for next best action
        action_type = ""
        title = ""
        description = ""
        reasoning = ""

        if not readiness or readiness.readiness_level == ReadinessLevel.NOT_ASSESSED:
            action_type = "TAKE_INTERVIEW"
            title = "Complete Initial Assessment"
            description = "You need to complete an adaptive interview to establish your baseline competency graph."
            reasoning = "Without evidence, the system cannot personalize your roadmap or projects."
        elif critical_gaps:
            gap = critical_gaps[0]
            action_type = "LEARN_SKILL"
            title = f"Learn {gap.skill_name}"
            description = f"Focus on building core competency in {gap.skill_name}."
            reasoning = gap.reasoning
        elif high_gaps:
            gap = high_gaps[0]
            action_type = "BUILD_PROJECT"
            title = f"Apply {gap.skill_name} in a Project"
            description = f"You have basic knowledge of {gap.skill_name}, but lack practical project evidence."
            reasoning = gap.reasoning
        elif readiness.readiness_level in [ReadinessLevel.JOB_READY, ReadinessLevel.STRONG]:
            action_type = "APPLY_FOR_ROLE"
            title = "Apply for Jobs"
            description = f"Your profile is highly matched for {target_role}. Start applying."
            reasoning = "Your competency graph shows you possess the required skills at a strong level."
        else:
            action_type = "PRACTICE_CODING"
            title = "Practice Advanced Concepts"
            description = "Continue sharpening your skills via coding challenges."
            reasoning = "Consistent practice improves confidence and fluency."

        action = NextBestAction(
            user_id=user_id,
            action_type=action_type,
            title=title,
            description=description,
            reasoning=reasoning,
            priority=1,
            is_active=True
        )
        self.db.add(action)
        self.db.commit()
        self.db.refresh(action)

        return action
