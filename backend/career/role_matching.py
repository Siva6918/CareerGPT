from sqlalchemy.orm import Session
from models.models import (
    CompetencyNode, JobRole, CompetencyState
)
from llm.provider import get_llm_provider

class RoleMatchingEngine:
    def __init__(self, db: Session):
        self.db = db
        self.llm = get_llm_provider()

    def get_role_matches(self, user_id: str):
        # 1. Fetch user's competency graph
        nodes = self.db.query(CompetencyNode).filter(CompetencyNode.user_id == user_id).all()
        user_skills = {n.skill_name.lower(): n.competency_state for n in nodes}
        
        # 2. Fetch all job roles (could cross branches)
        roles = self.db.query(JobRole).filter(JobRole.is_active == True).all()
        
        matches = []
        for role in roles:
            match_data = self._calculate_match(user_skills, role)
            matches.append(match_data)
            
        # Sort by match score
        matches.sort(key=lambda x: x["match_score"], reverse=True)
        return matches

    def _calculate_match(self, user_skills: dict, role: JobRole):
        req_skills = role.required_skills or []
        pref_skills = role.preferred_skills or []
        
        if not req_skills and not pref_skills:
            return {
                "role": role,
                "match_score": 0.0,
                "matching_skills": [],
                "missing_skills": [],
                "why_matched": "Role has no defined skills."
            }
            
        matching = []
        missing = []
        
        # Calculate match logic
        score = 0.0
        total_weight = len(req_skills) * 2 + len(pref_skills)
        
        if total_weight == 0:
            total_weight = 1
            
        for skill in req_skills:
            state = user_skills.get(skill.lower(), CompetencyState.UNKNOWN)
            if state in [CompetencyState.DEMONSTRATED, CompetencyState.STRONG]:
                matching.append(skill)
                score += 2
            elif state in [CompetencyState.DEVELOPING, CompetencyState.EMERGING]:
                missing.append(f"{skill} (Needs Improvement)")
                score += 1
            else:
                missing.append(skill)
                
        for skill in pref_skills:
            state = user_skills.get(skill.lower(), CompetencyState.UNKNOWN)
            if state in [CompetencyState.DEMONSTRATED, CompetencyState.STRONG]:
                matching.append(skill)
                score += 1
                
        match_pct = (score / total_weight) * 100
        
        return {
            "role": role,
            "match_score": round(match_pct),
            "matching_skills": matching,
            "missing_skills": missing,
            "why_matched": f"You have {len(matching)} out of {len(req_skills)} required skills for this role."
        }
