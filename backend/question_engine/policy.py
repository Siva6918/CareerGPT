"""
CareerGPT — Adaptive Evidence Acquisition & Interview Policy Engine (Module 3)

AGENTIC AI LOOP:
  OBSERVE → UNDERSTAND STATE → DECIDE WHAT IS NEEDED
  → SELECT NEXT QUESTION → ASK → ANALYZE → UPDATE → REPEAT

Question selection considers:
- Competency uncertainty
- Role importance
- Prerequisite relationships
- Question difficulty
- Expected information gain
- Evidence already collected
- Interview budget
- Previous questions asked
- Candidate performance trajectory
"""
import logging
import json
import random
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field
from enum import Enum

logger = logging.getLogger(__name__)


class QuestionType(str, Enum):
    CONCEPTUAL = "conceptual"
    CODING = "coding"
    DEBUGGING = "debugging"
    SCENARIO = "scenario"
    SYSTEM_DESIGN = "system_design"
    PROJECT_BASED = "project_based"
    BEHAVIORAL = "behavioral"
    FOLLOW_UP = "follow_up"


class Difficulty(str, Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"


@dataclass
class Question:
    """A single interview question with metadata."""
    question_id: str
    skill_id: str
    skill_name: str
    question_text: str
    question_type: QuestionType
    difficulty: Difficulty
    domain: str = ""
    branch: str = ""
    target_role: str = ""
    expected_concepts: List[str] = field(default_factory=list)
    prerequisites: List[str] = field(default_factory=list)
    evaluation_rubric: Dict = field(default_factory=dict)
    information_gain_estimate: float = 0.5
    source: str = "question_bank"   # question_bank | llm_generated


@dataclass
class AgentState:
    """
    The current state of the agentic interview loop.
    This is the 'brain' of the interview agent.
    """
    user_id: str
    interview_id: str
    target_role: str
    target_domain: str
    branch: str

    # Question history
    asked_question_ids: List[str] = field(default_factory=list)
    answered_question_ids: List[str] = field(default_factory=list)
    failed_questions: List[str] = field(default_factory=list)
    followup_queue: List[Question] = field(default_factory=list)

    # Competency tracking
    competencies_assessed: List[str] = field(default_factory=list)
    current_skill_focus: Optional[str] = None
    performance_trajectory: List[float] = field(default_factory=list)

    # Budget
    questions_asked: int = 0
    max_questions: int = 15
    min_questions: int = 5

    # Loop state
    loop_iteration: int = 0
    last_action: str = "start"
    evidence_sufficient: bool = False


class QuestionBank:
    """
    Structured question bank with domain/skill indexing.
    Each question has metadata for policy-based selection.
    """

    # Comprehensive built-in question bank
    QUESTIONS: List[Dict] = [
        # ── JAVA ─────────────────────────────────────────────
        {
            "question_id": "java_oop_001",
            "skill_id": "java",
            "skill_name": "Java",
            "question_text": "Explain the four pillars of Object-Oriented Programming in Java with practical examples.",
            "question_type": "conceptual",
            "difficulty": "easy",
            "domain": "Backend Engineering",
            "expected_concepts": ["encapsulation", "inheritance", "polymorphism", "abstraction"],
            "evaluation_rubric": {
                "excellent": "Defines all four with clear Java code examples",
                "good": "Defines all four with some examples",
                "partial": "Defines 2-3 pillars without clear examples",
                "poor": "Vague or incorrect definitions"
            },
            "information_gain_estimate": 0.8
        },
        {
            "question_id": "java_interface_001",
            "skill_id": "java",
            "skill_name": "Java",
            "question_text": "What is the difference between an interface and an abstract class in Java? When would you choose one over the other?",
            "question_type": "conceptual",
            "difficulty": "medium",
            "domain": "Backend Engineering",
            "expected_concepts": ["interface", "abstract class", "multiple inheritance", "default methods"],
            "evaluation_rubric": {
                "excellent": "Explains differences, use cases, Java 8 default methods",
                "good": "Correct differences with one use case",
                "partial": "Basic differences without use cases"
            },
            "information_gain_estimate": 0.75
        },
        {
            "question_id": "java_collections_001",
            "skill_id": "java",
            "skill_name": "Java",
            "question_text": "Explain Java Collections Framework. What is the difference between ArrayList, LinkedList, and HashMap?",
            "question_type": "conceptual",
            "difficulty": "medium",
            "domain": "Backend Engineering",
            "expected_concepts": ["ArrayList", "LinkedList", "HashMap", "time complexity", "use cases"],
            "information_gain_estimate": 0.7
        },
        {
            "question_id": "java_threads_001",
            "skill_id": "java",
            "skill_name": "Java",
            "question_text": "How does multithreading work in Java? Explain synchronized, volatile, and when you'd use them.",
            "question_type": "conceptual",
            "difficulty": "hard",
            "domain": "Backend Engineering",
            "expected_concepts": ["Thread", "Runnable", "synchronized", "volatile", "race condition"],
            "information_gain_estimate": 0.85
        },
        # ── SPRING BOOT ──────────────────────────────────────
        {
            "question_id": "spring_di_001",
            "skill_id": "spring_boot",
            "skill_name": "Spring Boot",
            "question_text": "What is dependency injection in Spring Boot? Explain @Autowired, @Component, and @Service annotations.",
            "question_type": "conceptual",
            "difficulty": "medium",
            "domain": "Backend Engineering",
            "expected_concepts": ["dependency injection", "IoC container", "@Autowired", "@Component", "@Service"],
            "information_gain_estimate": 0.8
        },
        {
            "question_id": "spring_rest_001",
            "skill_id": "spring_boot",
            "skill_name": "Spring Boot",
            "question_text": "How do you create a REST API in Spring Boot? Walk me through creating a CRUD endpoint.",
            "question_type": "scenario",
            "difficulty": "medium",
            "domain": "Backend Engineering",
            "expected_concepts": ["@RestController", "@RequestMapping", "@GetMapping", "@PostMapping", "ResponseEntity"],
            "information_gain_estimate": 0.85
        },
        {
            "question_id": "spring_jpa_001",
            "skill_id": "spring_boot",
            "skill_name": "Spring Boot",
            "question_text": "Explain Spring Data JPA. How do you define a repository and execute custom queries?",
            "question_type": "conceptual",
            "difficulty": "hard",
            "domain": "Backend Engineering",
            "expected_concepts": ["JpaRepository", "JPQL", "@Query", "Entity", "Lazy vs Eager loading"],
            "information_gain_estimate": 0.8
        },
        # ── POSTGRESQL / SQL ──────────────────────────────────
        {
            "question_id": "sql_joins_001",
            "skill_id": "postgresql",
            "skill_name": "PostgreSQL",
            "question_text": "Explain the difference between INNER JOIN, LEFT JOIN, RIGHT JOIN, and FULL OUTER JOIN with examples.",
            "question_type": "conceptual",
            "difficulty": "medium",
            "domain": "Backend Engineering",
            "expected_concepts": ["INNER JOIN", "LEFT JOIN", "RIGHT JOIN", "NULL handling"],
            "information_gain_estimate": 0.75
        },
        {
            "question_id": "sql_index_001",
            "skill_id": "postgresql",
            "skill_name": "PostgreSQL",
            "question_text": "What are database indexes? When should you create them and what are the tradeoffs?",
            "question_type": "conceptual",
            "difficulty": "medium",
            "domain": "Backend Engineering",
            "expected_concepts": ["B-tree index", "query performance", "write overhead", "cardinality"],
            "information_gain_estimate": 0.7
        },
        {
            "question_id": "sql_acid_001",
            "skill_id": "postgresql",
            "skill_name": "PostgreSQL",
            "question_text": "Explain ACID properties in databases. Give an example where violating each property causes a problem.",
            "question_type": "conceptual",
            "difficulty": "hard",
            "domain": "Backend Engineering",
            "expected_concepts": ["Atomicity", "Consistency", "Isolation", "Durability", "transaction"],
            "information_gain_estimate": 0.8
        },
        # ── PYTHON ───────────────────────────────────────────
        {
            "question_id": "python_basics_001",
            "skill_id": "python",
            "skill_name": "Python",
            "question_text": "Explain the difference between mutable and immutable types in Python. Give examples.",
            "question_type": "conceptual",
            "difficulty": "easy",
            "domain": "Software Engineering",
            "expected_concepts": ["list", "tuple", "dict", "str", "mutability"],
            "information_gain_estimate": 0.6
        },
        {
            "question_id": "python_generators_001",
            "skill_id": "python",
            "skill_name": "Python",
            "question_text": "What are Python generators and how do they differ from regular functions? When would you use them?",
            "question_type": "conceptual",
            "difficulty": "medium",
            "domain": "Software Engineering",
            "expected_concepts": ["yield", "generator", "lazy evaluation", "memory efficiency"],
            "information_gain_estimate": 0.75
        },
        # ── DATA STRUCTURES ──────────────────────────────────
        {
            "question_id": "dsa_complexity_001",
            "skill_id": "data_structures",
            "skill_name": "Data Structures",
            "question_text": "What is Big-O notation? Analyze the time complexity of: binary search, bubble sort, and HashSet lookup.",
            "question_type": "conceptual",
            "difficulty": "medium",
            "domain": "Core CS",
            "expected_concepts": ["O(log n)", "O(n²)", "O(1)", "worst case", "average case"],
            "information_gain_estimate": 0.8
        },
        {
            "question_id": "dsa_tree_001",
            "skill_id": "data_structures",
            "skill_name": "Data Structures",
            "question_text": "Explain binary search tree operations (insert, search, delete) and their time complexities.",
            "question_type": "conceptual",
            "difficulty": "medium",
            "domain": "Core CS",
            "expected_concepts": ["BST", "O(h)", "balanced tree", "traversal"],
            "information_gain_estimate": 0.75
        },
        # ── REST API ─────────────────────────────────────────
        {
            "question_id": "rest_principles_001",
            "skill_id": "rest_api",
            "skill_name": "REST API",
            "question_text": "What are RESTful API design principles? How do you design a REST API for a library management system?",
            "question_type": "system_design",
            "difficulty": "medium",
            "domain": "Backend Engineering",
            "expected_concepts": ["stateless", "HTTP methods", "URL design", "status codes", "resources"],
            "information_gain_estimate": 0.85
        },
        {
            "question_id": "rest_auth_001",
            "skill_id": "rest_api",
            "skill_name": "REST API",
            "question_text": "How does JWT authentication work in a REST API? Walk through the token generation and validation flow.",
            "question_type": "scenario",
            "difficulty": "hard",
            "domain": "Backend Engineering",
            "expected_concepts": ["JWT", "header.payload.signature", "stateless auth", "refresh tokens"],
            "information_gain_estimate": 0.8
        },
        # ── SYSTEM DESIGN ────────────────────────────────────
        {
            "question_id": "sysdesign_scale_001",
            "skill_id": "system_design",
            "skill_name": "System Design",
            "question_text": "Design a URL shortener service like bit.ly. Discuss the high-level architecture and database choice.",
            "question_type": "system_design",
            "difficulty": "hard",
            "domain": "Backend Engineering",
            "expected_concepts": ["hash generation", "database", "caching", "load balancer", "scalability"],
            "information_gain_estimate": 0.9
        },
        # ── BEHAVIORAL ───────────────────────────────────────
        {
            "question_id": "behav_challenge_001",
            "skill_id": "soft_skills",
            "skill_name": "Soft Skills",
            "question_text": "Tell me about a challenging technical problem you solved. Walk me through your approach.",
            "question_type": "behavioral",
            "difficulty": "medium",
            "domain": "All",
            "expected_concepts": ["problem analysis", "solution approach", "debugging", "learning"],
            "information_gain_estimate": 0.6
        },
        # ── AI/ML ────────────────────────────────────────────
        {
            "question_id": "ml_basics_001",
            "skill_id": "machine_learning",
            "skill_name": "Machine Learning",
            "question_text": "Explain overfitting and underfitting. How do you detect and address them?",
            "question_type": "conceptual",
            "difficulty": "medium",
            "domain": "AI & Data Science",
            "expected_concepts": ["bias-variance tradeoff", "regularization", "cross-validation", "train-test split"],
            "information_gain_estimate": 0.8
        },
        {
            "question_id": "ml_gradient_001",
            "skill_id": "machine_learning",
            "skill_name": "Machine Learning",
            "question_text": "Explain gradient descent. What are SGD, mini-batch GD, and Adam optimizer?",
            "question_type": "conceptual",
            "difficulty": "hard",
            "domain": "AI & Data Science",
            "expected_concepts": ["gradient", "learning rate", "SGD", "momentum", "Adam"],
            "information_gain_estimate": 0.85
        },
    ]

    def __init__(self):
        self._index: Dict[str, List[Question]] = {}
        self._all: List[Question] = []
        self._load()

    def _load(self):
        for q_data in self.QUESTIONS:
            q = Question(
                question_id=q_data["question_id"],
                skill_id=q_data["skill_id"],
                skill_name=q_data["skill_name"],
                question_text=q_data["question_text"],
                question_type=QuestionType(q_data["question_type"]),
                difficulty=Difficulty(q_data.get("difficulty", "medium")),
                domain=q_data.get("domain", ""),
                expected_concepts=q_data.get("expected_concepts", []),
                evaluation_rubric=q_data.get("evaluation_rubric", {}),
                information_gain_estimate=q_data.get("information_gain_estimate", 0.5),
            )
            skill_id = q_data["skill_id"]
            if skill_id not in self._index:
                self._index[skill_id] = []
            self._index[skill_id].append(q)
            self._all.append(q)

    def get_for_skill(self, skill_id: str) -> List[Question]:
        return self._index.get(skill_id, [])

    def get_all(self) -> List[Question]:
        return self._all

    def get_by_id(self, question_id: str) -> Optional[Question]:
        for q in self._all:
            if q.question_id == question_id:
                return q
        return None


class InterviewPolicyEngine:
    """
    Module 3: Adaptive Evidence Acquisition and Interview Policy Engine

    Implements the agentic interview loop:
    OBSERVE → DECIDE → ASK → ANALYZE → UPDATE → DECIDE AGAIN

    Next question selection considers:
    - Uncertainty (from competency graph)
    - Role importance
    - Information gain
    - Prerequisites
    - Difficulty progression
    - Previous questions (no repeats)
    - Performance trajectory
    """

    def __init__(self, llm_provider=None):
        self.question_bank = QuestionBank()
        self.llm_provider = llm_provider

    def observe_state(self, state: AgentState, competency_graph) -> Dict[str, Any]:
        """
        OBSERVE step: Analyze current interview state.
        Returns a structured observation.
        """
        nodes = competency_graph.get_all_nodes()
        unknown_skills = [n for n in nodes if n.competency_state.value == "unknown"]
        high_uncertainty = [n for n in nodes if n.uncertainty > 0.7]
        assessed = len(state.competencies_assessed)
        remaining = state.max_questions - state.questions_asked

        observation = {
            "questions_asked": state.questions_asked,
            "questions_remaining": remaining,
            "skills_in_graph": len(nodes),
            "unknown_skills": len(unknown_skills),
            "high_uncertainty_skills": len(high_uncertainty),
            "competencies_assessed": assessed,
            "performance_trajectory": state.performance_trajectory[-3:] if state.performance_trajectory else [],
            "followup_queued": len(state.followup_queue) > 0,
            "evidence_sufficient": self._check_sufficient_evidence(state, competency_graph)
        }

        logger.info(f"[AGENT OBSERVE] Q:{state.questions_asked}/{state.max_questions} "
                    f"Unknown:{len(unknown_skills)} HighUnc:{len(high_uncertainty)}")
        return observation

    def _check_sufficient_evidence(self, state: AgentState, competency_graph) -> bool:
        """Decide if we have collected enough evidence."""
        if state.questions_asked < state.min_questions:
            return False
        if state.questions_asked >= state.max_questions:
            return True

        nodes = competency_graph.get_all_nodes()
        if not nodes:
            return False

        # Sufficient if: most role-critical skills assessed AND avg uncertainty < 0.4
        assessed_ratio = len(state.competencies_assessed) / max(len(nodes), 1)
        avg_uncertainty = sum(n.uncertainty for n in nodes) / len(nodes)

        return assessed_ratio >= 0.7 and avg_uncertainty < 0.4

    def decide_next_action(
        self,
        state: AgentState,
        observation: Dict,
        competency_graph
    ) -> Dict[str, Any]:
        """
        DECIDE step: Choose next action from:
        - ask_follow_up: continue probing current skill
        - ask_new: select highest-priority new skill
        - reassess: return to high-uncertainty skill
        - conclude: end interview
        """
        if observation["evidence_sufficient"]:
            return {"action": "conclude", "reason": "Sufficient evidence collected"}

        if state.followup_queue:
            return {
                "action": "ask_follow_up",
                "reason": "Follow-up needed for previous answer",
                "question": state.followup_queue[0]
            }

        if observation["questions_remaining"] <= 0:
            return {"action": "conclude", "reason": "Budget exhausted"}

        # Compute priorities
        role_weights = self._get_role_skill_weights(state.target_role, state.target_domain)
        priorities = competency_graph.get_next_assessment_priority(
            role_skill_weights=role_weights,
            asked_skill_ids=list(state.competencies_assessed),
            budget=state.max_questions
        )

        if not priorities:
            return {"action": "conclude", "reason": "No more skills to assess"}

        # Select top priority skill
        top_skill_id, priority_score = priorities[0]

        return {
            "action": "ask_new",
            "skill_id": top_skill_id,
            "priority_score": priority_score,
            "reason": f"Highest priority skill: uncertainty + role importance"
        }

    def select_question(
        self,
        skill_id: str,
        state: AgentState,
        competency_graph,
        observation: Dict
    ) -> Optional[Question]:
        """
        SELECT QUESTION step: Choose best question for the selected skill.

        Considers:
        - Question difficulty (based on performance trajectory)
        - Not previously asked
        - Appropriate type for current context
        """
        # Determine appropriate difficulty
        difficulty = self._select_difficulty(state.performance_trajectory)

        # Get questions for this skill
        candidates = self.question_bank.get_for_skill(skill_id)

        if not candidates:
            logger.info(f"No bank questions for {skill_id}, will use LLM generation")
            return None

        # Filter out already asked questions
        candidates = [
            q for q in candidates
            if q.question_id not in state.asked_question_ids
        ]

        if not candidates:
            logger.info(f"All bank questions for {skill_id} already asked")
            return None

        # Filter by difficulty preference (soft filter)
        preferred = [q for q in candidates if q.difficulty.value == difficulty]
        if preferred:
            candidates = preferred

        # Select highest info gain
        candidates.sort(key=lambda q: q.information_gain_estimate, reverse=True)
        return candidates[0]

    async def generate_question_with_llm(
        self,
        skill_id: str,
        skill_name: str,
        difficulty: str,
        target_role: str,
        asked_questions: List[str],
        competency_state: str
    ) -> Optional[Question]:
        """
        Generate a fresh question using LLM when bank is exhausted.
        Falls back to generic question if LLM fails.
        """
        if not self.llm_provider:
            return self._fallback_question(skill_id, skill_name, difficulty)

        try:
            asked_str = "; ".join(asked_questions[-3:]) if asked_questions else "none"
            prompt = f"""Generate a technical interview question for a {target_role} candidate.
Skill being assessed: {skill_name}
Difficulty: {difficulty}
Competency state: {competency_state}
Previously asked questions (avoid these): {asked_str}

Return ONLY valid JSON:
{{
  "question_text": "...",
  "question_type": "conceptual|coding|scenario|system_design",
  "expected_concepts": ["concept1", "concept2"],
  "evaluation_rubric": {{"excellent": "...", "good": "...", "poor": "..."}}
}}"""

            response = await self.llm_provider.complete(
                messages=[
                    {"role": "system", "content": "You are a technical interview question generator. Return only valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.8,
                max_tokens=400
            )

            content = response.content if hasattr(response, 'content') else str(response)
            import re
            match = re.search(r'\{.*\}', content, re.DOTALL)
            if match:
                data = json.loads(match.group())
                return Question(
                    question_id=f"llm_{skill_id}_{random.randint(1000, 9999)}",
                    skill_id=skill_id,
                    skill_name=skill_name,
                    question_text=data.get("question_text", ""),
                    question_type=QuestionType(data.get("question_type", "conceptual")),
                    difficulty=Difficulty(difficulty),
                    expected_concepts=data.get("expected_concepts", []),
                    evaluation_rubric=data.get("evaluation_rubric", {}),
                    information_gain_estimate=0.7,
                    source="llm_generated"
                )
        except Exception as e:
            logger.error(f"LLM question generation failed: {e}")

        return self._fallback_question(skill_id, skill_name, difficulty)

    def _fallback_question(self, skill_id: str, skill_name: str, difficulty: str) -> Question:
        """Fallback question when bank and LLM both unavailable."""
        templates = {
            "easy": f"Describe the basic concepts of {skill_name} and how you have used it.",
            "medium": f"Explain a practical scenario where you would use {skill_name} and walk through your approach.",
            "hard": f"Describe an advanced use case of {skill_name}, including design decisions and tradeoffs."
        }
        return Question(
            question_id=f"fallback_{skill_id}_{random.randint(1000, 9999)}",
            skill_id=skill_id,
            skill_name=skill_name,
            question_text=templates.get(difficulty, templates["medium"]),
            question_type=QuestionType.CONCEPTUAL,
            difficulty=Difficulty(difficulty),
            source="fallback"
        )

    def _select_difficulty(self, trajectory: List[float]) -> str:
        """
        Select difficulty based on performance trajectory.
        Good performance → harder questions.
        Poor performance → easier questions.
        """
        if not trajectory:
            return "medium"

        recent = trajectory[-3:]
        avg = sum(recent) / len(recent)

        if avg >= 0.7:
            return "hard"
        elif avg >= 0.4:
            return "medium"
        else:
            return "easy"

    def _get_role_skill_weights(self, target_role: str, domain: str) -> Dict[str, float]:
        """Get skill importance weights for a target role."""
        ROLE_WEIGHTS: Dict[str, Dict[str, float]] = {
            "Backend Developer": {
                "java": 0.9, "spring_boot": 0.9, "postgresql": 0.85,
                "rest_api": 0.9, "data_structures": 0.8, "system_design": 0.7,
                "python": 0.5, "docker": 0.6
            },
            "Full Stack Developer": {
                "javascript": 0.9, "react": 0.85, "nodejs": 0.85,
                "rest_api": 0.9, "postgresql": 0.7, "html_css": 0.7,
                "python": 0.5
            },
            "Data Scientist": {
                "python": 0.95, "machine_learning": 0.9, "statistics": 0.85,
                "sql": 0.75, "deep_learning": 0.7, "data_visualization": 0.7
            },
            "AI Engineer": {
                "python": 0.95, "machine_learning": 0.9, "deep_learning": 0.9,
                "pytorch": 0.85, "transformers": 0.8, "llm": 0.85
            },
            "Frontend Developer": {
                "javascript": 0.95, "react": 0.9, "html_css": 0.9,
                "typescript": 0.8, "rest_api": 0.7
            },
            "Embedded Systems Engineer": {
                "c": 0.95, "embedded_c": 0.9, "rtos": 0.85,
                "arm_cortex": 0.8, "uart_spi_i2c": 0.75
            }
        }

        weights = ROLE_WEIGHTS.get(target_role, {})
        if not weights:
            # Generic weights for unknown role
            weights = {k: 0.5 for k in ["python", "java", "data_structures", "rest_api"]}

        return weights

    def update_state_after_answer(
        self,
        state: AgentState,
        question: Question,
        fused_score: float,
        follow_up_needed: bool
    ) -> AgentState:
        """
        UPDATE step: Update agent state after receiving and analyzing an answer.
        """
        state.asked_question_ids.append(question.question_id)
        state.answered_question_ids.append(question.question_id)
        state.competencies_assessed.append(question.skill_id)
        state.questions_asked += 1
        state.performance_trajectory.append(fused_score)
        state.loop_iteration += 1
        state.last_action = "analyzed_answer"

        # Queue follow-up if needed
        if follow_up_needed and state.questions_asked < state.max_questions - 1:
            follow_up = self._create_followup(question, fused_score)
            if follow_up:
                state.followup_queue.append(follow_up)

        return state

    def _create_followup(self, question: Question, score: float) -> Optional[Question]:
        """Create a follow-up question for clarification or depth."""
        if score >= 0.7:
            return None  # No follow-up needed for strong answers

        follow_up_text = (
            f"Can you provide a more detailed example of {question.skill_name}? "
            f"Specifically, how would you apply it in a real production scenario?"
        )

        return Question(
            question_id=f"followup_{question.question_id}",
            skill_id=question.skill_id,
            skill_name=question.skill_name,
            question_text=follow_up_text,
            question_type=QuestionType.FOLLOW_UP,
            difficulty=question.difficulty,
            expected_concepts=question.expected_concepts,
            information_gain_estimate=0.6,
            source="policy_generated"
        )
