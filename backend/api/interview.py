"""
CareerGPT — Interview API

Implements the complete agentic interview loop:
OBSERVE → DECIDE → ASK → ANALYZE → UPDATE → REPEAT
"""
import uuid
import logging
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from pydantic import BaseModel

from database.connection import get_db
from api.auth import get_current_user
from models.models import (
    User, Interview, InterviewAnswer, InterviewQuestion,
    InterviewStatus, CompetencyNode, CompetencyEvidence, CompetencyState,
    Roadmap, RoadmapNode, RoadmapStage
)
from roadmap.engine import RoadmapEngine
from agents.interview_agent import InterviewAgent
from llm.provider import get_llm_provider
from llm.provider import get_llm_provider
from config import settings
from core.security import rate_limit

router = APIRouter()
logger = logging.getLogger(__name__)

# In-memory agent instances (in production, use Redis)
_interview_agents: Dict[str, InterviewAgent] = {}


def get_agent(interview_id: str) -> InterviewAgent:
    if interview_id not in _interview_agents:
        _interview_agents[interview_id] = InterviewAgent(llm_provider=get_llm_provider())
    return _interview_agents[interview_id]

def get_or_recreate_agent(interview_id: str, user_id: str, db: Session) -> Optional[InterviewAgent]:
    agent = _interview_agents.get(interview_id)
    if agent:
        return agent

    interview = db.query(Interview).filter(
        Interview.id == interview_id,
        Interview.user_id == user_id
    ).first()

    if not interview or interview.status == InterviewStatus.COMPLETED:
        return None

    logger.info(f"Recreating agent state for interview {interview_id} from DB")
    agent = InterviewAgent(llm_provider=get_llm_provider())
    
    from competency.graph import CompetencyGraph, CompetencyNodeData
    from question_engine.policy import AgentState
    
    graph = CompetencyGraph(
        user_id=user_id,
        target_role=interview.target_role,
        target_domain=interview.target_domain
    )
    
    nodes = db.query(CompetencyNode).filter(CompetencyNode.user_id == user_id).all()
    for n in nodes:
        node = CompetencyNodeData(
            skill_id=n.skill_id,
            skill_name=n.skill_name,
            domain=n.domain or interview.target_domain,
            competency_state=n.competency_state,
            uncertainty=n.uncertainty
        )
        graph.add_skill(node)
        
    # Private method call, but needed to restore graph state
    agent._add_role_edges(graph, interview.target_role)
    
    state = AgentState(
        user_id=user_id,
        interview_id=interview_id,
        target_role=interview.target_role,
        target_domain=interview.target_domain,
        branch=interview.branch,
        max_questions=interview.max_questions,
        questions_asked=interview.questions_asked
    )
    
    answers = db.query(InterviewAnswer).filter(InterviewAnswer.interview_id == interview_id).order_by(InterviewAnswer.answered_at).all()
    
    history = []
    for ans in answers:
        if ans.question_id:
            state.asked_question_ids.append(ans.question_id)
            state.answered_question_ids.append(ans.question_id)
            
        score = ans.fused_evidence.get("fused_score", 0) if ans.fused_evidence else 0
        state.performance_trajectory.append(score)
            
        history.append({
            "question_id": ans.question_id or "unknown",
            "question_text": ans.question_text or "",
            "answer_text": (ans.answer_text or "")[:200],
            "fused_score": score,
        })
        
    agent._active_sessions[interview_id] = {
        "graph": graph,
        "agent_state": state,
        "history": history
    }
    return agent


# ── Schemas ──────────────────────────────────────────────────

class StartInterviewRequest(BaseModel):
    target_role: str
    target_domain: str
    branch: str
    resume_id: Optional[str] = None
    max_questions: int = 15
    preferred_language: Optional[str] = "Python"
    preferred_technologies: List[str] = []


class SubmitAnswerRequest(BaseModel):
    interview_id: str
    question_id: str
    question_text: str
    skill_id: str
    answer_text: str
    audio_duration: float = 0.0
    expected_concepts: List[str] = []
    evaluation_rubric: Dict = {}


class NextQuestionRequest(BaseModel):
    interview_id: str


# ── Role required skills mapping ─────────────────────────────

