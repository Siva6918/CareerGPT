"""
CareerGPT - SQLAlchemy Database Models
"""
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, Text, JSON,
    ForeignKey, Enum as SQLEnum, Index
)
from sqlalchemy.orm import relationship, DeclarativeBase
from sqlalchemy.sql import func
from datetime import datetime, timezone
import uuid
import enum


def utcnow():
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    pass


def gen_uuid():
    return str(uuid.uuid4())


# ─────────────────────────────────────────────────────────────
# ENUMS
# ─────────────────────────────────────────────────────────────

class CompetencyState(str, enum.Enum):
    UNKNOWN = "unknown"
    EMERGING = "emerging"
    DEVELOPING = "developing"
    DEMONSTRATED = "demonstrated"
    STRONG = "strong"


class QuestionType(str, enum.Enum):
    CONCEPTUAL = "conceptual"
    CODING = "coding"
    DEBUGGING = "debugging"
    SCENARIO = "scenario"
    SYSTEM_DESIGN = "system_design"
    PROJECT_BASED = "project_based"
    BEHAVIORAL = "behavioral"
    FOLLOW_UP = "follow_up"


class Difficulty(str, enum.Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"


class InterviewStatus(str, enum.Enum):
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    ABANDONED = "abandoned"


class RoadmapStage(str, enum.Enum):
    FOUNDATION = "foundation"
    CORE = "core"
    APPLIED = "applied"
    ADVANCED = "advanced"
    PROJECTS = "projects"
    ASSESSMENT = "assessment"


class RoadmapNodeState(str, enum.Enum):
    LOCKED = "locked"
    AVAILABLE = "available"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    SKIPPED = "skipped"
    RECOMMENDED = "recommended"
    REVIEW_REQUIRED = "review_required"


# ─────────────────────────────────────────────────────────────
# USERS & AUTH
# ─────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=gen_uuid)
    email = Column(String, unique=True, nullable=False, index=True)
    username = Column(String, unique=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    profile = relationship("UserProfile", back_populates="user", uselist=False)
    resumes = relationship("Resume", back_populates="user")
    interviews = relationship("Interview", back_populates="user")
    competency_nodes = relationship("CompetencyNode", back_populates="user")
    roadmaps = relationship("Roadmap", back_populates="user")
    reports = relationship("Report", back_populates="user")
    learning_goals = relationship("LearningGoal", back_populates="user",
                                  cascade="all, delete-orphan")
    career_preferences = relationship("UserCareerPreference", back_populates="user", cascade="all, delete-orphan", order_by="UserCareerPreference.priority")


class UserCareerPreference(Base):
    __tablename__ = "user_career_preferences"
    
    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    domain = Column(String)
    track = Column(String)
    priority = Column(Integer)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    user = relationship("User", back_populates="career_preferences")


class UserProfile(Base):
    __tablename__ = "profiles"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    branch = Column(String)           # CSE, ECE, EEE, Mechanical, etc.
    target_domain = Column(String)    # Backend Engineering, AI/ML, etc.
    target_role = Column(String)      # Backend Developer, Data Scientist, etc.
    preferred_languages = Column(JSON, default=list)   # ["Python", "Java"]
    preferred_technologies = Column(JSON, default=list) # ["Spring Boot", "FastAPI"]
    experience_level = Column(String, default="student") # student | fresher | junior
    college = Column(String)
    year_of_study = Column(Integer)
    linkedin_url = Column(String)
    github_url = Column(String)
    bio = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", back_populates="profile")


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"
    id = Column(String, primary_key=True, default=gen_uuid)
    email = Column(String, index=True)
    otp = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True))
    is_used = Column(Boolean, default=False)


# ─────────────────────────────────────────────────────────────
# RESUME
# ─────────────────────────────────────────────────────────────

class Resume(Base):
    __tablename__ = "resumes"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"))
    filename = Column(String)
    file_path = Column(String)
    file_type = Column(String)  # pdf | docx
    raw_text = Column(Text)
    parsed_data = Column(JSON)   # sections: education, experience, skills, projects
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="resumes")
    skills = relationship("ResumeSkill", back_populates="resume")


