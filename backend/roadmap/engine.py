"""
CareerGPT — Adaptive Roadmap Knowledge Engine (Module Output Layer)

Consumes the unified B.Tech Career Knowledge Graph derived from:
- CareerGPT_All_BTech_Roadmap_Blueprint.pdf
- CareerGPT_Roadmap_Guide_2026.pdf
- Authoritative standards (roadmap.sh, O*NET, ESCO, NIST NICE, Arm, MathWorks, Autodesk)

Implements the complete connected hierarchy:
Branch -> Domain -> Target Role -> Role Requirements -> Prerequisite Graph ->
Languages (ranked by relevance) -> Technologies & Tools -> 4-Tier Project Ladder ->
Official Resources & Certifications -> Assessment Topics -> Job Families.

Connects to:
- Module 1: CompetencyGraph (candidate nodes & evidence)
- Module 2: Uncertainty-Aware Competency Estimator (scores & entropy reduction)
- Module 3: Interview Policy Engine (targeted question/skill feedback)
"""
import os
import json
import logging
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path

logger = logging.getLogger(__name__)


class RoadmapStage(str, Enum):
    FOUNDATION = "foundation"
    CORE = "core"
    APPLIED = "applied"
    ADVANCED = "advanced"
    PROJECTS = "projects"
    ASSESSMENT = "assessment"


STAGE_ORDER = {
    RoadmapStage.FOUNDATION: 0,
    RoadmapStage.CORE: 1,
    RoadmapStage.APPLIED: 2,
    RoadmapStage.ADVANCED: 3,
    RoadmapStage.PROJECTS: 4,
    RoadmapStage.ASSESSMENT: 5
}


@dataclass
class RoadmapResource:
    title: str
    url: str
    resource_type: str
    provider: str
    is_free: bool = True


@dataclass
class RoadmapSkillNode:
    skill_id: str
    skill_name: str
    stage: RoadmapStage
    priority: int
    prerequisites: List[str] = field(default_factory=list)
    tools: List[str] = field(default_factory=list)
    resources: List[RoadmapResource] = field(default_factory=list)
    projects: List[str] = field(default_factory=list)
    estimated_effort_hours: int = 20
    is_gap: bool = True
    gap_severity: str = "critical"  # critical | high | moderate | low | satisfied
    competency_state: str = "unknown"
    uncertainty: float = 1.0
    recommendation_reason: str = ""
    description: str = ""


