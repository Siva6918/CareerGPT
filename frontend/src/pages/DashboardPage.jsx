// CareerGPT - Candidate Command Center (Production Dashboard)
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { profileAPI, interviewAPI, competencyAPI, roadmapAPI, learningGoalsAPI } from '../services/api';
import {
  Brain, Cpu, Map, Sparkles, ArrowRight, CheckCircle, Clock,
  Layers, Compass, Award, Building2, Calendar, FileText, Upload,
  AlertCircle, ShieldCheck, ChevronRight, Zap, Target, BookOpen,
  ArrowDown, Check, Briefcase, Plus
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
  cardFadeUp,
  cardSlideLeft,
  cardSlideRight,
  statMotion,
  staggerContainer,
  bidirectionalViewport
} from '../utils/motionVariants';

const STATE_COLORS = {
  strong: { label: 'Strong', color: '#10b981', bg: '#ecfdf5', icon: '⭐' },
  demonstrated: { label: 'Demonstrated', color: '#2563eb', bg: '#eff6ff', icon: '✅' },
  developing: { label: 'Developing', color: '#d97706', bg: '#fefce8', icon: '📈' },
  emerging: { label: 'Emerging', color: '#ec4899', bg: '#fdf2f8', icon: '🌱' },
  unknown: { label: 'Unknown', color: '#64748b', bg: '#f1f5f9', icon: '❓' },
};

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [interviews, setInterviews] = useState([]);
  const [nodes, setNodes] = useState([]);
  const [roadmap, setRoadmap] = useState(null);
  const [learningGoals, setLearningGoals] = useState([]);
  const [primaryGoal, setPrimaryGoal] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [profileRes, interviewRes, graphRes, roadmapRes, goalsRes] = await Promise.allSettled([
        profileAPI.getMe(),
        interviewAPI.list(),
        competencyAPI.getGraph(),
        roadmapAPI.getCurrent(),
        learningGoalsAPI.list(),
      ]);

      if (profileRes.status === 'fulfilled') {
        setProfile(profileRes.value.data);
      }
      if (interviewRes.status === 'fulfilled') {
        const data = interviewRes.value.data;
        setInterviews(Array.isArray(data) ? data : data.interviews || []);
      }
      if (graphRes.status === 'fulfilled') {
        setNodes(graphRes.value.data?.nodes || []);
      }
      if (roadmapRes.status === 'fulfilled' && roadmapRes.value.data?.has_roadmap) {
        setRoadmap(roadmapRes.value.data);
      } else if (roadmapRes.status === 'fulfilled' && roadmapRes.value.data?.stages) {
        setRoadmap(roadmapRes.value.data);
      }
      if (goalsRes.status === 'fulfilled') {
        setLearningGoals(goalsRes.value.data?.goals || []);
        setPrimaryGoal(goalsRes.value.data?.primary || null);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const hasProfile = Boolean(profile?.has_profile);

  // Dynamic Metrics derived from real PostgreSQL data
  const validatedSkills = nodes.filter(
    (n) => n.competency_state === 'demonstrated' || n.competency_state === 'strong'
  ).length;

  const developingSkills = nodes.filter(
    (n) => n.competency_state === 'developing' || n.competency_state === 'emerging'
  ).length;

  const unknownSkills = nodes.filter((n) => n.competency_state === 'unknown').length;

  const avgCertainty = nodes.length > 0
    ? Math.round(
        nodes.reduce((acc, n) => acc + (1 - (n.uncertainty ?? 1)), 0) / nodes.length * 100
      )
    : 0;

  // Placement readiness calculation
  const readinessScore = nodes.length > 0
    ? Math.min(
        100,
        Math.round(
          (validatedSkills * 25 + developingSkills * 12 + (interviews.length * 10)) /
            Math.max(1, nodes.length * 0.3)
        )
      )
    : 0;

  // Connected Hierarchy Path resolution
  const activeBranch = profile?.branch || roadmap?.branch || '';
  const activeDomain = profile?.target_domain || roadmap?.domain || '';
  const activeRole = profile?.target_role || roadmap?.target_role || '';
  const activeLanguage = (profile?.preferred_languages && profile.preferred_languages[0]) || roadmap?.language || '';
  const activeTechs = (profile?.preferred_technologies && profile.preferred_technologies.slice(0, 3)) || roadmap?.technologies || [];

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: 44,
              height: 44,
              border: '3px solid rgba(234, 88, 12, 0.15)',
              borderTop: '3px solid var(--color-primary)',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 16px'
            }}
          />
          <p className="font-tech-black" style={{ fontSize: '0.95rem', color: '#64748b' }}>
            Synchronizing Connected Career Graph & Telemetry...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

      {/* 1. Hero Candidate Overview Banner */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={bidirectionalViewport}
        variants={cardFadeUp}
        className="card card-noborder"
        style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #fff7ed 100%)',
          padding: '32px 36px',
          borderRadius: 20
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 24 }}>
          <div style={{ maxWidth: 680 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <span className="tag-pill tag-orange">
                <Sparkles size={13} /> Active Career Graph Telemetry
              </span>
              <span className="font-croissant-pink" style={{ fontSize: '0.95rem' }}>
                {profile?.college ? profile.college : 'Engineering Placement Track'}
              </span>
            </div>

            <h2 style={{
              fontSize: '2.2rem',
              fontWeight: 800,
              fontFamily: 'var(--font-heading)',
              color: '#0f172a',
              letterSpacing: '0.01em',
              marginBottom: 8
            }}>
              Welcome Back,{' '}
              <span style={{ color: '#ea580c' }}>
                {user?.full_name || user?.username || 'Engineer'}
              </span>
            </h2>

            <p style={{ fontSize: '1rem', color: '#475569', lineHeight: 1.6, marginBottom: 20 }}>
              {hasProfile
                ? `Calibrated for ${activeRole} in ${activeDomain} (${activeBranch} • Year ${profile.year_of_study || 3}). CareerGPT continuously updates your curriculum and interview target based on demonstrated evidence.`
                : 'Your profile baseline is awaiting calibration. Set up your branch, college, and role targets to unlock personalized adaptive telemetry.'}
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <Link to="/roadmap" className="btn btn-primary btn-lg">
                <Map size={18} /> View Dynamic Career Roadmap <ArrowRight size={16} />
              </Link>
              <Link to="/interview" className="btn btn-secondary btn-lg">
                <Cpu size={18} /> Launch AI Mock Interview
              </Link>
              <Link to="/profile/setup" className="btn btn-secondary btn-lg" style={{ background: '#ffffff' }}>
                <Building2 size={16} /> Edit Target Profile
              </Link>
            </div>
          </div>

          {/* Placement Readiness Ring Gauge */}
          <div style={{
            background: '#ffffff',
            padding: '24px 28px',
            borderRadius: 18,
            boxShadow: 'var(--shadow-sm)',
            border: 'var(--border-ultra-thin)',
            textAlign: 'center',
            minWidth: 260
          }}>
            <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-tech)', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
              Placement Readiness Index
            </div>

            <div style={{ position: 'relative', width: 110, height: 110, margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="110" height="110" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="50" cy="50" r="42" fill="none" stroke="#f1f5f9" strokeWidth="8" />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="url(#readinessGrad)"
                  strokeWidth="8"
                  strokeDasharray="264"
                  strokeDashoffset={264 - (264 * Math.min(readinessScore, 100)) / 100}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                />
                <defs>
                  <linearGradient id="readinessGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#f97316" />
                    <stop offset="100%" stopColor="#ea580c" />
                  </linearGradient>
                </defs>
              </svg>
              <div style={{ position: 'absolute', textAlign: 'center' }}>
                <span className="font-tech-black" style={{ fontSize: '1.75rem', fontWeight: 800 }}>
                  {readinessScore}%
                </span>
              </div>
            </div>

            <span className="tag-pill tag-green" style={{ fontSize: '0.75rem' }}>
              <ShieldCheck size={13} /> {readinessScore > 50 ? 'Strong Evidence' : 'Assessment Needed'}
            </span>
          </div>
        </div>
      </motion.section>

      {/* ── 1.5 LEARNING GOALS DASHBOARD ── */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={bidirectionalViewport}
        variants={cardFadeUp}
        style={{ marginBottom: '24px' }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          {/* Primary Goal Summary */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(249,115,22,0.08), rgba(255,255,255,0.95))',
            borderRadius: '20px',
            padding: '24px',
            border: '1.5px solid rgba(249,115,22,0.3)',
            boxShadow: '0 4px 16px rgba(249,115,22,0.08)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ padding: '2px 8px', borderRadius: '10px', background: '#f97316', color: '#fff', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' }}>
                    Primary Goal
                  </span>
                </div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#1a1a2e', fontFamily: 'var(--font-heading)' }}>
                  {primaryGoal ? primaryGoal.title : 'No Primary Goal Set'}
                </h3>
              </div>
              <Link to="/learning" className="btn btn-secondary btn-sm" style={{ padding: '6px 12px', background: '#fff' }}>
                <Target size={14} /> My Learning
              </Link>
            </div>
            {primaryGoal ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Overall Progress</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f97316' }}>{Math.round(primaryGoal.progress_pct || 0)}%</span>
                </div>
                <div style={{ height: '8px', background: 'rgba(249,115,22,0.1)', borderRadius: '8px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${primaryGoal.progress_pct || 0}%`, background: 'linear-gradient(90deg, #f97316, #ea580c)', borderRadius: '8px' }} />
                </div>
                <div style={{ marginTop: '16px', fontSize: '0.85rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <BookOpen size={14} /> {primaryGoal.roadmaps?.length || 0} associated roadmaps
                </div>
              </div>
            ) : (
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#64748b' }}>
                Set up a learning goal to track your multi-domain career progress.
              </p>
            )}
          </div>

          {/* Roadmap Discovery */}
          <div style={{
            background: '#ffffff',
            borderRadius: '20px',
            padding: '24px',
            border: '1px solid #e2e8f0',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(59,130,246,0.1)' }}>
                  <Map size={18} color="#3b82f6" />
                </div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#1a1a2e', fontFamily: 'var(--font-heading)' }}>
                  Explore Roadmaps
                </h3>
              </div>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#64748b', lineHeight: 1.5 }}>
                Discover role-based and skill-based roadmaps imported from roadmap.sh. Add them to your learning goals.
              </p>
            </div>
            <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Link to="/roadmaps" className="btn btn-primary" style={{ background: '#3b82f6', borderColor: '#3b82f6', color: '#fff' }}>
                Browse Catalog <ArrowRight size={16} />
              </Link>
              <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>
                {learningGoals.length > 0 ? `${learningGoals.length} Active Goals` : '0 Active Goals'}
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* ── 2. VISUAL CONNECTED CAREER GRAPH FLOWCHART (SECTION 15) ── */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={bidirectionalViewport}
        variants={cardFadeUp}
        className="card"
        style={{
          background: '#ffffff',
          borderRadius: 20,
          padding: '28px 32px',
          border: '1px solid #e2e8f0'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span className="tag-pill tag-blue">End-to-End Connected Graph</span>
              <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                Branch → Domain → Role → Language → Specialization → Proof
              </span>
            </div>
            <h3 style={{ fontSize: '1.35rem', margin: 0, fontFamily: 'var(--font-heading)', color: '#0f172a', fontWeight: 800 }}>
              Your Personalized 8-Step Career Pipeline
            </h3>
          </div>
          <Link to="/roadmap" className="btn btn-secondary btn-sm">
            Configure Graph In Roadmap <ChevronRight size={14} />
          </Link>
        </div>

        {/* 8-Step Visual Cascade Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
          
          {/* Step 1: Branch */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 14,
            padding: '16px 18px',
            position: 'relative'
          }}>
            <div style={{ fontSize: '0.72rem', fontFamily: 'var(--font-tech)', fontWeight: 800, color: '#2563eb', marginBottom: 4 }}>
              STEP 1 • B.TECH MAJOR
            </div>
            <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#0f172a' }}>
              {activeBranch}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 4 }}>
              Prerequisite foundation discipline
            </div>
          </div>

          {/* Step 2: Domain */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 14,
            padding: '16px 18px'
          }}>
            <div style={{ fontSize: '0.72rem', fontFamily: 'var(--font-tech)', fontWeight: 800, color: '#0891b2', marginBottom: 4 }}>
              STEP 2 • CAREER DOMAIN
            </div>
            <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#0f172a' }}>
              {activeDomain}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 4 }}>
              Filtered strictly for {activeBranch}
            </div>
          </div>

          {/* Step 3: Target Role */}
          <div style={{
            background: '#fff7ed',
            border: '1px solid #fed7aa',
            borderRadius: 14,
            padding: '16px 18px'
          }}>
            <div style={{ fontSize: '0.72rem', fontFamily: 'var(--font-tech)', fontWeight: 800, color: '#ea580c', marginBottom: 4 }}>
              STEP 3 • TARGET ROLE
            </div>
            <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#9a3412' }}>
              {activeRole}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#c2410c', marginTop: 4 }}>
              Recruitment profile target
            </div>
          </div>

          {/* Step 4: Language */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 14,
            padding: '16px 18px'
          }}>
            <div style={{ fontSize: '0.72rem', fontFamily: 'var(--font-tech)', fontWeight: 800, color: '#7c3aed', marginBottom: 4 }}>
              STEP 4 • PRIMARY LANGUAGE
            </div>
            <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#0f172a' }}>
              {activeLanguage}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 4 }}>
              Ranked primary for {activeRole}
            </div>
          </div>

          {/* Step 5: Specialization */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 14,
            padding: '16px 18px'
          }}>
            <div style={{ fontSize: '0.72rem', fontFamily: 'var(--font-tech)', fontWeight: 800, color: '#059669', marginBottom: 4 }}>
              STEP 5 • TECHNOLOGIES
            </div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a' }}>
              {Array.isArray(activeTechs) ? activeTechs.join(', ') : activeTechs}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 4 }}>
              Role-compatible frameworks
            </div>
          </div>

          {/* Step 6: Resume Evidence */}
          <div style={{
            background: nodes.some(n => n.evidence_from_resume) ? '#f0fdf4' : '#f8fafc',
            border: `1px solid ${nodes.some(n => n.evidence_from_resume) ? '#86efac' : '#e2e8f0'}`,
            borderRadius: 14,
            padding: '16px 18px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-tech)', fontWeight: 800, color: nodes.some(n => n.evidence_from_resume) ? '#16a34a' : '#64748b' }}>
                STEP 6 • RESUME EVIDENCE
              </span>
              {nodes.some(n => n.evidence_from_resume) ? <CheckCircle size={15} color="#16a34a" /> : <Clock size={15} color="#94a3b8" />}
            </div>
            <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0f172a' }}>
              {nodes.some(n => n.evidence_from_resume) ? `${nodes.filter(n => n.evidence_from_resume).length} Skills Extracted` : 'Upload Resume'}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 4 }}>
              Baseline evidence extraction
            </div>
          </div>

          {/* Step 7: Multimodal Competency */}
          <div style={{
            background: nodes.length > 0 ? '#f0fdf4' : '#f8fafc',
            border: `1px solid ${nodes.length > 0 ? '#86efac' : '#e2e8f0'}`,
            borderRadius: 14,
            padding: '16px 18px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-tech)', fontWeight: 800, color: '#d97706' }}>
                STEP 7 • COMPETENCY GRAPH
              </span>
              <Brain size={15} color="#d97706" />
            </div>
            <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0f172a' }}>
              {nodes.length} Nodes • {avgCertainty}% Conf.
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 4 }}>
              Entropy-reduced assessment
            </div>
          </div>

          {/* Step 8: Personalized Career Map */}
          <div style={{
            background: '#fff7ed',
            border: '1px solid #ea580c',
            borderRadius: 14,
            padding: '16px 18px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-tech)', fontWeight: 800, color: '#ea580c' }}>
                STEP 8 • PERSONALIZED MAP
              </span>
              <Award size={15} color="#ea580c" />
            </div>
            <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#9a3412' }}>
              4-Tier Progressive Proof
            </div>
            <div style={{ fontSize: '0.78rem', color: '#c2410c', marginTop: 4 }}>
              Guided → Integrated → Capstone
            </div>
          </div>

        </div>

        {/* Visual Graph Connection Example Callout */}
        <div style={{
          marginTop: 20,
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: 12,
          padding: '12px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flexWrap: 'wrap',
          fontSize: '0.85rem'
        }}>
          <span style={{ fontWeight: 800, color: '#ea580c' }}>Connected Hierarchy:</span>
          <span className="tag-pill tag-blue">{activeBranch}</span>
          <ArrowRight size={14} color="#94a3b8" />
          <span className="tag-pill tag-blue">{activeDomain}</span>
          <ArrowRight size={14} color="#94a3b8" />
          <span className="tag-pill tag-orange">{activeRole}</span>
          <ArrowRight size={14} color="#94a3b8" />
          <span className="tag-pill tag-green">{activeLanguage}</span>
          <ArrowRight size={14} color="#94a3b8" />
          <span className="tag-pill tag-violet">4-Tier Project Ladder</span>
          <ArrowRight size={14} color="#94a3b8" />
          <span className="tag-pill tag-green">Placement Ready</span>
        </div>
      </motion.section>

      {/* 3. Top Metric Cards Using Real Database Telemetry */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={bidirectionalViewport}
        variants={staggerContainer}
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}
      >
        {/* Card 1: Verified Skills */}
        <motion.div variants={statMotion} className="card" style={{ borderLeft: '4px solid var(--color-blue)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span className="tag-pill tag-blue">Verified Skills</span>
            <Layers size={18} color="var(--color-blue)" />
          </div>
          <div className="font-tech-black" style={{ fontSize: '2.1rem', margin: '4px 0', lineHeight: 1.1 }}>
            {validatedSkills} <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>/ {nodes.length}</span>
          </div>
          <div className="font-oswald-blue" style={{ fontSize: '0.85rem' }}>
            Demonstrated or Strong Evidence
          </div>
        </motion.div>

        {/* Card 2: Bayesian Certainty */}
        <motion.div variants={statMotion} className="card" style={{ borderLeft: '4px solid var(--color-pink)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span className="tag-pill tag-pink">Avg Certainty</span>
            <Brain size={18} color="var(--color-pink)" />
          </div>
          <div className="font-tech-black" style={{ fontSize: '2.1rem', margin: '4px 0', lineHeight: 1.1 }}>
            {avgCertainty}<span style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>%</span>
          </div>
          <div className="font-croissant-pink" style={{ fontSize: '0.85rem' }}>
            Entropy-Reduced Confidence
          </div>
        </motion.div>

        {/* Card 3: Interviews Conducted */}
        <motion.div variants={statMotion} className="card" style={{ borderLeft: '4px solid var(--color-violet)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span className="tag-pill tag-violet">Adaptive Sessions</span>
            <Cpu size={18} color="var(--color-violet)" />
          </div>
          <div className="font-tech-black" style={{ fontSize: '2.1rem', margin: '4px 0', lineHeight: 1.1 }}>
            {interviews.length} <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Completed</span>
          </div>
          <div className="font-tech-green" style={{ fontSize: '0.85rem', color: '#7c3aed' }}>
            Multimodal Interview Loops
          </div>
        </motion.div>

        {/* Card 4: Roadmap Milestones */}
        <motion.div variants={statMotion} className="card" style={{ borderLeft: '4px solid var(--color-green)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span className="tag-pill tag-green">Roadmap Stage</span>
            <Compass size={18} color="var(--color-green)" />
          </div>
          <div className="font-tech-black" style={{ fontSize: '2.1rem', margin: '4px 0', lineHeight: 1.1 }}>
            {roadmap?.summary?.stages_count ? `${roadmap.summary.stages_count} Stages` : 'Active'}
          </div>
          <div className="font-tech-green" style={{ fontSize: '0.85rem' }}>
            Curriculum Path Initialized
          </div>
        </motion.div>
      </motion.section>

      {/* 4. Real Competency Graph & Recent Interview Sections */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 24 }}>
        
        {/* Left: Competency Topology Status */}
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={bidirectionalViewport}
          variants={cardSlideLeft}
          className="card"
          style={{ background: '#ffffff', borderRadius: 20 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, borderBottom: '1px solid #f1f5f9', paddingBottom: 12 }}>
            <div>
              <span className="tag-pill tag-blue" style={{ marginBottom: 4 }}>Skill Evidence Graph</span>
              <h3 style={{ fontSize: '1.25rem', margin: 0, fontFamily: 'var(--font-heading)', color: '#0f172a' }}>
                Active Competency States
              </h3>
            </div>
            {nodes.length > 0 && (
              <Link to="/competency" className="btn btn-secondary btn-sm">
                Full Graph <ArrowRight size={14} />
              </Link>
            )}
          </div>

          {nodes.length === 0 ? (
            <div style={{ padding: '36px 16px', textAlign: 'center' }}>
              <Brain size={36} color="#94a3b8" style={{ margin: '0 auto 10px' }} />
              <div style={{ fontWeight: 700, color: '#334155', marginBottom: 4 }}>No Competency Evidence Yet</div>
              <p style={{ fontSize: '0.85rem', color: '#64748b', maxWidth: 360, margin: '0 auto 16px', lineHeight: 1.5 }}>
                Upload your resume in Profile Setup to automatically initialize your verified competency nodes.
              </p>
              <Link to="/profile/setup" className="btn btn-primary btn-sm">
                <Upload size={14} /> Upload Resume & Calibrate
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {nodes.slice(0, 7).map((node) => {
                const meta = STATE_COLORS[node.competency_state] || STATE_COLORS.unknown;
                return (
                  <div
                    key={node.skill_id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      background: '#f8fafc',
                      borderRadius: 10,
                      border: '1px solid #e2e8f0'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>
                        {node.skill_name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        {node.category || 'Core Skill'} • Evidence: {node.evidence_count || 0}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'var(--font-mono)' }}>
                        Certainty: {Math.round((1 - (node.uncertainty ?? 1)) * 100)}%
                      </span>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          padding: '4px 10px',
                          borderRadius: 20,
                          background: meta.bg,
                          color: meta.color,
                          border: `1px solid ${meta.color}30`
                        }}
                      >
                        {meta.icon} {meta.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.section>

        {/* Right: Interview History / Activity */}
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={bidirectionalViewport}
          variants={cardSlideRight}
          className="card"
          style={{ background: '#ffffff', borderRadius: 20 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, borderBottom: '1px solid #f1f5f9', paddingBottom: 12 }}>
            <div>
              <span className="tag-pill tag-violet" style={{ marginBottom: 4 }}>Interview Telemetry</span>
              <h3 style={{ fontSize: '1.25rem', margin: 0, fontFamily: 'var(--font-heading)', color: '#0f172a' }}>
                Recent Mock Interviews
              </h3>
            </div>
            {interviews.length > 0 && (
              <Link to="/interview" className="btn btn-primary btn-sm">
                <Cpu size={14} /> New Interview
              </Link>
            )}
          </div>

          {interviews.length === 0 ? (
            <div style={{ padding: '36px 16px', textAlign: 'center' }}>
              <Cpu size={36} color="#94a3b8" style={{ margin: '0 auto 10px' }} />
              <div style={{ fontWeight: 700, color: '#334155', marginBottom: 4 }}>No Interview Sessions Yet</div>
              <p style={{ fontSize: '0.85rem', color: '#64748b', maxWidth: 360, margin: '0 auto 16px', lineHeight: 1.5 }}>
                Adaptive interviews use probabilistic entropy reduction to target your highest uncertainty skills first.
              </p>
              <Link to="/interview" className="btn btn-primary btn-sm">
                Start 1st Interview Session
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {interviews.slice(0, 5).map((inv) => (
                <div
                  key={inv.id}
                  style={{
                    padding: '14px 16px',
                    borderRadius: 12,
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a' }}>
                      {inv.target_role || 'Software Engineering'}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                      <span>{inv.questions_asked || 0} Questions</span>
                      <span>•</span>
                      <span>{inv.target_domain || 'General'}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '4px 10px',
                        borderRadius: 20,
                        background: inv.status === 'completed' ? '#ecfdf5' : '#fff7ed',
                        color: inv.status === 'completed' ? '#047857' : '#c2410c'
                      }}
                    >
                      {inv.status ? inv.status.toUpperCase() : 'ACTIVE'}
                    </span>
                    <Link
                      to={inv.status === 'completed' ? `/report/${inv.id}` : `/interview/${inv.id}`}
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '6px 12px' }}
                    >
                      {inv.status === 'completed' ? 'Report' : 'Continue'} <ChevronRight size={14} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.section>

      </div>

    </div>
  );
}