class ResumeSkill(Base):
    __tablename__ = "resume_skills"

    id = Column(String, primary_key=True, default=gen_uuid)
    resume_id = Column(String, ForeignKey("resumes.id", ondelete="CASCADE"))
    skill_name = Column(String, nullable=False)
    normalized_skill_id = Column(String)  # maps to skill taxonomy
    confidence = Column(Float, default=1.0)
    context = Column(Text)  # where in resume this was found
    source_section = Column(String)  # skills | experience | projects | education

    resume = relationship("Resume", back_populates="skills")


# ─────────────────────────────────────────────────────────────
# SKILLS TAXONOMY
# ─────────────────────────────────────────────────────────────

class Skill(Base):
    __tablename__ = "skills"

    id = Column(String, primary_key=True, default=gen_uuid)
    name = Column(String, unique=True, nullable=False, index=True)
    category = Column(String)        # language | framework | concept | tool | soft_skill
    branch = Column(String)          # CSE | ECE | EEE | cross
    domain = Column(String)
    description = Column(Text)
    aliases = Column(JSON, default=list)  # alternate names
    related_roles = Column(JSON, default=list)
    is_active = Column(Boolean, default=True)

    dependencies = relationship(
        "SkillDependency", foreign_keys="SkillDependency.skill_id",
        back_populates="skill"
    )


class SkillDependency(Base):
    __tablename__ = "skill_dependencies"

    id = Column(String, primary_key=True, default=gen_uuid)
    skill_id = Column(String, ForeignKey("skills.id"))
    depends_on_id = Column(String, ForeignKey("skills.id"))
    relation_type = Column(String, default="prerequisite")  # prerequisite | related | depends_on

    skill = relationship("Skill", foreign_keys=[skill_id], back_populates="dependencies")
    depends_on = relationship("Skill", foreign_keys=[depends_on_id])


# ─────────────────────────────────────────────────────────────
# COMPETENCY GRAPH
# ─────────────────────────────────────────────────────────────

class CompetencyNode(Base):
    __tablename__ = "competency_nodes"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    skill_id = Column(String, nullable=False)
    skill_name = Column(String, nullable=False)
    branch = Column(String)
    domain = Column(String)
    category = Column(String)

    # Competency state — NEVER fabricated
    competency_state = Column(SQLEnum(CompetencyState), default=CompetencyState.UNKNOWN)
    competency_score = Column(Float, nullable=True)   # None if unknown

    # Uncertainty — separate from competency
    uncertainty = Column(Float, default=1.0)   # 0=certain, 1=completely unknown
    evidence_count = Column(Integer, default=0)

    # Evidence sources
    evidence_from_resume = Column(Boolean, default=False)
    evidence_from_interview = Column(Boolean, default=False)
    evidence_from_project = Column(Boolean, default=False)
    evidence_from_certification = Column(Boolean, default=False)

    last_assessed = Column(DateTime(timezone=True), nullable=True)
    roadmap_stage = Column(SQLEnum(RoadmapStage), nullable=True)
    prerequisite_skills = Column(JSON, default=list)
    related_roles = Column(JSON, default=list)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", back_populates="competency_nodes")
    evidence = relationship("CompetencyEvidence", back_populates="node")

    __table_args__ = (
        Index("ix_competency_user_skill", "user_id", "skill_id", unique=True),
    )


class CompetencyEvidence(Base):
    __tablename__ = "competency_evidence"

    id = Column(String, primary_key=True, default=gen_uuid)
    node_id = Column(String, ForeignKey("competency_nodes.id", ondelete="CASCADE"))
    source_type = Column(String)   # resume | interview_text | interview_speech | interview_vision | project | certification
    source_id = Column(String)     # interview_answer_id or resume_id etc.

    # Evidence quality
    text_score = Column(Float, nullable=True)       # 0-1 technical correctness
    speech_score = Column(Float, nullable=True)     # 0-1 speech features
    vision_score = Column(Float, nullable=True)     # 0-1 vision features (auxiliary)
    fused_score = Column(Float, nullable=True)      # combined evidence score

    reliability = Column(Float, default=0.8)        # how reliable is this evidence
    raw_data = Column(JSON)                          # detailed analysis

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    node = relationship("CompetencyNode", back_populates="evidence")


