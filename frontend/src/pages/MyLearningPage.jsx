// CareerGPT — My Learning Page
// Multi-domain learning goals with shared competency graph
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { learningGoalsAPI, roadmapSourcesAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import {
  Target, Plus, ExternalLink, BookOpen, CheckCircle, Clock,
  Pause, Play, Trash2, ChevronDown, ChevronRight, Star,
  Zap, BarChart3, Map, ArrowRight, Edit3, RefreshCw, AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const PRIORITY_LABELS = { 1: 'High', 2: 'Medium', 3: 'Low' };
const PRIORITY_COLORS = { 1: '#ef4444', 2: '#f97316', 3: '#64748b' };

const STATUS_COLORS = {
  active: { bg: 'rgba(16,185,129,0.1)', color: '#10b981', label: 'Active' },
  paused: { bg: 'rgba(251,146,60,0.1)', color: '#f97316', label: 'Paused' },
  completed: { bg: 'rgba(59,130,246,0.1)', color: '#3b82f6', label: 'Completed' },
};

function GoalProgressBar({ pct, color = '#f97316' }) {
  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
        <span style={{ fontSize: '12px', color: '#64748b' }}>Progress</span>
        <span style={{ fontSize: '13px', fontWeight: 700, color }}>
          {Math.round(pct)}%
        </span>
      </div>
      <div style={{
        height: '8px',
        background: 'rgba(0,0,0,0.07)',
        borderRadius: '8px',
        overflow: 'hidden',
      }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          style={{
            height: '100%',
            background: `linear-gradient(90deg, ${color}, ${color}cc)`,
            borderRadius: '8px',
          }}
        />
      </div>
    </div>
  );
}

function GoalCard({ goal, onUpdate, onRemove, onExpand, isExpanded }) {
  const statusStyle = STATUS_COLORS[goal.status] || STATUS_COLORS.active;
  const priorityColor = PRIORITY_COLORS[goal.priority] || '#64748b';

  return (
    <motion.div
      layout
      style={{
        background: goal.is_primary
          ? 'linear-gradient(135deg, rgba(249,115,22,0.08), rgba(255,255,255,0.95))'
          : 'rgba(255,255,255,0.92)',
        borderRadius: '16px',
        border: goal.is_primary ? '1.5px solid rgba(249,115,22,0.35)' : '1px solid rgba(249,115,22,0.12)',
        padding: '20px',
        boxShadow: goal.is_primary
          ? '0 6px 30px rgba(249,115,22,0.12)'
          : '0 4px 16px rgba(0,0,0,0.04)',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            {goal.is_primary && (
              <span style={{
                padding: '2px 8px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #f97316, #ea580c)',
                color: '#fff',
                fontSize: '10px',
                fontWeight: 700,
                textTransform: 'uppercase',
              }}>Primary</span>
            )}
            <span style={{
              padding: '2px 8px',
              borderRadius: '10px',
              background: statusStyle.bg,
              color: statusStyle.color,
              fontSize: '10px',
              fontWeight: 600,
            }}>{statusStyle.label}</span>
            <span style={{
              padding: '2px 8px',
              borderRadius: '10px',
              background: `${priorityColor}15`,
              color: priorityColor,
              fontSize: '10px',
              fontWeight: 600,
            }}>
              {PRIORITY_LABELS[goal.priority] || 'Medium'} Priority
            </span>
          </div>
          <h3 style={{
            margin: 0,
            fontSize: '18px',
            fontWeight: 800,
            color: '#1a1a2e',
            fontFamily: 'Manrope, sans-serif',
          }}>{goal.title}</h3>
          {goal.domain && (
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>
              {goal.domain} {goal.track && `• ${goal.track}`}
            </p>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={() => onUpdate(goal.id, { status: goal.status === 'paused' ? 'active' : 'paused' })}
            title={goal.status === 'paused' ? 'Resume' : 'Pause'}
            style={{
              padding: '6px',
              borderRadius: '8px',
              border: '1px solid rgba(100,116,139,0.2)',
              background: 'transparent',
              color: '#64748b',
              cursor: 'pointer',
            }}
          >
            {goal.status === 'paused' ? <Play size={14} /> : <Pause size={14} />}
          </button>
          <button
            onClick={() => onRemove(goal.id)}
            title="Remove goal"
            style={{
              padding: '6px',
              borderRadius: '8px',
              border: '1px solid rgba(239,68,68,0.2)',
              background: 'transparent',
              color: '#ef4444',
              cursor: 'pointer',
            }}
          >
            <Trash2 size={14} />
          </button>
          <button
            onClick={() => onExpand(goal.id)}
            style={{
              padding: '6px',
              borderRadius: '8px',
              border: '1px solid rgba(249,115,22,0.2)',
              background: 'transparent',
              color: '#f97316',
              cursor: 'pointer',
            }}
          >
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        </div>
      </div>

      {/* Progress */}
      <GoalProgressBar
        pct={goal.progress_pct || 0}
        color={goal.is_primary ? '#f97316' : '#3b82f6'}
      />

      {/* Level info */}
      <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
        <span style={{ fontSize: '11px', color: '#64748b' }}>
          Level: <strong style={{ color: '#1a1a2e' }}>{goal.current_level}</strong>
          {' → '}<strong style={{ color: '#f97316' }}>{goal.target_level}</strong>
        </span>
        <span style={{ fontSize: '11px', color: '#64748b' }}>
          Topics: <strong style={{ color: '#1a1a2e' }}>
            {(goal.topic_counts?.completed || 0)}/{Object.values(goal.topic_counts || {}).reduce((a, b) => a + b, 0)} done
          </strong>
        </span>
      </div>

      {/* Expanded: Roadmaps */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
              <h4 style={{ margin: '0 0 12px', fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Associated Roadmaps
              </h4>
              {(goal.roadmaps || []).map(rm => (
                <div key={rm.slug} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  background: 'rgba(249,115,22,0.05)',
                  border: '1px solid rgba(249,115,22,0.1)',
                  marginBottom: '8px',
                }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#1a1a2e' }}>{rm.title}</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>{rm.topic_count} topics • {rm.category}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <Link
                      to={`/roadmaps/${rm.slug}`}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '8px',
                        background: 'rgba(249,115,22,0.1)',
                        color: '#f97316',
                        fontSize: '11px',
                        fontWeight: 600,
                        textDecoration: 'none',
                      }}
                    >
                      Explore
                    </Link>
                    <a
                      href={rm.external_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        padding: '4px 10px',
                        borderRadius: '8px',
                        background: 'rgba(100,116,139,0.1)',
                        color: '#64748b',
                        fontSize: '11px',
                        fontWeight: 600,
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      Official <ExternalLink size={10} />
                    </a>
                  </div>
                </div>
              ))}

              {/* Priority selector */}
              <div style={{ marginTop: '12px' }}>
                <label style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '6px' }}>
                  Change Priority:
                </label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {[1, 2, 3].map(p => (
                    <button
                      key={p}
                      onClick={() => onUpdate(goal.id, { priority: p })}
                      style={{
                        padding: '4px 12px',
                        borderRadius: '8px',
                        border: `1px solid ${PRIORITY_COLORS[p]}40`,
                        background: goal.priority === p ? `${PRIORITY_COLORS[p]}20` : 'transparent',
                        color: PRIORITY_COLORS[p],
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {PRIORITY_LABELS[p]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function AddGoalModal({ onClose, onAdd }) {
  const [form, setForm] = useState({
    goal_type: 'role',
    title: '',
    domain: '',
    current_level: 'beginner',
    target_level: 'advanced',
    priority: 2,
    reason: '',
  });
  const [loading, setLoading] = useState(false);

  const GOAL_TYPES = [
    { id: 'role', label: 'Career Role', desc: 'e.g. Full Stack Developer' },
    { id: 'technology', label: 'Technology', desc: 'e.g. React, Docker' },
    { id: 'domain', label: 'Domain', desc: 'e.g. Cybersecurity' },
    { id: 'skill', label: 'Skill', desc: 'e.g. System Design' },
  ];

  const POPULAR_GOALS = [
    'Full Stack Developer', 'React', 'Docker', 'Kubernetes',
    'Cybersecurity', 'Data Engineering', 'Machine Learning',
    'DevOps', 'System Design', 'Python', 'SQL', 'AWS',
  ];

  const handleSubmit = async () => {
    if (!form.title) {
      toast.error('Please enter a goal title');
      return;
    }
    setLoading(true);
    try {
      await onAdd(form);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px',
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        style={{
          background: '#fff',
          borderRadius: '20px',
          padding: 'clamp(16px, 4vw, 28px)',
          width: '100%',
          maxWidth: '480px',
          maxHeight: '85vh',
          overflowY: 'auto',
        }}
      >
        <h2 style={{ margin: '0 0 20px', fontFamily: 'Manrope, sans-serif', fontSize: '20px', fontWeight: 800, color: '#1a1a2e' }}>
          + Add Learning Goal
        </h2>

        {/* Goal type */}
        <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Goal Type
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', margin: '8px 0 16px' }}>
          {GOAL_TYPES.map(t => (
            <button
              key={t.id}
              onClick={() => setForm(f => ({ ...f, goal_type: t.id }))}
              style={{
                padding: '10px 12px',
                borderRadius: '10px',
                border: form.goal_type === t.id ? '1.5px solid #f97316' : '1px solid #e2e8f0',
                background: form.goal_type === t.id ? 'rgba(249,115,22,0.08)' : '#f8fafc',
                textAlign: 'left',
                cursor: 'pointer',
              }}
            >
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#1a1a2e' }}>{t.label}</div>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>{t.desc}</div>
            </button>
          ))}
        </div>

        {/* Popular suggestions */}
        <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Quick Add
        </label>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', margin: '8px 0 16px' }}>
          {POPULAR_GOALS.map(g => (
            <button
              key={g}
              onClick={() => setForm(f => ({ ...f, title: g }))}
              style={{
                padding: '4px 10px',
                borderRadius: '20px',
                border: form.title === g ? '1px solid #f97316' : '1px solid #e2e8f0',
                background: form.title === g ? 'rgba(249,115,22,0.1)' : '#f8fafc',
                color: form.title === g ? '#f97316' : '#64748b',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {g}
            </button>
          ))}
        </div>

        {/* Title input */}
        <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Goal Title *
        </label>
        <input
          value={form.title}
          onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
          placeholder="e.g. Full Stack Developer, React, Cybersecurity"
          style={{
            display: 'block',
            width: '100%',
            padding: '10px 14px',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            fontSize: '14px',
            margin: '8px 0 16px',
            boxSizing: 'border-box',
            fontFamily: 'Manrope, sans-serif',
            outline: 'none',
          }}
        />

        {/* Level selectors */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>
              Current Level
            </label>
            <select
              value={form.current_level}
              onChange={e => setForm(f => ({ ...f, current_level: e.target.value }))}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '13px' }}
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>
              Target Level
            </label>
            <select
              value={form.target_level}
              onChange={e => setForm(f => ({ ...f, target_level: e.target.value }))}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '13px' }}
            >
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
        </div>

        {/* Priority */}
        <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '8px' }}>
          Priority
        </label>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          {[1, 2, 3].map(p => (
            <button
              key={p}
              onClick={() => setForm(f => ({ ...f, priority: p }))}
              style={{
                flex: 1,
                padding: '8px',
                borderRadius: '10px',
                border: form.priority === p ? `1.5px solid ${PRIORITY_COLORS[p]}` : '1px solid #e2e8f0',
                background: form.priority === p ? `${PRIORITY_COLORS[p]}15` : '#f8fafc',
                color: form.priority === p ? PRIORITY_COLORS[p] : '#64748b',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {PRIORITY_LABELS[p]}
            </button>
          ))}
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              background: '#f8fafc',
              color: '#64748b',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !form.title}
            style={{
              flex: 2,
              padding: '12px',
              borderRadius: '12px',
              border: 'none',
              background: loading ? '#cbd5e1' : 'linear-gradient(135deg, #f97316, #ea580c)',
              color: '#fff',
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontFamily: 'Manrope, sans-serif',
            }}
          >
            {loading ? 'Adding...' : '+ Add Learning Goal'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function MyLearningPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [goals, setGoals] = useState([]);
  const [primary, setPrimary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedGoal, setExpandedGoal] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    loadGoals();
  }, []);

  const loadGoals = async () => {
    setLoading(true);
    try {
      const res = await learningGoalsAPI.list();
      setGoals(res.data.goals || []);
      setPrimary(res.data.primary || null);
    } catch (err) {
      toast.error('Failed to load learning goals');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (goalId, updates) => {
    try {
      await learningGoalsAPI.update(goalId, updates);
      toast.success('Goal updated');
      loadGoals();
    } catch (err) {
      toast.error('Failed to update goal');
    }
  };

  const handleRemove = async (goalId) => {
    if (!confirm('Remove this learning goal?')) return;
    try {
      await learningGoalsAPI.remove(goalId);
      toast.success('Goal removed');
      loadGoals();
    } catch (err) {
      toast.error('Failed to remove goal');
    }
  };

  const handleAdd = async (form) => {
    try {
      await learningGoalsAPI.create(form);
      toast.success('Learning goal added!');
      loadGoals();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to add goal');
      throw err;
    }
  };

  const additionalGoals = goals.filter(g => !g.is_primary && g.status !== 'removed');

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '24px' }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
            <div style={{ padding: '10px', borderRadius: '12px', background: 'linear-gradient(135deg, #f97316, #ea580c)' }}>
              <Target size={22} color="#fff" />
            </div>
            <h1 style={{
              margin: 0, fontSize: '26px', fontWeight: 800, color: '#1a1a2e',
              fontFamily: 'Manrope, sans-serif',
            }}>My Learning</h1>
          </div>
          <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>
            Your multi-domain learning goals, powered by a shared competency graph
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 20px',
            borderRadius: '12px',
            border: 'none',
            background: 'linear-gradient(135deg, #f97316, #ea580c)',
            color: '#fff',
            fontWeight: 700,
            fontSize: '14px',
            cursor: 'pointer',
            fontFamily: 'Manrope, sans-serif',
          }}
        >
          <Plus size={16} />
          Add Goal
        </button>
      </motion.div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {[...Array(3)].map((_, i) => (
            <div key={i} style={{ height: '120px', borderRadius: '16px', background: '#e2e8f0', animation: 'pulse 1.5s infinite' }} />
          ))}
        </div>
      ) : goals.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            textAlign: 'center',
            padding: '80px 20px',
            background: 'rgba(255,255,255,0.9)',
            borderRadius: '20px',
            border: '2px dashed rgba(249,115,22,0.3)',
          }}
        >
          <Target size={56} color="#f97316" style={{ marginBottom: '16px', opacity: 0.5 }} />
          <h3 style={{ color: '#1a1a2e', fontFamily: 'Manrope, sans-serif', fontSize: '20px', fontWeight: 800 }}>
            No Learning Goals Yet
          </h3>
          <p style={{ color: '#64748b', marginBottom: '24px' }}>
            Add your first learning goal to start your personalized career journey.
            You can have multiple goals — AI Engineer, Full Stack, React, and more simultaneously.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            style={{
              padding: '14px 28px',
              borderRadius: '14px',
              border: 'none',
              background: 'linear-gradient(135deg, #f97316, #ea580c)',
              color: '#fff',
              fontWeight: 700,
              fontSize: '15px',
              cursor: 'pointer',
              fontFamily: 'Manrope, sans-serif',
            }}
          >
            + Add Your First Goal
          </button>
        </motion.div>
      ) : (
        <>
          {/* Primary Goal */}
          {primary && (
            <div style={{ marginBottom: '24px' }}>
              <h2 style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: 700, color: '#f97316', textTransform: 'uppercase', letterSpacing: '1px' }}>
                ⭐ Primary Career Goal
              </h2>
              <GoalCard
                goal={primary}
                onUpdate={handleUpdate}
                onRemove={handleRemove}
                onExpand={id => setExpandedGoal(expandedGoal === id ? null : id)}
                isExpanded={expandedGoal === primary.id}
              />
            </div>
          )}

          {/* Additional Goals */}
          {additionalGoals.length > 0 && (
            <div>
              <h2 style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Additional Learning Goals ({additionalGoals.length})
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <AnimatePresence>
                  {additionalGoals.map(goal => (
                    <GoalCard
                      key={goal.id}
                      goal={goal}
                      onUpdate={handleUpdate}
                      onRemove={handleRemove}
                      onExpand={id => setExpandedGoal(expandedGoal === id ? null : id)}
                      isExpanded={expandedGoal === goal.id}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* Add more button */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ marginTop: '24px', textAlign: 'center' }}
          >
            <button
              onClick={() => setShowAddModal(true)}
              style={{
                padding: '12px 24px',
                borderRadius: '12px',
                border: '2px dashed rgba(249,115,22,0.4)',
                background: 'rgba(249,115,22,0.05)',
                color: '#f97316',
                fontWeight: 600,
                fontSize: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                margin: '0 auto',
              }}
            >
              <Plus size={16} />
              Add Another Learning Goal
            </button>
          </motion.div>

          {/* Explore Roadmaps link */}
          <div style={{ marginTop: '32px', textAlign: 'center' }}>
            <Link
              to="/roadmaps"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                borderRadius: '12px',
                background: 'rgba(249,115,22,0.08)',
                color: '#f97316',
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: '14px',
              }}
            >
              <Map size={16} />
              Browse All Roadmaps <ArrowRight size={14} />
            </Link>
          </div>
        </>
      )}

      {/* Add Goal Modal */}
      <AnimatePresence>
        {showAddModal && (
          <AddGoalModal
            onClose={() => setShowAddModal(false)}
            onAdd={handleAdd}
          />
        )}
      </AnimatePresence>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