class RoadmapEngine:
    """
    Connected Career Roadmap Engine for CareerGPT.
    Dynamically generates personalized, prerequisite-aware career roadmaps.
    """

    def __init__(self, data_path: Optional[str] = None):
        self.data_dir = Path(data_path) if data_path else Path(__file__).resolve().parent.parent / "data" / "roadmaps"
        self._graph: Dict[str, Any] = {}
        self._load_knowledge_graph()

    def _load_knowledge_graph(self):
        graph_file = self.data_dir / "roadmap_graph.json"
        if graph_file.exists():
            try:
                with open(graph_file, "r", encoding="utf-8") as f:
                    self._graph = json.load(f)
                logger.info(f"Loaded Roadmap Knowledge Graph: {len(self._graph.get('branches', []))} branches, {len(self._graph.get('domains', []))} domains.")
                return
            except Exception as e:
                logger.error(f"Failed to load roadmap_graph.json: {e}")
        self._graph = {"branches": [], "domains": [], "sources": []}

    # ── Dependency Hierarchy Queries ──────────────────────────

    def get_branches(self) -> List[Dict[str, Any]]:
        """Return all supported B.Tech branches."""
        return self._graph.get("branches", [])

    def get_domains(self, branch_id: str) -> List[Dict[str, Any]]:
        """Return ONLY domains valid for the selected branch."""
        norm_branch = branch_id.upper().strip()
        matched = []
        for d in self._graph.get("domains", []):
            if d.get("branch_id", "").upper() == norm_branch:
                matched.append({
                    "id": d["id"],
                    "name": d["name"],
                    "branch_id": d["branch_id"],
                    "category": d.get("category", "General"),
                    "description": d.get("description", ""),
                    "roadmap_source": d.get("roadmap_source", ""),
                    "role_count": len(d.get("roles", []))
                })
        return matched

    def get_all_domains(self) -> List[Dict[str, Any]]:
        """
        Return ALL domains across ALL branches.
        Used by the profile setup UI to show the full career taxonomy
        without restricting by the student's academic branch.
        """
        all_domains = []
        for d in self._graph.get("domains", []):
            all_domains.append({
                "id": d["id"],
                "name": d["name"],
                "branch_id": d.get("branch_id", ""),
                "category": d.get("category", "General"),
                "description": d.get("description", ""),
                "roadmap_source": d.get("roadmap_source", ""),
                "role_count": len(d.get("roles", [])),
                "sample_roles": [r["title"] for r in d.get("roles", [])[:3]]
            })
        return all_domains

    def get_roles(self, domain_name_or_id: Optional[str] = None, branch_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Return ONLY roles valid for the selected domain (and branch)."""
        roles = []
        norm_domain = domain_name_or_id.lower().strip() if domain_name_or_id else None
        norm_branch = branch_id.upper().strip() if branch_id else None

        for d in self._graph.get("domains", []):
            # Check branch filter if given
            if norm_branch and d.get("branch_id", "").upper() != norm_branch:
                continue

            # Check domain filter if given (by id or name)
            if norm_domain:
                d_id = d.get("id", "").lower()
                d_name = d.get("name", "").lower()
                if norm_domain != d_id and norm_domain not in d_name and d_name not in norm_domain:
                    continue

            for r in d.get("roles", []):
                roles.append({
                    "id": r["id"],
                    "title": r["title"],
                    "domain_id": d["id"],
                    "domain_name": d["name"],
                    "branch_id": d["branch_id"],
                    "salary_range": r.get("salary_range", "Competitive"),
                    "job_family": r.get("job_family", "Engineering")
                })
        return roles

    def get_role_details(self, role_title_or_id: str) -> Optional[Dict[str, Any]]:
        """Find comprehensive role specification by id or title."""
        needle = role_title_or_id.lower().replace("-", "_").strip()
        for d in self._graph.get("domains", []):
            for r in d.get("roles", []):
                r_id = r.get("id", "").lower().replace("-", "_")
                r_title = r.get("title", "").lower().replace("-", "_")
                if needle == r_id or needle == r_title or needle in r_title:
                    result = dict(r)
                    result["branch_id"] = d.get("branch_id")
                    result["domain_id"] = d.get("id")
                    result["domain_name"] = d.get("name")
                    return result
        return None

    def get_languages_for_role(self, role_title_or_id: str) -> List[Dict[str, str]]:
        """Return programming languages ranked by relevance for the role."""
        role = self.get_role_details(role_title_or_id)
        if role and "languages" in role:
            return role["languages"]
        return [
            {"name": "Python", "relevance": "Primary", "reason": "Universal engineering scripting & analytics language."},
            {"name": "C++", "relevance": "Secondary", "reason": "High-performance systems computation."}
        ]

    def get_technologies_for_role(self, role_title_or_id: str, language: Optional[str] = None) -> List[str]:
        """Return compatible technologies and frameworks for the role and chosen language."""
        role = self.get_role_details(role_title_or_id)
        if not role:
            return []
        all_techs = role.get("technologies", [])
        if not language:
            return all_techs

        # Rank/filter technologies compatible with the language
        norm_lang = language.lower().strip()
        compatible = []
        for t in all_techs:
            compatible.append(t)
        return compatible

    def get_sources(self) -> List[Dict[str, Any]]:
        """Return authoritative source registry."""
        return self._graph.get("sources", [])

    # ── Roadmap Generation & Personalization ──────────────────

    def generate_roadmap(
        self,
        branch: str = "CSE",
        domain: str = "Backend Engineering",
        target_role: str = "Backend Developer",
        preferred_language: str = "Java",
        preferred_technologies: Optional[List[str]] = None,
        competency_graph_dict: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Generate a personalized, prerequisite-aware career roadmap.
        Compares role competency requirements against candidate evidence.
        """
        preferred_technologies = preferred_technologies or []
        role_data = self.get_role_details(target_role)

        # Fallback if specific role not found in graph
        if not role_data:
            role_data = self._create_generic_role_data(branch, domain, target_role, preferred_language, preferred_technologies)

        # Build candidate competency lookup
        candidate_state_lookup, candidate_uncertainty_lookup, evidence_sources_lookup = self._parse_candidate_graph(competency_graph_dict)

        # Build required skills with prerequisite tracking and gap detection
        stages: Dict[str, List[Dict[str, Any]]] = {
            RoadmapStage.FOUNDATION.value: [],
            RoadmapStage.CORE.value: [],
            RoadmapStage.APPLIED.value: [],
            RoadmapStage.ADVANCED.value: [],
            RoadmapStage.PROJECTS.value: [],
            RoadmapStage.ASSESSMENT.value: []
        }

        total_effort_hours = 0
        skills_to_learn = 0
        skills_known = 0
        gap_explanations: List[Dict[str, str]] = []

        required_skills = role_data.get("required_skills", [])
        for skill_info in required_skills:
            s_id = skill_info["id"]
            s_name = skill_info["name"]
            stage_str = skill_info.get("stage", "core").lower()
            if stage_str not in stages:
                stage_str = "core"

            prereqs = skill_info.get("prerequisites", [])

            # Assess candidate's competency state (exact key, or substring match)
            cand_state = candidate_state_lookup.get(s_id, candidate_state_lookup.get(s_name.lower()))
            uncertainty = candidate_uncertainty_lookup.get(s_id, candidate_uncertainty_lookup.get(s_name.lower()))
            evidence_from = evidence_sources_lookup.get(s_id, [])

            if not cand_state:
                norm_sid = s_id.lower().replace("_", "")
                norm_sname = s_name.lower().replace(" ", "")
                for ck, cstate in candidate_state_lookup.items():
                    norm_ck = ck.lower().replace("_", "").replace(" ", "")
                    if norm_ck and (norm_ck in norm_sid or norm_ck in norm_sname or norm_sid in norm_ck):
                        cand_state = cstate
                        uncertainty = candidate_uncertainty_lookup.get(ck, 0.2)
                        evidence_from = evidence_sources_lookup.get(ck, [])
                        break

            if not cand_state:
                cand_state = "unknown"
                uncertainty = 1.0


            is_gap = cand_state not in ["demonstrated", "strong"]
            if is_gap:
                skills_to_learn += 1
                if cand_state == "unknown":
                    gap_severity = "critical"
                    reason = f"Required competency for {role_data.get('title', target_role)}. No evidence detected in resume or interview (uncertainty: 100%)."
                elif cand_state == "emerging":
                    gap_severity = "high"
                    reason = f"Emerging evidence for {s_name}. Needs structured core practice to solidify mastery."
                else:  # developing
                    gap_severity = "moderate"
                    reason = f"Developing competency demonstrated. Targeted practice required to reach recruitment threshold."
                gap_explanations.append({
                    "skill_id": s_id,
                    "skill_name": s_name,
                    "state": cand_state,
                    "gap_severity": gap_severity,
                    "reason": reason
                })
            else:
                skills_known += 1
                gap_severity = "satisfied"
                reason = f"Verified competency ({cand_state.upper()}) supported by {', '.join(evidence_from) or 'assessments'}."

            effort = 15 if not is_gap else (35 if stage_str in ["core", "applied"] else 25)
            if is_gap:
                total_effort_hours += effort

            # Filter relevant tools & resources
            node_tools = [t for t in role_data.get("tools", [])]
            node_resources = [
                r for r in role_data.get("resources", [])
            ]

            node_dict = {
                "skill_id": s_id,
                "skill_name": s_name,
                "stage": stage_str,
                "priority": STAGE_ORDER.get(RoadmapStage(stage_str), 99),
                "is_gap": is_gap,
                "gap_severity": gap_severity,
                "competency_state": cand_state,
                "uncertainty": uncertainty,
                "prerequisites": prereqs,
                "tools": node_tools[:3],
                "resources": node_resources[:2],
                "projects": [p["title"] for p in role_data.get("projects", []) if any(req in p.get("skills", []) for req in [s_id, "all"])][:2],
                "estimated_effort_hours": effort,
                "recommendation_reason": reason
            }
            stages[stage_str].append(node_dict)

        # Add Projects Stage (Progressive 4-Tier Ladder)
        projects_data = role_data.get("projects", [])
        for proj in projects_data:
            p_node = {
                "skill_id": f"proj_{proj['level']}",
                "skill_name": f"[{proj['level'].upper()}] {proj['title']}",
                "stage": RoadmapStage.PROJECTS.value,
                "priority": 4,
                "is_gap": True,
                "gap_severity": "moderate",
                "competency_state": "pending_submission",
                "uncertainty": 0.5,
                "prerequisites": proj.get("skills", []),
                "tools": role_data.get("tools", [])[:4],
                "resources": [],
                "projects": [proj["title"]],
                "estimated_effort_hours": proj.get("hours", 30),
                "recommendation_reason": f"Level {proj['level'].upper()} milestone applying role technologies: {', '.join(role_data.get('technologies', [])[:3])}."
            }
            stages[RoadmapStage.PROJECTS.value].append(p_node)
            total_effort_hours += proj.get("hours", 30)

        # Add Assessment Stage
        assessment_topics = role_data.get("assessment_topics", ["Core Technical Concepts", "Practical Problem Solving", "System Architecture & Design"])
        for idx, topic in enumerate(assessment_topics):
            a_node = {
                "skill_id": f"assess_{idx+1}",
                "skill_name": topic,
                "stage": RoadmapStage.ASSESSMENT.value,
                "priority": 5,
                "is_gap": True,
                "gap_severity": "low",
                "competency_state": "scheduled",
                "uncertainty": 0.8,
                "prerequisites": [],
                "tools": ["CareerGPT Adaptive Interview Agent"],
                "resources": [],
                "projects": [],
                "estimated_effort_hours": 5,
                "recommendation_reason": f"Recruitment evaluation benchmark for {role_data.get('title', target_role)}."
            }
            stages[RoadmapStage.ASSESSMENT.value].append(a_node)

        # Clean empty stages
        active_stages = {k: v for k, v in stages.items() if len(v) > 0}

        return {
            "branch": branch,
            "domain": domain,
            "target_role": role_data.get("title", target_role),
            "role_id": role_data.get("id"),
            "preferred_language": preferred_language,
            "preferred_technologies": preferred_technologies or role_data.get("technologies", [])[:4],
            "job_family": role_data.get("job_family", "Engineering"),
            "salary_range": role_data.get("salary_range", "Competitive"),
            "roadmap_source": role_data.get("roadmap_source", "roadmap.sh / O*NET / Industry Standards"),
            "projects_ladder": [
                {"tier": p.get("level", "").capitalize(), "title": p.get("title", ""), "skills": p.get("skills", []), "hours": p.get("hours", 30)}
                for p in projects_data
            ],
            "certifications": role_data.get("certifications", []),
            "assessment_topics": role_data.get("assessment_topics", []),
            "stages": active_stages,
            "project_ladder": role_data.get("projects", []),
            "curated_resources": role_data.get("resources", []),
            "certifications": role_data.get("certifications", []),
            "gap_explanations": gap_explanations,
            "summary": {
                "total_skills": len(required_skills),
                "skills_to_learn": skills_to_learn,
                "skills_known": skills_known,
                "estimated_hours": total_effort_hours,
                "stages_count": len(active_stages)
            }
        }

    def _parse_candidate_graph(self, graph_dict: Optional[Dict[str, Any]]) -> Tuple[Dict[str, str], Dict[str, float], Dict[str, List[str]]]:
        """Extract candidate's known competencies, uncertainties, and evidence sources."""
        states: Dict[str, str] = {}
        uncertainties: Dict[str, float] = {}
        sources: Dict[str, List[str]] = {}

        if not graph_dict or not graph_dict.get("nodes"):
            return states, uncertainties, sources

        for n in graph_dict["nodes"]:
            s_id = str(n.get("skill_id", "")).lower().replace(" ", "_").replace("-", "_")
            s_name = str(n.get("skill_name", "")).lower()
            state = str(n.get("competency_state", "unknown")).lower()
            unc = float(n.get("uncertainty", 1.0))

            ev_src = []
            if n.get("evidence_from_resume"):
                ev_src.append("Resume")
            if n.get("evidence_from_interview"):
                ev_src.append("Interview")

            for k in [s_id, s_name]:
                if k:
                    states[k] = state
                    uncertainties[k] = unc
                    sources[k] = ev_src

        return states, uncertainties, sources

    def _create_generic_role_data(self, branch: str, domain: str, target_role: str, language: str, technologies: List[str]) -> Dict[str, Any]:
        """Fallback builder if role not explicitly listed in graph."""
        return {
            "id": target_role.lower().replace(" ", "_"),
            "title": target_role,
            "branch_id": branch,
            "domain_id": domain.lower().replace(" ", "_"),
            "domain_name": domain,
            "description": f"Professional career path for {target_role} in {domain} ({branch}).",
            "salary_range": "₹5 - 16 LPA",
            "job_family": f"{domain} Engineering",
            "languages": [{"name": language, "relevance": "Primary", "reason": "Selected primary programming language."}],
            "technologies": technologies or ["Git", "Linux", "Core Tools"],
            "tools": ["Git", "VS Code", "Terminal"],
            "required_skills": [
                {"id": "engineering_foundations", "name": f"{branch} Core Engineering Foundations", "stage": "foundation", "prerequisites": []},
                {"id": "programming_fundamentals", "name": f"{language} Programming & Problem Solving", "stage": "foundation", "prerequisites": []},
                {"id": "domain_core_concepts", "name": f"{domain} Theoretical Principles", "stage": "core", "prerequisites": ["engineering_foundations"]},
                {"id": "applied_tooling", "name": f"Hands-on {', '.join(technologies[:2]) if technologies else 'Applied Tooling'}", "stage": "applied", "prerequisites": ["domain_core_concepts"]},
                {"id": "system_design_integration", "name": "Architecture, Testing & Quality Standards", "stage": "advanced", "prerequisites": ["applied_tooling"]}
            ],
            "projects": [
                {"level": "guided", "title": f"Basic {target_role} Verification Exercise", "skills": ["programming_fundamentals"], "hours": 20},
                {"level": "integrated", "title": f"End-to-End {domain} Functional Application", "skills": ["applied_tooling"], "hours": 40},
                {"level": "advanced", "title": f"Complex {target_role} Production Workflow", "skills": ["system_design_integration"], "hours": 65},
                {"level": "capstone", "title": f"Industry-Standard Capstone Project for {target_role}", "skills": ["system_design_integration"], "hours": 85}
            ],
            "resources": [
                {"title": f"Official {domain} Standards", "url": "https://roadmap.sh", "type": "roadmap", "provider": "Official Standards"}
            ],
            "certifications": [f"{domain} Professional Certificate"],
            "assessment_topics": [f"{target_role} Fundamentals", "Practical Case Study", "Architecture & Debugging"]
        }


# Global engine singleton
roadmap_engine = RoadmapEngine()