# ─────────────────────────────────────────────────────────────
# INTERVIEW
# ─────────────────────────────────────────────────────────────

class Interview(Base):
    __tablename__ = "interviews"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"))
    resume_id = Column(String, ForeignKey("resumes.id", ondelete="SET NULL"), nullable=True)
    target_role = Column(String)
    target_domain = Column(String)
    branch = Column(String)

    status = Column(SQLEnum(InterviewStatus), default=InterviewStatus.NOT_STARTED)
    questions_asked = Column(Integer, default=0)
    max_questions = Column(Integer, default=15)

    started_at = Column(DateTime(timezone=True), nullable=True)
    ended_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Agentic loop state
    agent_state = Column(JSON, default=dict)   # current loop state
    competencies_assessed = Column(JSON, default=list)
    asked_question_ids = Column(JSON, default=list)

    user = relationship("User", back_populates="interviews")
    answers = relationship("InterviewAnswer", back_populates="interview")


class InterviewQuestion(Base):
    __tablename__ = "interview_questions"

    id = Column(String, primary_key=True, default=gen_uuid)
    # Source: question_bank or llm_generated
    source = Column(String, default="question_bank")
    skill_id = Column(String, nullable=False)
    skill_name = Column(String)
    domain = Column(String)
    branch = Column(String)
    target_role = Column(String)

    question_text = Column(Text, nullable=False)
    question_type = Column(SQLEnum(QuestionType))
    difficulty = Column(SQLEnum(Difficulty))

    expected_concepts = Column(JSON, default=list)
    prerequisites = Column(JSON, default=list)
    evaluation_rubric = Column(JSON, default=dict)
    information_gain_estimate = Column(Float, default=0.5)

    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class InterviewAnswer(Base):
    __tablename__ = "interview_answers"

    id = Column(String, primary_key=True, default=gen_uuid)
    interview_id = Column(String, ForeignKey("interviews.id", ondelete="CASCADE"))
    question_id = Column(String, ForeignKey("interview_questions.id"))
    question_text = Column(Text)   # stored in case question_id is LLM-generated

    answer_text = Column(Text)
    audio_path = Column(String, nullable=True)
    video_path = Column(String, nullable=True)

    # Analysis results
    text_analysis = Column(JSON)
    speech_analysis = Column(JSON)
    vision_analysis = Column(JSON)
    fused_evidence = Column(JSON)

    competency_delta = Column(JSON)   # how this answer changed competency graph

    answered_at = Column(DateTime(timezone=True), server_default=func.now())
    time_taken_seconds = Column(Integer)

    interview = relationship("Interview", back_populates="answers")
    question = relationship("InterviewQuestion")


# ─────────────────────────────────────────────────────────────
# ROADMAP
# ─────────────────────────────────────────────────────────────

class Roadmap(Base):
    __tablename__ = "roadmaps"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"))
    branch = Column(String)
    domain = Column(String)
    target_role = Column(String)
    preferred_language = Column(String)
    preferred_technologies = Column(JSON, default=list)

    is_active = Column(Boolean, default=True)
    generated_at = Column(DateTime(timezone=True), server_default=func.now())
    last_recalculated = Column(DateTime(timezone=True), nullable=True)

    user = relationship("User", back_populates="roadmaps")
    nodes = relationship("RoadmapNode", back_populates="roadmap")


class RoadmapNode(Base):
    __tablename__ = "roadmap_nodes"

    id = Column(String, primary_key=True, default=gen_uuid)
    roadmap_id = Column(String, ForeignKey("roadmaps.id", ondelete="CASCADE"))
    skill_id = Column(String, nullable=False)
    skill_name = Column(String)
    stage = Column(SQLEnum(RoadmapStage))
    priority = Column(Integer, default=0)   # lower = higher priority
    is_completed = Column(Boolean, default=False)
    is_gap = Column(Boolean, default=True)
    state = Column(SQLEnum(RoadmapNodeState), default=RoadmapNodeState.LOCKED)
    why_recommended = Column(Text, nullable=True)

    prerequisites = Column(JSON, default=list)
    tools = Column(JSON, default=list)
    resources = Column(JSON, default=list)   # [{title, url, type, provider}]
    recommended_projects = Column(JSON, default=list)
    estimated_effort_hours = Column(Integer)

    roadmap = relationship("Roadmap", back_populates="nodes")


