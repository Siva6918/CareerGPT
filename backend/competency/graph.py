"""
CareerGPT — Dynamic Candidate Competency Graph (Module 1)

Maintains a persistent, evidence-based graph of candidate competencies.
NEVER fabricates skill scores — unknown evidence = UNKNOWN state.
"""
import networkx as nx
import json
import logging
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass, field, asdict
from enum import Enum
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


class CompetencyState(str, Enum):
    UNKNOWN = "unknown"
    EMERGING = "emerging"
    DEVELOPING = "developing"
    DEMONSTRATED = "demonstrated"
    STRONG = "strong"

    @classmethod
    def from_score(cls, score: Optional[float]) -> "CompetencyState":
        """Convert numeric score to competency state."""
        if score is None:
            return cls.UNKNOWN
        if score < 0.25:
            return cls.EMERGING
        elif score < 0.5:
            return cls.DEVELOPING
        elif score < 0.75:
            return cls.DEMONSTRATED
        else:
            return cls.STRONG


@dataclass
class EvidenceItem:
    source_type: str          # resume | interview_text | interview_speech | project | certification
    source_id: str
    timestamp: str
    score: float              # 0-1
    reliability: float        # how reliable is this evidence
    raw_data: Dict = field(default_factory=dict)


@dataclass
class CompetencyNodeData:
    """Data stored at each node in the competency graph."""
    skill_id: str
    skill_name: str
    branch: str = ""
    domain: str = ""
    category: str = ""        # language | framework | concept | tool | soft_skill

    # CRITICAL: competency and uncertainty are separate
    competency_state: CompetencyState = CompetencyState.UNKNOWN
    competency_score: Optional[float] = None   # None = not yet assessed

    # Uncertainty is high when evidence is absent or conflicting
    uncertainty: float = 1.0   # 0 = certain, 1 = completely unknown

    # Evidence tracking
    evidence: List[EvidenceItem] = field(default_factory=list)
    evidence_count: int = 0

    # Source flags
    evidence_from_resume: bool = False
    evidence_from_interview: bool = False
    evidence_from_project: bool = False
    evidence_from_certification: bool = False

    last_assessed: Optional[str] = None
    prerequisite_skills: List[str] = field(default_factory=list)
    related_roles: List[str] = field(default_factory=list)
    roadmap_stage: Optional[str] = None

    def to_dict(self) -> Dict:
        d = asdict(self)
        d["competency_state"] = self.competency_state.value
        return d


