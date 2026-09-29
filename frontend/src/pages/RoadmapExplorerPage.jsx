// CareerGPT — Roadmap Explorer Page
// Discover all roadmap.sh roadmaps with search, filter, and progress
import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { roadmapSourcesAPI, learningGoalsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import {
  Search, Filter, ExternalLink, BookOpen, Target, CheckCircle,
  Clock, Plus, Map, Layers, Code2, Cpu, Globe, Shield, Smartphone,
  Database, Cloud, Briefcase, ChevronRight, Star, ArrowRight,
  Play, RefreshCw, Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CATEGORY_FILTERS = [
  { id: 'all', label: 'All Roadmaps', icon: <Globe size={14} /> },
  { id: 'role-based', label: 'Role-Based', icon: <Briefcase size={14} /> },
  { id: 'technology', label: 'Technology', icon: <Code2 size={14} /> },
  { id: 'skill-based', label: 'Skill-Based', icon: <Layers size={14} /> },
];

const TAG_FILTERS = [
  { id: 'ai', label: 'AI / ML', color: '#f97316' },
  { id: 'web', label: 'Web', color: '#3b82f6' },
  { id: 'devops', label: 'DevOps', color: '#8b5cf6' },
  { id: 'mobile', label: 'Mobile', color: '#10b981' },
  { id: 'security', label: 'Security', color: '#ef4444' },
  { id: 'data', label: 'Data', color: '#f59e0b' },
  { id: 'cloud', label: 'Cloud', color: '#06b6d4' },
  { id: 'database', label: 'Database', color: '#84cc16' },
  { id: 'frontend', label: 'Frontend', color: '#ec4899' },
  { id: 'backend', label: 'Backend', color: '#64748b' },
  { id: 'language', label: 'Language', color: '#a78bfa' },
  { id: 'systems', label: 'Systems', color: '#fb923c' },
  { id: 'fundamentals', label: 'Fundamentals', color: '#34d399' },
];

const CATEGORY_COLORS = {
  'role-based': { bg: 'rgba(249,115,22,0.15)', border: 'rgba(249,115,22,0.4)', text: '#f97316' },
  'technology': { bg: 'rgba(59,130,246,0.15)', border: 'rgba(59,130,246,0.4)', text: '#3b82f6' },
  'skill-based': { bg: 'rgba(139,92,246,0.15)', border: 'rgba(139,92,246,0.4)', text: '#8b5cf6' },
};

function RoadmapCard({ roadmap, userGoals, onAddGoal }) {
  const catStyle = CATEGORY_COLORS[roadmap.category] || CATEGORY_COLORS['skill-based'];
  const progress = roadmap.user_progress;
  const hasProgress = progress && progress.progress_pct > 0;
  const isInGoals = userGoals.some(g => (g.roadmap_slugs || []).includes(roadmap.slug));

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ duration: 0.2 }}
      style={{
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(12px)',
        borderRadius: '16px',
        border: '1px solid rgba(249,115,22,0.15)',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        cursor: 'pointer',
        boxShadow: '0 4px 20px rgba(249,115,22,0.08)',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <h3 style={{
            margin: 0,
            fontSize: '15px',
            fontWeight: 700,
            color: '#1a1a2e',
            fontFamily: 'Manrope, sans-serif',
            lineHeight: 1.3,
          }}>{roadmap.title}</h3>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            marginTop: '6px',
            padding: '2px 8px',
            borderRadius: '20px',
            background: catStyle.bg,
            border: `1px solid ${catStyle.border}`,
            color: catStyle.text,
            fontSize: '10px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}>
            {roadmap.category}
          </span>
        </div>
        {isInGoals && (
          <span style={{
            padding: '3px 8px',
            borderRadius: '12px',
            background: 'rgba(16,185,129,0.15)',
            color: '#10b981',
            fontSize: '10px',
            fontWeight: 700,
            flexShrink: 0,
          }}>✓ In Goals</span>
        )}
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#64748b', fontSize: '12px' }}>
          <BookOpen size={12} />
          {roadmap.topic_count} topics
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#64748b', fontSize: '12px' }}>
          <Globe size={12} />
          {roadmap.provider}
        </span>
      </div>

      {/* Progress bar (if user has started) */}
      {hasProgress && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', color: '#64748b' }}>
              {progress.completed} / {progress.total_tracked} topics done
            </span>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#f97316' }}>
              {progress.progress_pct}%
            </span>
          </div>
          <div style={{ height: '4px', background: 'rgba(249,115,22,0.15)', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${progress.progress_pct}%`,
              background: 'linear-gradient(90deg, #f97316, #ea580c)',
              borderRadius: '4px',
            }} />
          </div>
        </div>
      )}

      {/* Tags */}
      {roadmap.tags && roadmap.tags.length > 0 && (
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {roadmap.tags.slice(0, 4).map(tag => {
            const tagInfo = TAG_FILTERS.find(t => t.id === tag);
            return (
              <span key={tag} style={{
                padding: '2px 6px',
                borderRadius: '8px',
                background: tagInfo ? `${tagInfo.color}22` : 'rgba(100,116,139,0.1)',
                color: tagInfo ? tagInfo.color : '#64748b',
                fontSize: '10px',
                fontWeight: 600,
              }}>{tag}</span>
            );
          })}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
        <a
          href={roadmap.external_url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '8px 12px',
            borderRadius: '10px',
            background: 'rgba(249,115,22,0.1)',
            color: '#f97316',
            fontSize: '12px',
            fontWeight: 600,
            textDecoration: 'none',
            border: '1px solid rgba(249,115,22,0.2)',
            transition: 'all 0.2s',
          }}
        >
          <ExternalLink size={12} />
          Official ↗
        </a>
        {!isInGoals ? (
          <button
            onClick={() => onAddGoal(roadmap)}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '8px 12px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #f97316, #ea580c)',
              color: '#fff',
              fontSize: '12px',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <Plus size={12} />
            Add Goal
          </button>
        ) : (
          <span style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '8px 12px',
            borderRadius: '10px',
            background: 'rgba(16,185,129,0.1)',
            color: '#10b981',
            fontSize: '12px',
            fontWeight: 600,
            border: '1px solid rgba(16,185,129,0.2)',
          }}>
            <CheckCircle size={12} />
            Added
          </span>
        )}
      </div>
    </motion.div>
  );
}

export default function RoadmapExplorerPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [roadmaps, setRoadmaps] = useState([]);
  const [userGoals, setUserGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [activeTag, setActiveTag] = useState(null);
  const [categoryCounts, setCategoryCounts] = useState({});
  const [totalCount, setTotalCount] = useState(0);
  const [addingGoal, setAddingGoal] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (categoryFilter !== 'all') params.category = categoryFilter;
      if (search) params.search = search;
      if (activeTag) params.tags = activeTag;

      const [roadmapsRes, goalsRes] = await Promise.allSettled([
        roadmapSourcesAPI.list(params),
        user ? learningGoalsAPI.list() : Promise.resolve(null),
      ]);

      if (roadmapsRes.status === 'fulfilled') {
        setRoadmaps(roadmapsRes.value.data.roadmaps || []);
        setTotalCount(roadmapsRes.value.data.total || 0);
        setCategoryCounts(roadmapsRes.value.data.categories || {});
      }
      if (goalsRes.status === 'fulfilled' && goalsRes.value) {
        setUserGoals(goalsRes.value.data.goals || []);
      }
    } catch (err) {
      console.error('Failed to load roadmaps:', err);
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, search, activeTag, user]);

  useEffect(() => {
    const delay = setTimeout(() => loadData(), search ? 400 : 0);
    return () => clearTimeout(delay);
  }, [loadData]);

  const handleAddGoal = async (roadmap) => {
    if (!user) {
      navigate('/login');
      return;
    }
    setAddingGoal(roadmap.slug);
    try {
      const goalType = roadmap.category === 'role-based' ? 'role' : 'technology';
      await learningGoalsAPI.create({
        goal_type: goalType,
        title: roadmap.title,
        roadmap_slugs: [roadmap.slug],
        current_level: 'beginner',
        target_level: 'advanced',
        priority: 2,
      });
      toast.success(`"${roadmap.title}" added to your learning goals!`);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to add goal');
    } finally {
      setAddingGoal(null);
    }
  };

  const filteredRoadmaps = roadmaps.filter(r => {
    if (!activeTag) return true;
    return (r.tags || []).includes(activeTag);
  });

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '24px' }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ marginBottom: '32px' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <div style={{
            padding: '10px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #f97316, #ea580c)',
          }}>
            <Map size={22} color="#fff" />
          </div>
          <div>
            <h1 style={{
              margin: 0,
              fontSize: '26px',
              fontWeight: 800,
              color: '#1a1a2e',
              fontFamily: 'Manrope, sans-serif',
            }}>Explore Roadmaps</h1>
            <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>
              {totalCount} roadmaps from roadmap.sh — browse, filter, and add to your learning goals
            </p>
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginTop: '16px' }}>
          {[
            { label: 'Role-Based', count: categoryCounts['role-based'] || 0, color: '#f97316' },
            { label: 'Technology', count: categoryCounts['technology'] || 0, color: '#3b82f6' },
            { label: 'Skill-Based', count: categoryCounts['skill-based'] || 0, color: '#8b5cf6' },
          ].map(stat => (
            <div key={stat.label} style={{
              padding: '8px 16px',
              borderRadius: '10px',
              background: `${stat.color}15`,
              border: `1px solid ${stat.color}30`,
            }}>
              <span style={{ color: stat.color, fontWeight: 700, fontSize: '16px' }}>{stat.count}</span>
              <span style={{ color: '#64748b', fontSize: '12px', marginLeft: '6px' }}>{stat.label}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Search + Filters */}
      <div style={{
        background: 'rgba(255,255,255,0.95)',
        borderRadius: '16px',
        border: '1px solid rgba(249,115,22,0.15)',
        padding: '20px',
        marginBottom: '24px',
        boxShadow: '0 4px 20px rgba(249,115,22,0.06)',
      }}>
        {/* Search bar */}
        <div style={{ position: 'relative', marginBottom: '16px' }}>
          <Search size={18} style={{
            position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)',
            color: '#94a3b8',
          }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search roadmaps... (AI, Java, Docker, React...)"
            style={{
              width: '100%',
              padding: '12px 16px 12px 44px',
              borderRadius: '12px',
              border: '1px solid rgba(249,115,22,0.2)',
              background: '#f8fafc',
              fontSize: '14px',
              color: '#1a1a2e',
              outline: 'none',
              boxSizing: 'border-box',
              fontFamily: 'Manrope, sans-serif',
            }}
          />
        </div>

        {/* Category filters */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
          {CATEGORY_FILTERS.map(cat => (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                borderRadius: '20px',
                border: categoryFilter === cat.id
                  ? '1px solid #f97316'
                  : '1px solid rgba(100,116,139,0.2)',
                background: categoryFilter === cat.id
                  ? 'linear-gradient(135deg, #f97316, #ea580c)'
                  : 'rgba(255,255,255,0.8)',
                color: categoryFilter === cat.id ? '#fff' : '#64748b',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {cat.icon}
              {cat.label}
            </button>
          ))}
        </div>

        {/* Tag filters */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {TAG_FILTERS.map(tag => (
            <button
              key={tag.id}
              onClick={() => setActiveTag(activeTag === tag.id ? null : tag.id)}
              style={{
                padding: '4px 10px',
                borderRadius: '12px',
                border: `1px solid ${activeTag === tag.id ? tag.color : `${tag.color}40`}`,
                background: activeTag === tag.id ? `${tag.color}20` : 'transparent',
                color: activeTag === tag.id ? tag.color : '#64748b',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {tag.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results count */}
      <div style={{ marginBottom: '16px', color: '#64748b', fontSize: '13px' }}>
        {loading ? 'Loading...' : `${filteredRoadmaps.length} roadmaps`}
        {search && ` matching "${search}"`}
        {activeTag && ` tagged "${activeTag}"`}
      </div>

      {/* Roadmap Grid */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
          {[...Array(12)].map((_, i) => (
            <div key={i} style={{
              height: '180px',
              borderRadius: '16px',
              background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)',
              animation: 'shimmer 1.5s infinite',
            }} />
          ))}
        </div>
      ) : filteredRoadmaps.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            textAlign: 'center',
            padding: '60px 20px',
            background: 'rgba(255,255,255,0.8)',
            borderRadius: '16px',
          }}
        >
          <Map size={48} color="#cbd5e1" style={{ marginBottom: '16px' }} />
          <h3 style={{ color: '#64748b', fontFamily: 'Manrope, sans-serif' }}>
            {totalCount === 0 ? 'No roadmaps imported yet' : 'No roadmaps match your search'}
          </h3>
          {totalCount === 0 && (
            <p style={{ color: '#94a3b8', fontSize: '14px' }}>
              Run the roadmap importer to load all roadmap.sh content.
            </p>
          )}
        </motion.div>
      ) : (
        <motion.div
          layout
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}
        >
          <AnimatePresence>
            {filteredRoadmaps.map(roadmap => (
              <RoadmapCard
                key={roadmap.slug}
                roadmap={roadmap}
                userGoals={userGoals}
                onAddGoal={handleAddGoal}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  );
}