# ─────────────────────────────────────────────────────────────
# PROJECTS & JOBS
# ─────────────────────────────────────────────────────────────

class ProjectRecommendation(Base):
    __tablename__ = "projects"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"))
    title = Column(String)
    description = Column(Text)
    difficulty = Column(SQLEnum(Difficulty))
    skills_addressed = Column(JSON, default=list)
    technologies = Column(JSON, default=list)
    prerequisites = Column(JSON, default=list)
    deliverables = Column(JSON, default=list)
    evaluation_rubric = Column(JSON)
    estimated_hours = Column(Integer)
    is_completed = Column(Boolean, default=False)
    why_recommended = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class JobRole(Base):
    __tablename__ = "jobs"

    id = Column(String, primary_key=True, default=gen_uuid)
    title = Column(String, nullable=False)
    domain = Column(String)
    branch = Column(String)
    required_skills = Column(JSON, default=list)
    preferred_skills = Column(JSON, default=list)
    description = Column(Text)
    salary_range = Column(String)
    companies = Column(JSON, default=list)
    is_active = Column(Boolean, default=True)


class JobRecommendation(Base):
    __tablename__ = "recommendations"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"))
    job_id = Column(String, ForeignKey("jobs.id"))
    match_score = Column(Float)
    matching_skills = Column(JSON, default=list)
    missing_skills = Column(JSON, default=list)
    uncertain_skills = Column(JSON, default=list)
    why_matched = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    job = relationship("JobRole")


# ─────────────────────────────────────────────────────────────
# REPORTS
# ─────────────────────────────────────────────────────────────

class Report(Base):
    __tablename__ = "reports"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"))
    interview_id = Column(String, ForeignKey("interviews.id"), nullable=True)
    roadmap_id = Column(String, ForeignKey("roadmaps.id"), nullable=True)

    report_type = Column(String, default="full")  # full | skill_gap | roadmap | interview
    content = Column(JSON)   # full structured report
    readiness_components = Column(JSON)  # formula components, not a fake number
    overall_readiness_score = Column(Float, nullable=True)  # only if formula-defined

    generated_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="reports")


# ─────────────────────────────────────────────────────────────
# LEARNING GOALS — Multi-Domain Learning System
# ─────────────────────────────────────────────────────────────

class LearningGoalStatus(str, enum.Enum):
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"
    REMOVED = "removed"


class LearningGoalType(str, enum.Enum):
    PRIMARY = "primary"          # One primary career goal
    ROLE = "role"                # Additional role goal (e.g. Full Stack)
    TECHNOLOGY = "technology"    # Specific tech goal (e.g. React)
    DOMAIN = "domain"            # Domain-level goal (e.g. Cybersecurity)
    SKILL = "skill"              # Individual skill (e.g. System Design)


class LearningGoal(Base):
    """A user's learning goal — can be primary or additional.
    One competency graph is shared across all goals.
    """
    __tablename__ = "learning_goals"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), index=True)

    goal_type = Column(SQLEnum(LearningGoalType), default=LearningGoalType.ROLE)
    is_primary = Column(Boolean, default=False)   # Only one primary per user

    # What the goal is
    title = Column(String, nullable=False)        # e.g. "AI Engineer", "React", "Cybersecurity"
    domain = Column(String)                       # e.g. "AI & Data"
    track = Column(String)                        # e.g. "AI Engineer"
    technology = Column(String)                   # e.g. "React" (for skill goals)
    branch = Column(String)                       # inherited from user profile

    # Progress metadata
    current_level = Column(String, default="beginner")   # beginner | intermediate | advanced
    target_level = Column(String, default="advanced")
    priority = Column(Integer, default=2)                 # 1=high, 2=medium, 3=low
    reason = Column(Text)                                 # Why this goal

    # Associated roadmap slugs from roadmap.sh
    roadmap_slugs = Column(JSON, default=list)    # ["ai-engineer", "python", "docker"]

    # Progress
    status = Column(SQLEnum(LearningGoalStatus), default=LearningGoalStatus.ACTIVE)
    progress_pct = Column(Float, default=0.0)     # 0-100

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", back_populates="learning_goals")
    progress_entries = relationship("LearningGoalProgress", back_populates="goal",
                                    cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_learning_goal_user", "user_id"),
    )