class CompetencyGraph:
    """
    Module 1: Dynamic Candidate Competency Graph

    Uses NetworkX directed graph.
    Architecture is compatible with Neo4j for future expansion.

    Edge types:
    - prerequisite: A must be learned before B
    - depends_on: B requires A
    - required_by_role: needed for target role
    - related_skill: semantically related
    - demonstrated_by: skill demonstrated by a project/cert
    - assessed_by: skill assessed by a question
    """

    def __init__(self, user_id: str, target_role: str = "", target_domain: str = ""):
        self.user_id = user_id
        self.target_role = target_role
        self.target_domain = target_domain
        self.graph = nx.DiGraph()
        self._skill_id_map: Dict[str, str] = {}   # name -> skill_id
        logger.info(f"CompetencyGraph initialized for user {user_id}")

    # ─── Node Management ───────────────────────────────────────

    def add_skill(self, node: CompetencyNodeData) -> str:
        """Add or update a skill node."""
        skill_id = node.skill_id
        self.graph.add_node(skill_id, **node.to_dict())
        self._skill_id_map[node.skill_name.lower()] = skill_id
        return skill_id

    def get_node(self, skill_id: str) -> Optional[CompetencyNodeData]:
        if skill_id not in self.graph.nodes:
            return None
        data = self.graph.nodes[skill_id]
        node = CompetencyNodeData(
            skill_id=data.get("skill_id", skill_id),
            skill_name=data.get("skill_name", skill_id),
        )
        for key, val in data.items():
            if hasattr(node, key):
                if key == "competency_state":
                    val = CompetencyState(val) if val else CompetencyState.UNKNOWN
                setattr(node, key, val)
        return node

    def get_skill_id(self, skill_name: str) -> Optional[str]:
        return self._skill_id_map.get(skill_name.lower())

    def get_all_nodes(self) -> List[CompetencyNodeData]:
        nodes = []
        for skill_id in self.graph.nodes:
            node = self.get_node(skill_id)
            if node:
                nodes.append(node)
        return nodes

    # ─── Edge Management ───────────────────────────────────────

    def add_edge(self, from_skill_id: str, to_skill_id: str, relation_type: str, **attrs):
        """Add a typed edge between skills."""
        self.graph.add_edge(from_skill_id, to_skill_id, relation_type=relation_type, **attrs)

    def get_prerequisites(self, skill_id: str) -> List[str]:
        """Get all prerequisite skill IDs for a given skill."""
        return [
            u for u, v, data in self.graph.in_edges(skill_id, data=True)
            if data.get("relation_type") in ("prerequisite", "depends_on")
        ]

    def get_dependents(self, skill_id: str) -> List[str]:
        """Get skills that depend on this skill."""
        return [
            v for u, v, data in self.graph.out_edges(skill_id, data=True)
            if data.get("relation_type") in ("prerequisite", "depends_on")
        ]

    # ─── Evidence Update (Core Loop Update Step) ───────────────

    def update_from_evidence(
        self,
        skill_id: str,
        evidence: EvidenceItem,
        recalculate: bool = True
    ) -> Dict[str, Any]:
        """
        Update competency node from new evidence.
        Returns delta showing what changed.
        """
        if skill_id not in self.graph.nodes:
            logger.warning(f"Skill {skill_id} not in graph — cannot update")
            return {}

        node = self.get_node(skill_id)
        prev_state = node.competency_state
        prev_uncertainty = node.uncertainty

        # Add evidence
        node.evidence.append(evidence)
        node.evidence_count += 1
        node.last_assessed = datetime.now(timezone.utc).isoformat()

        # Update source flags
        if evidence.source_type == "resume":
            node.evidence_from_resume = True
        elif evidence.source_type.startswith("interview"):
            node.evidence_from_interview = True
        elif evidence.source_type == "project":
            node.evidence_from_project = True
        elif evidence.source_type == "certification":
            node.evidence_from_certification = True

        if recalculate:
            self._recalculate_competency(node)

        # Save back to graph
        self.graph.nodes[skill_id].update(node.to_dict())

        return {
            "skill_id": skill_id,
            "skill_name": node.skill_name,
            "prev_state": prev_state.value,
            "new_state": node.competency_state.value,
            "prev_uncertainty": round(prev_uncertainty, 3),
            "new_uncertainty": round(node.uncertainty, 3),
            "evidence_count": node.evidence_count
        }

    def _recalculate_competency(self, node: CompetencyNodeData):
        """
        Transparent evidence fusion for competency score + uncertainty.

        Formula:
        weighted_score = Σ(evidence.score * evidence.reliability * recency_weight) / Σ(weights)
        uncertainty = max(0, 1 - log(1 + evidence_count * mean_reliability) / log(10))

        Text/interview evidence weighted more than vision.
        """
        if not node.evidence:
            node.competency_score = None
            node.uncertainty = 1.0
            node.competency_state = CompetencyState.UNKNOWN
            return

        SOURCE_WEIGHTS = {
            "resume": 0.6,
            "interview_text": 1.0,
            "interview_speech": 0.4,
            "interview_vision": 0.15,   # auxiliary only
            "project": 0.9,
            "certification": 0.8,
        }

        import math
        total_weight = 0.0
        weighted_sum = 0.0
        total_reliability = 0.0

        # Recency weighting — more recent evidence counts more
        if len(node.evidence) > 1:
            recency_weights = [0.5 + 0.5 * (i / (len(node.evidence) - 1))
                               for i in range(len(node.evidence))]
        else:
            recency_weights = [1.0]

        for ev, rec_w in zip(node.evidence, recency_weights):
            src_w = SOURCE_WEIGHTS.get(ev.source_type, 0.7)
            combined_w = src_w * ev.reliability * rec_w
            weighted_sum += ev.score * combined_w
            total_weight += combined_w
            total_reliability += ev.reliability

        if total_weight > 0:
            node.competency_score = round(weighted_sum / total_weight, 3)
        else:
            node.competency_score = None

        # Uncertainty decreases as more reliable evidence accumulates
        mean_reliability = total_reliability / len(node.evidence)
        n = len(node.evidence)
        node.uncertainty = max(0.0, round(
            1 - math.log(1 + n * mean_reliability) / math.log(10 + n), 3
        ))

        # Update state from score
        node.competency_state = CompetencyState.from_score(node.competency_score)

    # ─── Query Methods ─────────────────────────────────────────

    def get_unknown_skills(self) -> List[CompetencyNodeData]:
        return [n for n in self.get_all_nodes()
                if n.competency_state == CompetencyState.UNKNOWN]

    def get_high_uncertainty_skills(self, threshold: float = 0.7) -> List[CompetencyNodeData]:
        return [n for n in self.get_all_nodes() if n.uncertainty >= threshold]

    def get_skill_gaps(self, role_required_skills: List[str]) -> Dict[str, Any]:
        """
        Identify skill gaps relative to role requirements.
        Returns structured gap analysis — never fabricated scores.
        """
        gaps = {"critical": [], "moderate": [], "low": [], "satisfied": []}

        for skill_name in role_required_skills:
            skill_id = self.get_skill_id(skill_name)
            if skill_id is None:
                # Skill not even in graph = unknown
                gaps["critical"].append({
                    "skill": skill_name,
                    "state": "unknown",
                    "uncertainty": 1.0,
                    "reason": "No evidence found in any source"
                })
                continue

            node = self.get_node(skill_id)
            if not node:
                continue

            entry = {
                "skill": skill_name,
                "skill_id": skill_id,
                "state": node.competency_state.value,
                "score": node.competency_score,
                "uncertainty": node.uncertainty,
                "evidence_count": node.evidence_count
            }

            if node.competency_state in (CompetencyState.UNKNOWN, CompetencyState.EMERGING):
                gaps["critical"].append(entry)
            elif node.competency_state == CompetencyState.DEVELOPING:
                gaps["moderate"].append(entry)
            elif node.competency_state == CompetencyState.DEMONSTRATED:
                gaps["low"].append(entry)
            else:
                gaps["satisfied"].append(entry)

        return gaps

    def get_next_assessment_priority(
        self,
        role_skill_weights: Dict[str, float],
        asked_skill_ids: List[str],
        budget: int = 10
    ) -> List[Tuple[str, float]]:
        """
        Module 3 integration: compute priority scores for next evidence acquisition.

        Priority = uncertainty * role_importance * info_gain_estimate * prereq_factor
        """
        priorities = []

        for skill_id in self.graph.nodes:
            if skill_id in asked_skill_ids:
                continue

            node = self.get_node(skill_id)
            if not node:
                continue

            # Component 1: Uncertainty (high uncertainty = need more evidence)
            uncertainty_score = node.uncertainty

            # Component 2: Role importance
            role_importance = role_skill_weights.get(node.skill_name, 0.3)

            # Component 3: Expected information gain
            # Higher if: unknown, few evidence, high uncertainty
            info_gain = uncertainty_score * (1 - node.evidence_count / max(budget, 1))

            # Component 4: Prerequisite completeness factor
            # Prefer skills whose prerequisites are already demonstrated
            prereqs = self.get_prerequisites(skill_id)
            prereq_satisfaction = 0.5
            if prereqs:
                satisfied = sum(
                    1 for pid in prereqs
                    if self.get_node(pid) and
                    self.get_node(pid).competency_state in
                    (CompetencyState.DEMONSTRATED, CompetencyState.STRONG)
                )
                prereq_satisfaction = satisfied / len(prereqs)

            priority = (
                0.35 * uncertainty_score +
                0.30 * role_importance +
                0.20 * info_gain +
                0.15 * prereq_satisfaction
            )

            priorities.append((skill_id, round(priority, 4)))

        return sorted(priorities, key=lambda x: x[1], reverse=True)

    def to_dict(self) -> Dict:
        """Serialize graph to dictionary (for API response)."""
        return {
            "user_id": self.user_id,
            "target_role": self.target_role,
            "target_domain": self.target_domain,
            "node_count": self.graph.number_of_nodes(),
            "edge_count": self.graph.number_of_edges(),
            "nodes": [n.to_dict() for n in self.get_all_nodes()],
            "edges": [
                {
                    "from": u,
                    "to": v,
                    "relation_type": data.get("relation_type", "related"),
                }
                for u, v, data in self.graph.edges(data=True)
            ]
        }

    def summary(self) -> Dict:
        """Quick summary for dashboard."""
        nodes = self.get_all_nodes()
        state_counts = {}
        for state in CompetencyState:
            state_counts[state.value] = sum(1 for n in nodes if n.competency_state == state)

        return {
            "total_skills": len(nodes),
            "state_distribution": state_counts,
            "avg_uncertainty": round(
                sum(n.uncertainty for n in nodes) / len(nodes), 3
            ) if nodes else 1.0,
            "high_uncertainty_count": sum(1 for n in nodes if n.uncertainty > 0.7),
        }