ROLE_REQUIRED_SKILLS = {
    "Backend Developer": [
        "java", "spring_boot", "postgresql", "rest_api",
        "data_structures", "system_design", "docker"
    ],
    "Full Stack Developer": [
        "javascript", "react", "nodejs", "rest_api", "postgresql",
        "html_css", "docker"
    ],
    "Data Scientist": [
        "python", "machine_learning", "statistics", "sql",
        "deep_learning", "data_visualization"
    ],
    "AI Engineer": [
        "python", "machine_learning", "deep_learning", "pytorch",
        "llm", "transformers"
    ],
    "Frontend Developer": [
        "javascript", "react", "html_css", "typescript", "rest_api"
    ],
    "Mobile Developer": [
        "kotlin", "android", "rest_api", "ui_design"
    ],
    "VLSI Engineer": [
        "verilog", "vhdl", "fpga", "digital_electronics", "asic_flow"
    ],
    "Embedded Systems Engineer": [
        "c", "embedded_c", "rtos", "arm_cortex", "uart_spi_i2c"
    ],
}


# ── Routes ────────────────────────────────────────────────────

@router.post("/start", dependencies=[Depends(rate_limit(requests=5, window=3600))])
async def start_interview(
    request: StartInterviewRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Start a new adaptive interview session.
    Initializes the competency graph with resume evidence.
    """
    interview_id = str(uuid.uuid4())
    
    # Get resume skills (from DB or demo)
    resume_skills = []
    if request.resume_id:
        from models.models import Resume
        resume = db.query(Resume).filter(
            Resume.id == request.resume_id,
            Resume.user_id == current_user.id
        ).first()
        if resume and resume.parsed_data:
            resume_skills = resume.parsed_data.get("skills", [])
    
    if not resume_skills and settings.demo_mode:
        from resume.parser import DemoResumeParser
        demo_parser = DemoResumeParser()
        demo_data = demo_parser.get_demo_data(request.target_role)
        resume_skills = demo_data.get("skills", [])
    
    # Get required skills for target role
    role_key = request.target_role
    role_required = ROLE_REQUIRED_SKILLS.get(role_key, [
        "programming_fundamentals", "data_structures", "problem_solving"
    ])
    
    # Initialize interview agent
    agent = InterviewAgent(llm_provider=get_llm_provider())
    _interview_agents[interview_id] = agent
    
    # Initialize session
    session_data = agent.initialize_session(
        user_id=current_user.id,
        interview_id=interview_id,
        target_role=request.target_role,
        target_domain=request.target_domain,
        branch=request.branch,
        resume_skills=resume_skills,
        role_required_skills=role_required,
        max_questions=request.max_questions
    )
    
    # Save to database
    interview = Interview(
        id=interview_id,
        user_id=current_user.id,
        target_role=request.target_role,
        target_domain=request.target_domain,
        branch=request.branch,
        status=InterviewStatus.IN_PROGRESS,
        max_questions=request.max_questions
    )
    db.add(interview)
    
    # Initialize or update competency nodes from session
    for node_data in session_data.get("initial_graph", {}).get("nodes", []):
        existing_node = db.query(CompetencyNode).filter(
            CompetencyNode.user_id == current_user.id,
            CompetencyNode.skill_id == node_data["skill_id"]
        ).first()
        if existing_node:
            existing_node.skill_name = node_data["skill_name"]
            existing_node.competency_state = node_data["competency_state"]
            existing_node.uncertainty = node_data["uncertainty"]
            if node_data.get("evidence_from_resume"):
                existing_node.evidence_from_resume = True
        else:
            comp_node = CompetencyNode(
                user_id=current_user.id,
                skill_id=node_data["skill_id"],
                skill_name=node_data["skill_name"],
                competency_state=node_data["competency_state"],
                uncertainty=node_data["uncertainty"],
                evidence_from_resume=node_data.get("evidence_from_resume", False)
            )
            db.add(comp_node)
    
    db.commit()
    
    return {
        "interview_id": interview_id,
        "status": "started",
        "target_role": request.target_role,
        "demo_mode": settings.demo_mode,
        "session": session_data,
        "message": "Interview session initialized. Use /interview/next-question to get the first question."
    }


@router.post("/next-question")
async def get_next_question(
    request: NextQuestionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get the next adaptive question from the interview policy engine.
    Implements: OBSERVE → DECIDE → SELECT QUESTION
    """
    agent = get_or_recreate_agent(request.interview_id, current_user.id, db)
    
    if not agent:
        # Recreate agent from DB if not in memory
        interview = db.query(Interview).filter(
            Interview.id == request.interview_id,
            Interview.user_id == current_user.id
        ).first()
        if not interview:
            raise HTTPException(status_code=404, detail="Interview not found")
        
        if interview.status == InterviewStatus.COMPLETED:
            return {"action": "conclude", "reason": "Interview already completed"}
        
        # Return demo question in fallback mode
        if settings.demo_mode:
            return _get_demo_question(db, request.interview_id)
        
        raise HTTPException(status_code=404, detail="Interview session expired. Please start a new interview.")
    
    result = await agent.get_next_question(request.interview_id)
    
    if result.get("action") == "conclude":
        # Mark interview as completed
        interview = db.query(Interview).filter(Interview.id == request.interview_id).first()
        if interview:
            interview.status = InterviewStatus.COMPLETED
            db.commit()
    
    return result


@router.post("/answer", dependencies=[Depends(rate_limit(requests=30, window=3600))])
async def submit_answer(
    request: SubmitAnswerRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Submit an answer and trigger the analysis + graph update.
    Implements: ANALYZE → UPDATE GRAPH → RECALCULATE UNCERTAINTY
    """
    agent = get_or_recreate_agent(request.interview_id, current_user.id, db)
    
    if not agent:
        # Fallback demo analysis
        if settings.demo_mode:
            return _demo_answer_analysis(request)
        raise HTTPException(status_code=404, detail="Interview session not found")
    
    result = await agent.submit_answer(
        interview_id=request.interview_id,
        question_id=request.question_id,
        question_text=request.question_text,
        skill_id=request.skill_id,
        answer_text=request.answer_text,
        audio_duration=request.audio_duration,
        expected_concepts=request.expected_concepts,
        evaluation_rubric=request.evaluation_rubric
    )
    
    # Check if question exists in DB to prevent ForeignKey IntegrityError
    valid_q_id = None
    if request.question_id and not request.question_id.startswith("llm_") and not request.question_id.startswith("fallback_"):
        exists = db.query(InterviewQuestion).filter(InterviewQuestion.id == request.question_id).first()
        if exists:
            valid_q_id = request.question_id
            
    # Save answer to database
    answer = InterviewAnswer(
        interview_id=request.interview_id,
        question_id=valid_q_id,
        question_text=request.question_text,
        answer_text=request.answer_text,
        text_analysis=result.get("analysis", {}).get("text_analysis"),
        speech_analysis=result.get("analysis", {}).get("speech_analysis"),
        vision_analysis=result.get("analysis", {}).get("vision_analysis"),
        fused_evidence=result.get("analysis", {}).get("fused_evidence"),
        competency_delta=result.get("competency_delta")
    )
    db.add(answer)
    db.flush()

    # Update or insert CompetencyNode in PostgreSQL
    comp_delta = result.get("competency_delta", {})
    analysis = result.get("analysis", {})
    fused_evidence = analysis.get("fused_evidence", {})
    fused_score = fused_evidence.get("fused_score")

    comp_node = db.query(CompetencyNode).filter(
        CompetencyNode.user_id == current_user.id,
        CompetencyNode.skill_id == request.skill_id
    ).first()

    raw_state = comp_delta.get("new_state")
    state_enum = CompetencyState.DEVELOPING
    if raw_state:
        try:
            state_enum = CompetencyState(raw_state)
        except Exception:
            state_enum = CompetencyState.DEVELOPING

    if not comp_node:
        comp_node = CompetencyNode(
            user_id=current_user.id,
            skill_id=request.skill_id,
            skill_name=comp_delta.get("skill_name") or request.skill_id.replace("_", " ").title(),
            competency_state=state_enum,
            competency_score=fused_score,
            uncertainty=comp_delta.get("new_uncertainty", 0.5),
            evidence_count=1,
            evidence_from_interview=True,
            last_assessed=datetime.now(timezone.utc)
        )
        db.add(comp_node)
        db.flush()
    else:
        if raw_state:
            comp_node.competency_state = state_enum
        if fused_score is not None:
            comp_node.competency_score = fused_score
        if comp_delta.get("new_uncertainty") is not None:
            comp_node.uncertainty = comp_delta["new_uncertainty"]
        comp_node.evidence_count = (comp_node.evidence_count or 0) + 1
        comp_node.evidence_from_interview = True
        comp_node.last_assessed = datetime.now(timezone.utc)

    # Save CompetencyEvidence
    evidence_rec = CompetencyEvidence(
        node_id=comp_node.id,
        source_type="interview_text",
        source_id=answer.id,
        text_score=analysis.get("text_analysis", {}).get("correctness_score"),
        speech_score=analysis.get("speech_analysis", {}).get("confidence_score") if analysis.get("speech_analysis") else None,
        vision_score=analysis.get("vision_analysis", {}).get("engagement_score") if analysis.get("vision_analysis") else None,
        fused_score=fused_score,
        reliability=fused_evidence.get("reliability", 0.8),
        raw_data=analysis
    )
    db.add(evidence_rec)

    # Update interview question count
    interview = db.query(Interview).filter(Interview.id == request.interview_id).first()
    if interview:
        interview.questions_asked = (interview.questions_asked or 0) + 1

    db.commit()

    # Recalculate roadmap based on updated competency graph
    if interview:
        try:
            nodes = db.query(CompetencyNode).filter(CompetencyNode.user_id == current_user.id).all()
            graph_dict = {
                "nodes": [
                    {
                        "skill_id": n.skill_id,
                        "skill_name": n.skill_name,
                        "competency_state": n.competency_state.value if hasattr(n.competency_state, "value") else str(n.competency_state),
                        "competency_score": n.competency_score,
                        "uncertainty": n.uncertainty
                    }
                    for n in nodes
                ]
            }
            engine = RoadmapEngine()
            new_roadmap = engine.generate_roadmap(
                branch=interview.branch,
                domain=interview.target_domain,
                target_role=interview.target_role,
                preferred_language="Python", # Defaulting to Python, can be extended to use user preferences
                preferred_technologies=[],
                competency_graph_dict=graph_dict
            )
            
            # Deactivate prior
            db.query(Roadmap).filter(
                Roadmap.user_id == current_user.id,
                Roadmap.is_active == True
            ).update({"is_active": False})

            # Save new active roadmap
            roadmap_rec = Roadmap(
                user_id=current_user.id,
                branch=interview.branch,
                domain=interview.target_domain,
                target_role=interview.target_role,
                preferred_language="Python",
                preferred_technologies=[],
                is_active=True
            )
            db.add(roadmap_rec)
            db.flush()

            for stage_name, stage_nodes in new_roadmap.get("stages", {}).items():
                try:
                    stage_enum = RoadmapStage(stage_name)
                except Exception:
                    stage_enum = RoadmapStage.FOUNDATION

                for n in stage_nodes:
                    r_node = RoadmapNode(
                        roadmap_id=roadmap_rec.id,
                        skill_id=n["skill_id"],
                        skill_name=n.get("skill_name", n["skill_id"]),
                        stage=stage_enum,
                        priority=n.get("priority", 0),
                        is_gap=n.get("is_gap", True),
                        tools=n.get("tools", []),
                        resources=n.get("resources", []),
                        recommended_projects=n.get("projects", []),
                        estimated_effort_hours=n.get("estimated_effort_hours", 20)
                    )
                    db.add(r_node)
            
            db.commit()
            result["roadmap_recalculated"] = True
        except Exception as e:
            logger.error(f"Error recalculating roadmap during interview: {e}")
            db.rollback()

    # Enrich response for frontend
    graph = agent.get_session_graph(request.interview_id)
    result["updated_graph"] = graph or {"nodes": []}
    result["evidence_analysis"] = analysis

    return result


@router.get("/{interview_id}/graph")
async def get_competency_graph(
    interview_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get the current competency graph for an interview session."""
    agent = _interview_agents.get(interview_id)
    if agent:
        graph = agent.get_session_graph(interview_id)
        if graph and graph.get("nodes"):
            return graph

    # Fallback to persistent PostgreSQL nodes for this user
    nodes = db.query(CompetencyNode).filter(CompetencyNode.user_id == current_user.id).all()
    if nodes:
        return {
            "interview_id": interview_id,
            "user_id": current_user.id,
            "node_count": len(nodes),
            "nodes": [
                {
                    "skill_id": n.skill_id,
                    "skill_name": n.skill_name,
                    "competency_state": n.competency_state.value if hasattr(n.competency_state, "value") else str(n.competency_state),
                    "competency_score": n.competency_score,
                    "uncertainty": n.uncertainty,
                    "evidence_count": n.evidence_count or 0,
                    "evidence_from_resume": n.evidence_from_resume or False,
                    "evidence_from_interview": n.evidence_from_interview or False
                }
                for n in nodes
            ],
            "edges": []
        }

    if settings.demo_mode:
        return _get_demo_graph()
    raise HTTPException(status_code=404, detail="Interview session not found")


@router.get("/{interview_id}/report")
async def get_interview_report(
    interview_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get the final interview report with competency analysis."""
    agent = _interview_agents.get(interview_id)
    if not agent:
        if settings.demo_mode:
            return _get_demo_report(interview_id)
        raise HTTPException(status_code=404, detail="Interview session not found")
    
    report_data = agent.get_final_report_data(interview_id)
    if not report_data:
        raise HTTPException(status_code=404, detail="Report not available")
    
    return report_data


@router.get("/{interview_id}/status")
async def get_interview_status(
    interview_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current interview status."""
    interview = db.query(Interview).filter(
        Interview.id == interview_id,
        Interview.user_id == current_user.id
    ).first()
    
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    
    return {
        "interview_id": interview_id,
        "status": interview.status.value,
        "questions_asked": interview.questions_asked,
        "max_questions": interview.max_questions,
        "target_role": interview.target_role
    }


@router.get("/list")
async def list_interviews(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all interviews for current user."""
    interviews = db.query(Interview).filter(
        Interview.user_id == current_user.id
    ).order_by(Interview.created_at.desc()).all()
    
    return [
        {
            "id": i.id,
            "target_role": i.target_role,
            "target_domain": i.target_domain,
            "status": i.status.value,
            "questions_asked": i.questions_asked,
            "created_at": i.created_at.isoformat() if i.created_at else None
        }
        for i in interviews
    ]


# ── Demo helpers ──────────────────────────────────────────────

def _get_demo_question(db: Session, interview_id: str):
    """Return a demo question."""
    return {
        "action": "ask",
        "question": {
            "question_id": "demo_java_001",
            "question_text": "Explain the difference between an interface and an abstract class in Java. When would you use each?",
            "question_type": "conceptual",
            "difficulty": "medium",
            "skill_id": "java",
            "skill_name": "Java",
            "source": "question_bank"
        },
        "progress": {"questions_asked": 0, "max_questions": 15, "percent": 0},
        "agent_reasoning": {
            "decision": "Java has high uncertainty and is critical for Backend Developer role"
        },
        "demo_mode": True
    }


def _demo_answer_analysis(request: SubmitAnswerRequest):
    """Return demo analysis for submitted answer."""
    import random
    score = random.uniform(0.4, 0.8)
    return {
        "analysis": {
            "text_analysis": {
                "fused_score": score,
                "correctness": score + 0.05,
                "depth": score - 0.05,
                "relevance": score + 0.1,
                "word_count": len(request.answer_text.split()),
                "concepts_found": request.expected_concepts[:2],
                "follow_up_needed": score < 0.5
            },
            "fused_evidence": {
                "fused_score": score,
                "reliability": 0.8,
                "evidence_quality": "moderate",
                "modalities_used": ["text"],
                "notes": ["Demo mode: text analysis only"]
            }
        },
        "competency_delta": {
            "skill_id": request.skill_id,
            "prev_state": "unknown",
            "new_state": "developing" if score > 0.4 else "emerging",
            "new_uncertainty": round(0.8 - score * 0.3, 2)
        },
        "graph_summary": {
            "total_skills": 7,
            "state_distribution": {
                "unknown": 4, "emerging": 1, "developing": 2
            }
        },
        "demo_mode": True
    }


def _get_demo_graph():
    """Return a demo competency graph."""
    return {
        "user_id": "demo",
        "target_role": "Backend Developer",
        "nodes": [
            {"skill_id": "java", "skill_name": "Java", "competency_state": "developing",
             "competency_score": 0.55, "uncertainty": 0.45, "evidence_from_resume": True},
            {"skill_id": "spring_boot", "skill_name": "Spring Boot", "competency_state": "unknown",
             "competency_score": None, "uncertainty": 1.0, "evidence_from_resume": False},
            {"skill_id": "postgresql", "skill_name": "PostgreSQL", "competency_state": "unknown",
             "competency_score": None, "uncertainty": 1.0, "evidence_from_resume": False},
            {"skill_id": "rest_api", "skill_name": "REST API", "competency_state": "emerging",
             "competency_score": 0.35, "uncertainty": 0.7, "evidence_from_resume": True},
            {"skill_id": "data_structures", "skill_name": "Data Structures", "competency_state": "unknown",
             "competency_score": None, "uncertainty": 1.0, "evidence_from_resume": False},
        ],
        "edges": [
            {"from": "java", "to": "spring_boot", "relation_type": "prerequisite"},
            {"from": "data_structures", "to": "java", "relation_type": "prerequisite"},
        ]
    }


def _get_demo_report(interview_id: str):
    """Return a demo final report."""
    return {
        "interview": {"id": interview_id, "target_role": "Backend Developer"},
        "competency_summary": {
            "strong": [],
            "demonstrated": [{"skill_name": "Java", "evidence_count": 2}],
            "developing": [{"skill_name": "REST API", "evidence_count": 1}],
            "emerging": [],
            "unknown": [
                {"skill_name": "Spring Boot", "note": "No evidence collected"},
                {"skill_name": "PostgreSQL", "note": "No evidence collected"},
            ]
        },
        "readiness": {
            "score": 0.42,
            "formula": "0.4 × performance + 0.35 × coverage + 0.25 × certainty",
            "components": {"performance": 0.55, "coverage": 0.4, "certainty": 0.3}
        },
        "demo_mode": True
    }