class TopicProgressStatus(str, enum.Enum):
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    NEEDS_REVISION = "needs_revision"


class LearningGoalProgress(Base):
    """Per-topic progress for a learning goal.
    Tracks individual roadmap topic completion state.
    """
    __tablename__ = "learning_goal_progress"

    id = Column(String, primary_key=True, default=gen_uuid)
    goal_id = Column(String, ForeignKey("learning_goals.id", ondelete="CASCADE"), index=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), index=True)

    # Reference to roadmap topic
    roadmap_source_slug = Column(String)          # e.g. "ai-engineer"
    topic_slug = Column(String)                   # e.g. "python"
    topic_title = Column(String)

    status = Column(SQLEnum(TopicProgressStatus), default=TopicProgressStatus.NOT_STARTED)
    confidence = Column(Float, nullable=True)     # 0-1, set after assessment

    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    last_reviewed = Column(DateTime(timezone=True), nullable=True)
    assessment_score = Column(Float, nullable=True)
    evidence = Column(JSON, default=list)         # source evidence from interviews, etc.

    goal = relationship("LearningGoal", back_populates="progress_entries")

    __table_args__ = (
        Index("ix_lgprogress_goal_topic", "goal_id", "topic_slug", unique=True),
    )


# ─────────────────────────────────────────────────────────────
# ROADMAP SOURCES — roadmap.sh + External Sources
# ─────────────────────────────────────────────────────────────

