"""
CareerGPT — Interview Agent (Agentic AI Loop Orchestrator)

This is the central agentic component that implements the complete
OBSERVE → DECIDE → ASK → ANALYZE → UPDATE → DECIDE AGAIN loop.
"""
import logging
import json
import uuid
from typing import Dict, List, Optional, Any
from datetime import datetime, timezone

from competency.graph import CompetencyGraph, CompetencyNodeData, CompetencyState, EvidenceItem
from uncertainty.estimator import CompetencyEstimator
from question_engine.policy import (
    InterviewPolicyEngine, AgentState, Question, QuestionType, Difficulty
)

logger = logging.getLogger(__name__)


class InterviewAgent:
    """
    The central agentic interview orchestrator.
    
    Implements the 3-module architecture:
    - Module 1: CompetencyGraph (persistent state)
    - Module 2: CompetencyEstimator (multimodal evidence)
    - Module 3: InterviewPolicyEngine (adaptive question selection)
    
    Agentic loop:
    OBSERVE → UNDERSTAND STATE → DECIDE → ASK → ANALYZE → UPDATE → REPEAT
    """

    def __init__(self, llm_provider=None):
        self.estimator = CompetencyEstimator()
        self.policy_engine = InterviewPolicyEngine(llm_provider=llm_provider)
        self.llm_provider = llm_provider
        self._active_sessions: Dict[str, Dict] = {}  # interview_id -> session data

    def initialize_session(
        self,
        user_id: str,
        interview_id: str,
        target_role: str,
        target_domain: str,
        branch: str,
        resume_skills: List[Dict],
        role_required_skills: List[str],
        max_questions: int = 15
    ) -> Dict[str, Any]:
        """
        Initialize interview session:
        1. Create competency graph
        2. Initialize with resume evidence
        3. Set unknown state for undemonstrated skills
        4. Create agent state
        """
        # Create competency graph
        graph = CompetencyGraph(
            user_id=user_id,
            target_role=target_role,
            target_domain=target_domain
        )

        # Initialize role-required skills
        for skill_name in role_required_skills:
            skill_id = skill_name.lower().replace(" ", "_").replace("-", "_")
            node = CompetencyNodeData(
                skill_id=skill_id,
                skill_name=skill_name,
                domain=target_domain,
                competency_state=CompetencyState.UNKNOWN,
                uncertainty=1.0
            )
            graph.add_skill(node)

        # Add prerequisite edges for backend developer
        self._add_role_edges(graph, target_role)

        # Process resume skills — ONLY add evidence if actually present
        for resume_skill in resume_skills:
            canonical_id = resume_skill.get("canonical_id", "")
            skill_name = resume_skill.get("skill_name", "")
            confidence = resume_skill.get("confidence", 0.7)

            if not canonical_id:
                continue

            # Add to graph if not already there
            if canonical_id not in [n.skill_id for n in graph.get_all_nodes()]:
                node = CompetencyNodeData(
                    skill_id=canonical_id,
                    skill_name=skill_name,
                    domain=target_domain,
                    competency_state=CompetencyState.UNKNOWN,
                    uncertainty=1.0
                )
                graph.add_skill(node)

            # Add resume evidence — this is real evidence, not fabricated
            evidence = EvidenceItem(
                source_type="resume",
                source_id=f"resume_{user_id}",
                timestamp=datetime.now(timezone.utc).isoformat(),
                score=confidence * 0.7,  # resume mention ≠ full competency
                reliability=0.6,   # resume is self-reported, reliability is moderate
                raw_data={"resume_skill": resume_skill}
            )
            graph.update_from_evidence(canonical_id, evidence)

        # Create agent state
        agent_state = AgentState(
            user_id=user_id,
            interview_id=interview_id,
            target_role=target_role,
            target_domain=target_domain,
            branch=branch,
            max_questions=max_questions,
            min_questions=5
        )

        # Store session
        self._active_sessions[interview_id] = {
            "graph": graph,
            "agent_state": agent_state,
            "history": []
        }

        logger.info(f"[AGENT] Session initialized: {interview_id}, "
                    f"skills: {graph.graph.number_of_nodes()}, "
                    f"role: {target_role}")

        return {
            "session_id": interview_id,
            "graph_summary": graph.summary(),
            "initial_graph": graph.to_dict(),
            "skill_gaps": graph.get_skill_gaps(role_required_skills),
            "status": "ready"
        }

    def _add_role_edges(self, graph: CompetencyGraph, target_role: str):
        """Add prerequisite edges based on target role."""
        ROLE_PREREQUISITES = {
            "Backend Developer": [
                ("java", "spring_boot"),
                ("java", "rest_api"),
                ("spring_boot", "postgresql"),
                ("data_structures", "system_design"),
            ],
            "Data Scientist": [
                ("python", "machine_learning"),
                ("sql", "machine_learning"),
                ("machine_learning", "deep_learning"),
            ],
            "Full Stack Developer": [
                ("javascript", "react"),
                ("nodejs", "rest_api"),
                ("rest_api", "postgresql"),
            ]
        }

        edges = ROLE_PREREQUISITES.get(target_role, [])
        for from_skill, to_skill in edges:
            if from_skill in graph.graph.nodes and to_skill in graph.graph.nodes:
                graph.add_edge(from_skill, to_skill, relation_type="prerequisite")

    async def get_next_question(self, interview_id: str) -> Dict[str, Any]:
        """
        Main agentic loop step: get next question.
        
        OBSERVE → DECIDE → SELECT QUESTION
        """
        session = self._active_sessions.get(interview_id)
        if not session:
            return {"error": "Interview session not found"}

        graph: CompetencyGraph = session["graph"]
        state: AgentState = session["agent_state"]

        # ── OBSERVE ────────────────────────────────────────────
        observation = self.policy_engine.observe_state(state, graph)

        # ── DECIDE ────────────────────────────────────────────
        decision = self.policy_engine.decide_next_action(state, observation, graph)

        logger.info(f"[AGENT DECIDE] Action: {decision['action']}, "
                    f"Reason: {decision.get('reason', '')}")

        if decision["action"] == "conclude":
            return {
                "action": "conclude",
                "reason": decision["reason"],
                "summary": graph.summary(),
                "observation": observation
            }

        # ── SELECT QUESTION ────────────────────────────────────
        if decision["action"] == "ask_follow_up":
            question = state.followup_queue.pop(0)
        else:
            skill_id = decision.get("skill_id")
            if not skill_id:
                return {"action": "conclude", "reason": "No skill to assess"}

            skill_node = graph.get_node(skill_id)
            skill_name = skill_node.skill_name if skill_node else skill_id

            question = self.policy_engine.select_question(skill_id, state, graph, observation)

            if not question:
                question = await self.policy_engine.generate_question_with_llm(
                    skill_id=skill_id,
                    skill_name=skill_name,
                    difficulty=self.policy_engine._select_difficulty(state.performance_trajectory),
                    target_role=state.target_role,
                    asked_questions=[q.question_text for q in session["history"][-3:]],
                    competency_state=skill_node.competency_state.value if skill_node else "unknown"
                )

        if not question:
            return {"action": "conclude", "reason": "No suitable question found"}

        # Track what we're asking
        state.current_skill_focus = question.skill_id
        session["agent_state"] = state

        return {
            "action": "ask",
            "question": {
                "question_id": question.question_id,
                "question_text": question.question_text,
                "question_type": question.question_type.value,
                "difficulty": question.difficulty.value,
                "skill_id": question.skill_id,
                "skill_name": question.skill_name,
                "source": question.source
            },
            "progress": {
                "questions_asked": state.questions_asked,
                "max_questions": state.max_questions,
                "percent": round(state.questions_asked / state.max_questions * 100)
            },
            "agent_reasoning": {
                "observation": observation,
                "decision": decision.get("reason", "")
            }
        }

    async def submit_answer(
        self,
        interview_id: str,
        question_id: str,
        question_text: str,
        skill_id: str,
        answer_text: str,
        audio_path: Optional[str] = None,
        audio_duration: float = 0.0,
        frame_paths: Optional[List[str]] = None,
        expected_concepts: Optional[List[str]] = None,
        evaluation_rubric: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Process a submitted answer through the full pipeline:
        ASK → ANALYZE → UPDATE → DECIDE NEXT
        """
        session = self._active_sessions.get(interview_id)
        if not session:
            return {"error": "Interview session not found"}

        graph: CompetencyGraph = session["graph"]
        state: AgentState = session["agent_state"]

        # ── ANALYZE (Module 2) ─────────────────────────────────
        estimation = await self.estimator.estimate(
            question_text=question_text,
            answer_text=answer_text,
            expected_concepts=expected_concepts or [],
            evaluation_rubric=evaluation_rubric or {},
            audio_path=audio_path,
            audio_duration=audio_duration,
            frame_paths=frame_paths,
            llm_provider=self.llm_provider
        )

        fused_score = estimation["fused_evidence"]["fused_score"]
        follow_up_needed = (
            estimation.get("text_analysis", {}).get("follow_up_needed", False)
            if estimation.get("text_analysis") else False
        )

        # ── UPDATE GRAPH (Module 1) ────────────────────────────
        # Find or create the skill node
        if skill_id not in graph.graph.nodes:
            node = CompetencyNodeData(
                skill_id=skill_id,
                skill_name=state.current_skill_focus or skill_id,
                domain=state.target_domain,
                competency_state=CompetencyState.UNKNOWN,
                uncertainty=1.0
            )
            graph.add_skill(node)

        evidence = EvidenceItem(
            source_type="interview_text",
            source_id=f"{interview_id}_{question_id}",
            timestamp=datetime.now(timezone.utc).isoformat(),
            score=fused_score,
            reliability=estimation["fused_evidence"]["reliability"],
            raw_data={
                "question_id": question_id,
                "fused_score": fused_score,
                "modalities": estimation["fused_evidence"]["modalities_used"]
            }
        )

        delta = graph.update_from_evidence(skill_id, evidence)

        # Add speech evidence if available
        if estimation.get("speech_analysis"):
            speech_evidence = EvidenceItem(
                source_type="interview_speech",
                source_id=f"{interview_id}_{question_id}_speech",
                timestamp=datetime.now(timezone.utc).isoformat(),
                score=estimation["speech_analysis"]["confidence_score"],
                reliability=0.5,
                raw_data=estimation["speech_analysis"]
            )
            graph.update_from_evidence(skill_id, speech_evidence)

        # ── UPDATE AGENT STATE ─────────────────────────────────
        question_obj = Question(
            question_id=question_id,
            skill_id=skill_id,
            skill_name=state.current_skill_focus or skill_id,
            question_text=question_text,
            question_type=QuestionType.CONCEPTUAL,
            difficulty=Difficulty.MEDIUM,
        )

        state = self.policy_engine.update_state_after_answer(
            state=state,
            question=question_obj,
            fused_score=fused_score,
            follow_up_needed=follow_up_needed
        )

        session["agent_state"] = state
        session["history"].append(question_obj)

        # Store in session for history
        session["history"][-1] = {
            "question_id": question_id,
            "question_text": question_text,
            "skill_id": skill_id,
            "answer_text": answer_text[:200],  # truncate for storage
            "fused_score": fused_score,
            "competency_delta": delta
        }

        return {
            "analysis": estimation,
            "competency_delta": delta,
            "graph_summary": graph.summary(),
            "agent_state": {
                "questions_asked": state.questions_asked,
                "max_questions": state.max_questions,
                "follow_up_needed": follow_up_needed,
                "performance_trajectory": state.performance_trajectory[-5:]
            }
        }

    def get_session_graph(self, interview_id: str) -> Optional[Dict]:
        """Get current competency graph for an interview session."""
        session = self._active_sessions.get(interview_id)
        if not session:
            return None
        return session["graph"].to_dict()

    def get_final_report_data(self, interview_id: str) -> Optional[Dict]:
        """Generate final report data from interview session."""
        session = self._active_sessions.get(interview_id)
        if not session:
            return None

        graph: CompetencyGraph = session["graph"]
        state: AgentState = session["agent_state"]

        nodes = graph.get_all_nodes()

        # Categorize skills
        strong = [n for n in nodes if n.competency_state == CompetencyState.STRONG]
        demonstrated = [n for n in nodes if n.competency_state == CompetencyState.DEMONSTRATED]
        developing = [n for n in nodes if n.competency_state == CompetencyState.DEVELOPING]
        emerging = [n for n in nodes if n.competency_state == CompetencyState.EMERGING]
        unknown = [n for n in nodes if n.competency_state == CompetencyState.UNKNOWN]

        # Calculate readiness components (transparent formula)
        total_required = len(nodes)
        assessed_count = len([n for n in nodes if n.competency_state != CompetencyState.UNKNOWN])
        avg_score = sum(
            n.competency_score for n in nodes if n.competency_score is not None
        ) / max(len([n for n in nodes if n.competency_score is not None]), 1)
        avg_uncertainty = sum(n.uncertainty for n in nodes) / max(total_required, 1)

        # Readiness score formula (transparent)
        coverage = assessed_count / max(total_required, 1)
        performance = avg_score if assessed_count > 0 else 0.0
        certainty = 1 - avg_uncertainty

        # Weighted readiness (formula is exposed to user)
        readiness = round(
            0.4 * performance + 0.35 * coverage + 0.25 * certainty,
            3
        )

        return {
            "candidate": {"user_id": state.user_id},
            "interview": {
                "id": interview_id,
                "target_role": state.target_role,
                "target_domain": state.target_domain,
                "questions_asked": state.questions_asked,
                "performance_trajectory": state.performance_trajectory
            },
            "competency_summary": {
                "strong": [n.to_dict() for n in strong],
                "demonstrated": [n.to_dict() for n in demonstrated],
                "developing": [n.to_dict() for n in developing],
                "emerging": [n.to_dict() for n in emerging],
                "unknown": [n.to_dict() for n in unknown],
            },
            "readiness": {
                "score": readiness,
                "formula": "0.4 × performance + 0.35 × coverage + 0.25 × certainty",
                "components": {
                    "performance": round(performance, 3),
                    "coverage": round(coverage, 3),
                    "certainty": round(certainty, 3)
                },
                "note": "This score reflects demonstrated evidence only. Unknown skills are not assumed to be any specific level."
            },
            "question_history": session["history"],
            "graph": graph.to_dict(),
            "skill_gaps": {
                "assessed": assessed_count,
                "unknown": len(unknown),
                "total_required": total_required
            }
        }
