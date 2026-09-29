from sqlalchemy.orm import Session
from models.models import (
    SkillGap, Project, UserProfile, CompetencyNode
)
from llm.provider import get_llm_provider
import json

class ProjectRecommendationEngine:
    def __init__(self, db: Session):
        self.db = db
        self.llm = get_llm_provider()

    def get_recommended_projects(self, user_id: str, target_role: str, limit: int = 3):
        # 1. Get user's skill gaps
        gaps = self.db.query(SkillGap).filter(
            SkillGap.user_id == user_id, 
            SkillGap.target_role == target_role,
            SkillGap.is_active == True
        ).all()
        
        gap_names = [g.skill_name for g in gaps]
        
        # 2. Try to match with existing static catalog projects in DB
        catalog_projects = self.db.query(Project).filter(
            Project.is_active == True
        ).all()
        
        recommended = []
        for p in catalog_projects:
            # simple overlap calculation
            overlap = set(p.competencies).intersection(set(gap_names))
            if overlap:
                recommended.append({
                    "project": p,
                    "score": len(overlap)
                })
                
        # If we found matches in the DB catalog, return top N
        if recommended:
            recommended.sort(key=lambda x: x["score"], reverse=True)
            return [r["project"] for r in recommended[:limit]]
            
        # 3. Dynamic generation (if catalog is empty or no good matches)
        # Use LLM to generate highly personalized project recommendations
        prompt = f"""
        Target Role: {target_role}
        Skill Gaps: {gap_names}
        
        Generate {limit} progressive project ideas that will specifically address these skill gaps.
        Make them realistic, portfolio-worthy projects.
        
        Return JSON format exactly like this:
        {{
            "projects": [
                {{
                    "title": "Project Title",
                    "domain": "Target Domain",
                    "difficulty": "Intermediate",
                    "required_skills": ["Skill1", "Skill2"],
                    "technologies": ["Tech1", "Tech2"],
                    "competencies": ["Competency1"],
                    "prerequisites": ["Pre1"],
                    "estimated_duration": "2 weeks",
                    "learning_outcomes": ["Outcome 1"],
                    "why_recommended": "Reason why it fits the gaps"
                }}
            ]
        }}
        """
        
        generated_projects = []
        try:
            response = self.llm.generate(prompt)
            data = json.loads(response)
            
            for item in data.get("projects", []):
                p = Project(
                    title=item.get("title", "Untitled Project"),
                    domain=item.get("domain", ""),
                    difficulty=item.get("difficulty", "Intermediate"),
                    required_skills=item.get("required_skills", []),
                    technologies=item.get("technologies", []),
                    competencies=item.get("competencies", []),
                    prerequisites=item.get("prerequisites", []),
                    estimated_duration=item.get("estimated_duration", ""),
                    learning_outcomes=item.get("learning_outcomes", []),
                    is_active=True
                )
                
                # We can choose to save it to DB or just return it dynamically.
                # Let's save it to build the catalog dynamically
                self.db.add(p)
                # Also attach why recommended on the fly (not stored in Project table directly to reuse projects, 
                # but we'll attach it dynamically for the API response)
                p.why_recommended = item.get("why_recommended", "")
                generated_projects.append(p)
                
            self.db.commit()
            return generated_projects
        except Exception as e:
            return []
