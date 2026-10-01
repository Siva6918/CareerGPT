// CareerGPT - Interview Page (Agentic AI Interview Loop)
import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { interviewAPI, careerAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import {
  Cpu, Send, Brain, Activity, ChevronRight, AlertCircle,
  CheckCircle, HelpCircle, BarChart3, Mic, MicOff,
  RefreshCw, ArrowRight, Eye, MessageSquare, Zap, Sparkles
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


const STATE_META = {
  strong: { label: 'Strong', color: '#10b981', bg: '#ecfdf5' },
  demonstrated: { label: 'Demonstrated', color: '#2563eb', bg: '#eff6ff' },
  developing: { label: 'Developing', color: '#d97706', bg: '#fefce8' },
  emerging: { label: 'Emerging', color: '#ec4899', bg: '#fdf2f8' },
  unknown: { label: 'Unknown', color: '#64748b', bg: '#f1f5f9' },
};

const PHASE = {
  SETUP: 'setup',
  ACTIVE: 'active',
  ANALYZING: 'analyzing',
  COMPLETED: 'completed',
};

export default function InterviewPage() {
  const { user, isDemoMode } = useAuth();
  const navigate = useNavigate();
  const { id: urlInterviewId } = useParams();

  const [phase, setPhase] = useState(urlInterviewId ? PHASE.ACTIVE : PHASE.SETUP);
  const [interviewId, setInterviewId] = useState(urlInterviewId || null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [answer, setAnswer] = useState('');
  const [graphNodes, setGraphNodes] = useState([]);
  const [history, setHistory] = useState([]);
  const [agentReasoning, setAgentReasoning] = useState(null);
  const [progress, setProgress] = useState({ questions_asked: 0, max_questions: 10, percent: 0 });
  const [lastAnalysis, setLastAnalysis] = useState(null);
  const [setupForm, setSetupForm] = useState({
    target_role: 'Backend Developer',
    target_domain: 'Backend Engineering',
    branch: 'CSE',
    max_questions: 10
  });
  const [loading, setLoading] = useState(false);
  const answerRef = useRef(null);

  const [careerIndex, setCareerIndex] = useState({});
  const [availableBranches, setAvailableBranches] = useState([]);
  const [availableDomains, setAvailableDomains] = useState([]);
  const [availableRoles, setAvailableRoles] = useState([]);

  useEffect(() => {
    async function loadIndex() {
      try {
        const res = await careerAPI.getIndex();
        const data = res.data.career_index || {};
        setCareerIndex(data);
        const branches = Object.keys(data);
        setAvailableBranches(branches);
        if (branches.length > 0) {
          const firstBranch = branches[0];
          const domains = Object.keys(data[firstBranch] || {});
          setAvailableDomains(domains);
          const roles = domains.length > 0 ? (data[firstBranch][domains[0]]?.tracks?.map(t => t.title) || []) : [];
          setAvailableRoles(roles);
          setSetupForm(prev => ({ 
            ...prev, 
            branch: prev.branch && branches.includes(prev.branch) ? prev.branch : firstBranch, 
            target_domain: prev.target_domain && domains.includes(prev.target_domain) ? prev.target_domain : (domains[0] || ''), 
            target_role: prev.target_role && roles.includes(prev.target_role) ? prev.target_role : (roles[0] || '') 
          }));
        }
      } catch (err) {
        toast.error("Failed to load career index");
      }
    }
    loadIndex();
  }, []);

  const handleBranchChange = (e) => {
    const newBranch = e.target.value;
    const domains = Object.keys(careerIndex[newBranch] || {});
    setAvailableDomains(domains);
    const newDomain = domains[0] || '';
    const roles = newDomain ? (careerIndex[newBranch][newDomain]?.tracks?.map(t => t.title) || []) : [];
    setAvailableRoles(roles);
    
    setSetupForm(p => ({
      ...p,
      branch: newBranch,
      target_domain: newDomain,
      target_role: roles[0] || ''
    }));
  };

  const handleDomainChange = (e) => {
    const newDomain = e.target.value;
    const roles = careerIndex[setupForm.branch]?.[newDomain]?.tracks?.map(t => t.title) || [];
    setAvailableRoles(roles);

    setSetupForm(p => ({
      ...p,
      target_domain: newDomain,
      target_role: roles[0] || ''
    }));
  };

  useEffect(() => {
    if (urlInterviewId) {
      loadInterviewData(urlInterviewId);
    }
  }, [urlInterviewId]);

  const loadInterviewData = async (id) => {
    try {
      const graphRes = await interviewAPI.getGraph(id);
      if (graphRes.data?.nodes) {
        setGraphNodes(graphRes.data.nodes);
      }
      await fetchNextQuestion(id);
    } catch (err) {
      toast.error('Could not load interview session');
    }
  };

  const startInterview = async () => {
    setLoading(true);
    try {
      const res = await interviewAPI.start({
        ...setupForm,
        max_questions: parseInt(setupForm.max_questions)
      });
      const id = res.data.interview_id;
      setInterviewId(id);

      if (res.data.session?.initial_graph?.nodes) {
        setGraphNodes(res.data.session.initial_graph.nodes);
      }

      setPhase(PHASE.ACTIVE);
      toast.success('Interview loop started!');
      await fetchNextQuestion(id);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to start interview');
    } finally {
      setLoading(false);
    }
  };

  const fetchNextQuestion = async (id) => {
    setLoading(true);
    try {
      const res = await interviewAPI.nextQuestion(id || interviewId);
      const data = res.data;

      if (data.action === 'conclude') {
        setPhase(PHASE.COMPLETED);
        toast.success(`Interview complete! ${data.reason || ''}`);
        return;
      }

      setCurrentQuestion(data.question);
      setProgress(data.progress || progress);
      setAgentReasoning(data.agent_reasoning);
      setAnswer('');
      setTimeout(() => answerRef.current?.focus(), 100);
    } catch (err) {
      toast.error('Failed to get next question');
    } finally {
      setLoading(false);
    }
  };

  const submitAnswer = async () => {
    if (!answer.trim() || !currentQuestion) return;
    setPhase(PHASE.ANALYZING);

    try {
      const res = await interviewAPI.submitAnswer({
        interview_id: interviewId,
        question_id: currentQuestion.question_id,
        question_text: currentQuestion.question_text,
        skill_id: currentQuestion.skill_id,
        answer_text: answer,
        duration_seconds: 45
      });

      const analysis = res.data.evidence_analysis || {};
      setLastAnalysis(analysis);

      if (res.data.updated_graph?.nodes) {
        setGraphNodes(res.data.updated_graph.nodes);
      }

      setHistory(prev => [...prev, {
        question: currentQuestion.question_text,
        answer: answer,
        skill: currentQuestion.skill_name,
        score: analysis.fused_evidence?.fused_score || 0.7
      }]);

      setPhase(PHASE.ACTIVE);
      setTimeout(() => fetchNextQuestion(interviewId), 1000);
    } catch (err) {
      toast.error('Failed to submit answer');
      setPhase(PHASE.ACTIVE);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      submitAnswer();
    }
  };

  // ── SETUP PHASE ───────────────────────────────────────────
  if (phase === PHASE.SETUP) {
    return (
      <div style={{ maxWidth: 840, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
        
        {/* Banner with Interview UI Media Preview */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={bidirectionalViewport}
          variants={cardFadeUp}
          className="card card-noborder"
          style={{ background: '#ffffff', borderRadius: 20 }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, alignItems: 'center' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span className="tag-pill tag-violet">
                  <Sparkles size={13} /> Adaptive Multimodal Engine
                </span>
                <span className="font-croissant-pink" style={{ fontSize: '0.9rem' }}>
                  Maximum Information Gain
                </span>
              </div>
              <h2 style={{ fontSize: '1.9rem', fontFamily: 'var(--font-heading)', color: 'var(--text-primary)', marginBottom: 8 }}>
                Configure AI Mock Interview
              </h2>
              <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                Questions adapt in real-time based on your graph uncertainty and role requirements. Each question reduces entropy and validates concrete competency.
              </p>
            </div>

            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 14,
              padding: '16px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              minWidth: 260
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} />
                <span style={{ fontSize: '0.8rem', fontFamily: 'var(--font-tech)', fontWeight: 700, color: '#0f172a' }}>
                  ADAPTIVE AGENTIC PROTOCOL
                </span>
              </div>
              <div style={{ fontSize: '0.82rem', color: '#64748b', lineHeight: 1.4 }}>
                Real-time question sequencing targets skills with highest uncertainty to minimize assessment duration while maximizing accuracy.
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                <span className="tag-pill tag-blue" style={{ fontSize: '0.7rem' }}>Multimodal Voice/Text</span>
                <span className="tag-pill tag-violet" style={{ fontSize: '0.7rem' }}>Gemini LLM Scoring</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Configuration Form Card */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={bidirectionalViewport}
          variants={cardFadeUp}
          className="card"
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontFamily: 'var(--font-tech)', fontWeight: 700, color: 'var(--text-subtle)', marginBottom: 6 }}>
                B.TECH BRANCH
              </label>
              <select
                className="form-select"
                value={setupForm.branch}
                onChange={handleBranchChange}
              >
                {availableBranches.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontFamily: 'var(--font-tech)', fontWeight: 700, color: 'var(--text-subtle)', marginBottom: 6 }}>
                TARGET DOMAIN
              </label>
              <select
                className="form-select"
                value={setupForm.target_domain}
                onChange={handleDomainChange}
              >
                {availableDomains.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontFamily: 'var(--font-tech)', fontWeight: 700, color: 'var(--text-subtle)', marginBottom: 6 }}>
                TARGET ROLE
              </label>
              <select
                className="form-select"
                value={setupForm.target_role}
                onChange={e => setSetupForm(p => ({ ...p, target_role: e.target.value }))}
              >
                {availableRoles.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontFamily: 'var(--font-tech)', fontWeight: 700, color: 'var(--text-subtle)', marginBottom: 6 }}>
                QUESTIONS (5–20)
              </label>
              <input
                type="number"
                className="form-input"
                min={5}
                max={20}
                value={setupForm.max_questions}
                onChange={e => setSetupForm(p => ({ ...p, max_questions: e.target.value }))}
              />
            </div>
          </div>

          <div style={{ marginTop: 24, padding: '14px 18px', background: 'var(--bg-surface-subtle)', borderRadius: 12, border: 'var(--border-ultra-thin)' }}>
            <span className="font-tech-black" style={{ fontSize: '0.85rem' }}>
              🤖 Agentic Sequence: Observe → Compute Information Gain → Ask → Analyze Multimodal Evidence → Update Graph
            </span>
          </div>

          <button
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', marginTop: 20, padding: 14, fontSize: '1rem' }}
            onClick={startInterview}
            disabled={loading}
          >
            {loading ? 'Initializing Session...' : 'Begin Adaptive AI Interview'}
          </button>
        </motion.div>

      </div>
    );
  }

  // ── COMPLETED PHASE ───────────────────────────────────────
  if (phase === PHASE.COMPLETED) {
    return (
      <div style={{ maxWidth: 840, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div className="card" style={{ textAlign: 'center', padding: '48px 32px' }}>
          <div style={{
            width: 70, height: 70, borderRadius: '50%',
            background: '#ecfdf5', color: '#10b981',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px'
          }}>
            <CheckCircle size={38} />
          </div>
          <h2 style={{ fontSize: '2.2rem', fontFamily: 'var(--font-heading)', color: 'var(--text-primary)', marginBottom: 6 }}>
            Interview Evaluation Completed
          </h2>
          <p className="font-croissant-pink" style={{ fontSize: '1.1rem', marginBottom: 20 }}>
            {progress.questions_asked} Questions Answered • Competency Graph Updated
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 14 }}>
            <button className="btn btn-primary" onClick={() => navigate(`/report/${interviewId}`)}>
              View Comprehensive Placement Report <ArrowRight size={16} />
            </button>
            <button className="btn btn-secondary" onClick={() => setPhase(PHASE.SETUP)}>
              Configure New Session
            </button>
          </div>
        </div>

        {/* Question History */}
        <div className="card">
          <h3 style={{ fontSize: '1.2rem', fontFamily: 'var(--font-heading)', marginBottom: 16 }}>
            Session Question Responses
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {history.map((h, i) => (
              <div key={i} style={{ padding: '14px 18px', background: 'var(--bg-surface-subtle)', borderRadius: 12, borderLeft: '4px solid var(--color-green)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span className="font-tech-black" style={{ fontSize: '0.85rem' }}>{h.skill}</span>
                  <span className="font-mono-red" style={{ fontSize: '0.8rem' }}>Score: {Math.round(h.score * 100)}%</span>
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>{h.question}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{h.answer}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── ACTIVE INTERVIEW ──────────────────────────────────────
  return (
    <div className="interview-container">
      
      {/* Left: Active Question & Response Area */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        
        {/* Progress Card */}
        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span className="font-tech-black" style={{ fontSize: '0.9rem' }}>
              Question {progress.questions_asked + 1} of {progress.max_questions}
            </span>
            <span className="tag-pill tag-violet">
              {progress.percent}% Complete
            </span>
          </div>
          <div style={{ height: 6, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress.percent}%`, background: 'var(--color-violet)', borderRadius: 99 }} />
          </div>
        </div>

        {/* Agent Reasoning Capsule */}
        {agentReasoning && (
          <div style={{
            padding: '12px 16px', background: '#f5f3ff', borderRadius: 12,
            border: '1px solid rgba(139, 92, 246, 0.15)', display: 'flex', alignItems: 'center', gap: 10
          }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-violet)' }} />
            <div style={{ fontSize: '0.85rem', color: 'var(--color-violet-text)', fontFamily: 'var(--font-tech)' }}>
              <strong>Adaptive Decision: </strong>
              {agentReasoning.decision || 'Targeting high-uncertainty prerequisite node to maximize information gain.'}
            </div>
          </div>
        )}

        {/* Question Card */}
        <div className="card" style={{ padding: '32px 28px' }}>
          {loading && !currentQuestion ? (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <div style={{
                width: 38, height: 38,
                border: '3px solid rgba(139, 92, 246, 0.2)',
                borderTop: '3px solid var(--color-violet)',
                borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px'
              }} />
              <p className="font-tech-black">Agent is selecting next optimal question...</p>
            </div>
          ) : currentQuestion ? (
            <div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
                <span className="tag-pill tag-pink">🎯 {currentQuestion.skill_name}</span>
                <span className="tag-pill tag-blue">Difficulty: {currentQuestion.difficulty}</span>
                <span className="tag-pill tag-green">Type: {currentQuestion.question_type}</span>
              </div>

              <h3 style={{ fontSize: '1.35rem', lineHeight: 1.5, color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>
                {currentQuestion.question_text}
              </h3>
            </div>
          ) : null}
        </div>

        {/* Answer Textarea */}
        {currentQuestion && phase !== PHASE.ANALYZING && (
          <div className="card" style={{ padding: 20 }}>
            <textarea
              ref={answerRef}
              className="form-textarea"
              style={{ minHeight: 160, padding: 16, fontSize: '1rem', resize: 'vertical', border: 'var(--border-subtle)' }}
              placeholder="Provide a detailed, technical answer with code examples or architectural trade-offs where applicable. Press Ctrl+Enter to submit."
              value={answer}
              onChange={e => setAnswer(e.target.value)}
              onKeyDown={handleKeyDown}
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'var(--font-tech)' }}>
                {answer.split(/\s+/).filter(Boolean).length} words • Press Ctrl+Enter to submit
              </span>
              <button
                className="btn btn-primary"
                onClick={submitAnswer}
                disabled={!answer.trim() || loading}
              >
                <Send size={15} /> Submit Response
              </button>
            </div>
          </div>
        )}

        {/* Analyzing Animation */}
        {phase === PHASE.ANALYZING && (
          <div className="card" style={{ textAlign: 'center', padding: 32 }}>
            <div style={{
              width: 36, height: 36,
              border: '3px solid rgba(234, 88, 12, 0.2)',
              borderTop: '3px solid var(--color-primary)',
              borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px'
            }} />
            <div className="font-tech-black" style={{ fontSize: '1.05rem', marginBottom: 4 }}>
              Analyzing Multimodal Evidence...
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
              Extracting concepts, depth metrics, and updating the competency network.
            </p>
          </div>
        )}

      </div>

      {/* Right: Live Graph Telemetry Sidebar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Brain size={18} color="var(--color-primary)" />
            <h4 style={{ margin: 0, fontSize: '1rem', fontFamily: 'var(--font-heading)' }}>
              Live Graph Telemetry
            </h4>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {graphNodes.slice(0, 8).map((node, i) => {
              const meta = STATE_META[node.competency_state] || STATE_META.unknown;

              return (
                <div key={i} style={{ padding: '8px 12px', borderRadius: 8, background: 'var(--bg-surface-subtle)', border: 'var(--border-ultra-thin)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{node.skill_name}</span>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: meta.color, fontFamily: 'var(--font-tech)' }}>
                      {node.competency_state}
                    </span>
                  </div>
                  <div style={{ height: 4, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(1 - node.uncertainty) * 100}%`, background: meta.color, borderRadius: 99 }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

    </div>
  );
}