class RoadmapSource(Base):
    """A parsed roadmap from roadmap.sh or another source.
    Populated by the roadmap_importer.py script.
    """
    __tablename__ = "roadmap_sources"

    id = Column(String, primary_key=True, default=gen_uuid)
    provider = Column(String, default="roadmap.sh")   # roadmap.sh | NPTEL | Microsoft | etc.
    slug = Column(String, unique=True, nullable=False, index=True)  # e.g. "ai-engineer"
    title = Column(String, nullable=False)            # e.g. "AI Engineer"
    description = Column(Text)

    # Classification
    category = Column(String)                         # role-based | skill-based | technology
    tags = Column(JSON, default=list)                 # ["ai", "machine-learning"]

    # URLs
    external_url = Column(String)                     # https://roadmap.sh/ai-engineer
    local_path = Column(String)                       # local repo path

    # Counts
    topic_count = Column(Integer, default=0)

    # Import metadata
    last_imported = Column(DateTime(timezone=True), nullable=True)
    import_version = Column(String)                   # git commit or version
    is_active = Column(Boolean, default=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    topics = relationship("RoadmapTopic", back_populates="source",
                          cascade="all, delete-orphan")


class RoadmapTopic(Base):
    """An individual topic node within a RoadmapSource.
    Parsed from roadmaps/<slug>/content/<topic>@<node-id>.md
    """
    __tablename__ = "roadmap_topics"

    id = Column(String, primary_key=True, default=gen_uuid)
    source_id = Column(String, ForeignKey("roadmap_sources.id", ondelete="CASCADE"), index=True)

    node_id = Column(String)                    # the @<hash> part of filename
    topic_slug = Column(String)                 # the <topic-slug> part
    title = Column(String, nullable=False)
    description = Column(Text)

    # Parsed resources from the .md file
    resources = Column(JSON, default=list)      # [{title, url, type}]

    # Ordering / relationships
    order_index = Column(Integer, default=0)
    prerequisites = Column(JSON, default=list)  # other topic_slugs

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    source = relationship("RoadmapSource", back_populates="topics")

    __table_args__ = (
        Index("ix_roadmap_topic_source_slug", "source_id", "topic_slug"),
    )


# ─────────────────────────────────────────────────────────────
# SOURCE REGISTRY — Admin-Level Source Management
# ─────────────────────────────────────────────────────────────

class SourceRegistry(Base):
    """Registry of all authoritative data sources.
    Used for source attribution and update management.
    """
    __tablename__ = "source_registry"

    id = Column(String, primary_key=True, default=gen_uuid)
    name = Column(String, unique=True, nullable=False)    # e.g. "roadmap.sh"
    source_type = Column(String)                          # open-source | official | academic | vendor
    url = Column(String)                                  # https://roadmap.sh/
    local_path = Column(String)                           # local repo/file path
    version_or_commit = Column(String)
    last_imported = Column(DateTime(timezone=True), nullable=True)
    status = Column(String, default="active")             # active | inactive | broken
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

# ─────────────────────────────────────────────────────────────
# PHASE 5: CAREER INTELLIGENCE & READINESS
# ─────────────────────────────────────────────────────────────

class ReadinessLevel(str, enum.Enum):
    NOT_ASSESSED = "not_assessed"
    BEGINNER = "beginner"
    DEVELOPING = "developing"
    INTERMEDIATE = "intermediate"
    JOB_READY = "job_ready"
    STRONG = "strong"

class CareerReadiness(Base):
    __tablename__ = "career_readiness"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    target_role = Column(String, nullable=False)
    
    readiness_level = Column(SQLEnum(ReadinessLevel), default=ReadinessLevel.NOT_ASSESSED)
    estimated_score = Column(Float, default=0.0)
    confidence = Column(Float, default=0.0)
    uncertainty = Column(Float, default=1.0)
    evidence_count = Column(Integer, default=0)
    
    dimensions = Column(JSON, default=dict) # e.g. {"Programming": 79, "Projects": 61}
    last_assessed = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User")

class SkillGapPriority(str, enum.Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

class SkillGap(Base):
    __tablename__ = "skill_gaps"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    target_role = Column(String)
    
    skill_id = Column(String, nullable=False)
    skill_name = Column(String)
    priority = Column(SQLEnum(SkillGapPriority), default=SkillGapPriority.MEDIUM)
    reasoning = Column(Text)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    is_active = Column(Boolean, default=True)

class Project(Base):
    __tablename__ = "project_catalog"

    id = Column(String, primary_key=True, default=gen_uuid)
    title = Column(String, nullable=False)
    domain = Column(String)
    difficulty = Column(String) # Beginner, Intermediate, Advanced
    required_skills = Column(JSON, default=list)
    technologies = Column(JSON, default=list)
    competencies = Column(JSON, default=list)
    prerequisites = Column(JSON, default=list)
    estimated_duration = Column(String)
    role_alignment = Column(JSON, default=list)
    learning_outcomes = Column(JSON, default=list)
    resume_value = Column(String)
    deployment_required = Column(Boolean, default=False)
    github_required = Column(Boolean, default=False)
    
    level_in_progression = Column(Integer, default=1)
    is_active = Column(Boolean, default=True)

class CareerEvent(Base):
    """Immutable log of the career journey (Timeline)"""
    __tablename__ = "career_events"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    event_type = Column(String) # e.g., "Interview Completed", "Project Completed", "Profile Created"
    title = Column(String)
    description = Column(Text)
    metadata_json = Column(JSON, default=dict)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class CompetencyHistory(Base):
    """Immutable history record for 'Why did my score change?'"""
    __tablename__ = "competency_history"

    id = Column(String, primary_key=True, default=gen_uuid)
    node_id = Column(String, ForeignKey("competency_nodes.id", ondelete="CASCADE"))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"))
    skill_name = Column(String)
    
    prev_state = Column(String)
    prev_confidence = Column(Float)
    
    new_state = Column(String)
    new_confidence = Column(Float)
    
    evidence_source = Column(String)
    reasoning = Column(Text)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class NextBestAction(Base):
    __tablename__ = "next_best_actions"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    
    action_type = Column(String) # LEARN_SKILL, BUILD_PROJECT, etc.
    title = Column(String)
    description = Column(Text)
    reasoning = Column(Text)
    priority = Column(Integer, default=1) # 1 is highest
    
    action_metadata = Column(JSON, default=dict) # URLs, IDs, etc.
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    is_active = Column(Boolean, default=True)

class PlacementPlan(Base):
    __tablename__ = "placement_plans"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    target_role = Column(String)
    
    weeks = Column(JSON, default=list) # Array of week plans
    
    generated_at = Column(DateTime(timezone=True), server_default=func.now())
    is_active = Column(Boolean, default=True)

