from sqlalchemy.orm import Session
from models.models import (
    CompetencyNode, CareerReadiness, ReadinessLevel, SkillGap, SkillGapPriority,
    User, UserProfile, JobRole, CompetencyState
)
from llm.provider import get_llm_provider
import json

class CareerReadinessEngine:
    def __init__(self, db: Session):
        self.db = db
        self.llm = get_llm_provider()

    def _state_to_score(self, state: CompetencyState) -> float:
        mapping = {
            CompetencyState.UNKNOWN: 0.0,
            CompetencyState.EMERGING: 0.25,
            CompetencyState.DEVELOPING: 0.5,
            CompetencyState.DEMONSTRATED: 0.8,
            CompetencyState.STRONG: 1.0
        }
        return mapping.get(state, 0.0)

    def calculate_readiness(self, user_id: str, target_role: str) -> CareerReadiness:
        # Get competencies
        nodes = self.db.query(CompetencyNode).filter(CompetencyNode.user_id == user_id).all()
        
        if not nodes:
            # Create empty readiness
            readiness = CareerReadiness(
                user_id=user_id,
                target_role=target_role,
                readiness_level=ReadinessLevel.NOT_ASSESSED,
                estimated_score=0.0
            )
            self.db.add(readiness)
            self.db.commit()
            return readiness

        # 1. Calculate overall score (weighted by confidence and state)
        total_score = 0.0
        total_weight = 0.0
        
        dimensions = {
            "Technical Skills": {"score": 0, "count": 0},
            "Projects": {"score": 0, "count": 0},
            "Fundamentals": {"score": 0, "count": 0},
            "Role-Specific": {"score": 0, "count": 0}
        }
        
        for n in nodes:
            # Only count nodes with some evidence or certainty
            confidence = max(0, 1.0 - (n.uncertainty or 1.0))
            raw_score = self._state_to_score(n.competency_state)
            
            weight = confidence
            if weight > 0:
                total_score += (raw_score * weight)
                total_weight += weight
                
                # Determine dimension (simplified heuristic, should ideally map via taxonomy)
                if n.evidence_from_project:
                    dimensions["Projects"]["score"] += raw_score
                    dimensions["Projects"]["count"] += 1
                
                dimensions["Technical Skills"]["score"] += raw_score
                dimensions["Technical Skills"]["count"] += 1

        overall_score = (total_score / total_weight) if total_weight > 0 else 0.0
        
        # Calculate dimension percentages
        dim_results = {}
        for k, v in dimensions.items():
            if v["count"] > 0:
                dim_results[k] = round((v["score"] / v["count"]) * 100)
            else:
                dim_results[k] = 0
                
        # 2. Determine Level
        if overall_score < 0.2:
            level = ReadinessLevel.BEGINNER
        elif overall_score < 0.5:
            level = ReadinessLevel.DEVELOPING
        elif overall_score < 0.75:
            level = ReadinessLevel.INTERMEDIATE
        elif overall_score < 0.9:
            level = ReadinessLevel.JOB_READY
        else:
            level = ReadinessLevel.STRONG

        if total_weight == 0:
            level = ReadinessLevel.NOT_ASSESSED

        # Find existing or create new
        readiness = self.db.query(CareerReadiness).filter(
            CareerReadiness.user_id == user_id,
            CareerReadiness.target_role == target_role
        ).first()

        if not readiness:
            readiness = CareerReadiness(user_id=user_id, target_role=target_role)
            self.db.add(readiness)

        readiness.readiness_level = level
        readiness.estimated_score = round(overall_score * 100)
        readiness.dimensions = dim_results
        readiness.confidence = min(1.0, total_weight / max(1, len(nodes)))
        readiness.uncertainty = 1.0 - readiness.confidence
        
        self.db.commit()
        self.db.refresh(readiness)
        
        # Recalculate skill gaps
        self.calculate_skill_gaps(user_id, target_role, nodes)
        
        return readiness

    def calculate_skill_gaps(self, user_id: str, target_role: str, nodes: list):
        # Clear old gaps
        self.db.query(SkillGap).filter(
            SkillGap.user_id == user_id, 
            SkillGap.target_role == target_role
        ).update({"is_active": False})

        # Identify weak or unknown nodes
        gaps = []
        for n in nodes:
            if n.competency_state in [CompetencyState.UNKNOWN, CompetencyState.EMERGING, CompetencyState.DEVELOPING]:
                gaps.append(n)
                
        if not gaps:
            self.db.commit()
            return
            
        # Use LLM to prioritize and explain gaps for the role
        prompt = f"""
        Target Role: {target_role}
        
        The user has the following skill gaps (weak or unknown competency):
        {[n.skill_name for n in gaps]}
        
        Analyze these skills in the context of the {target_role} role.
        Identify the top 5 most critical gaps.
        Assign a priority (CRITICAL, HIGH, MEDIUM, LOW) to each.
        Provide a 1-sentence reasoning for WHY this is a gap and WHY it is prioritized as such, based on learning dependency or job relevance.
        
        Return JSON format exactly like this:
        {{
            "gaps": [
                {{
                    "skill_name": "Skill Name",
                    "priority": "HIGH",
                    "reasoning": "Required by target role and currently weak."
                }}
            ]
        }}
        """
        
        try:
            response = self.llm.generate(prompt)
            data = json.loads(response)
            
            for item in data.get("gaps", []):
                skill_name = item.get("skill_name")
                # Find matching node
                node = next((n for n in nodes if n.skill_name == skill_name), None)
                if node:
                    priority_str = item.get("priority", "MEDIUM").lower()
                    try:
                        priority = SkillGapPriority(priority_str)
                    except ValueError:
                        priority = SkillGapPriority.MEDIUM
                        
                    gap = SkillGap(
                        user_id=user_id,
                        target_role=target_role,
                        skill_id=node.skill_id,
                        skill_name=node.skill_name,
                        priority=priority,
                        reasoning=item.get("reasoning", "Identified as a gap for your target role."),
                        is_active=True
                    )
                    self.db.add(gap)
                    
            self.db.commit()
        except Exception as e:
            # Fallback
            for n in gaps[:5]:
                gap = SkillGap(
                    user_id=user_id,
                    target_role=target_role,
                    skill_id=n.skill_id,
                    skill_name=n.skill_name,
                    priority=SkillGapPriority.HIGH,
                    reasoning="Important skill for your target role.",
                    is_active=True
                )
                self.db.add(gap)
            self.db.commit()
