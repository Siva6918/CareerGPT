import { useState, useEffect } from 'react';
import { roadmapAPI, profileAPI } from '../services/api';
import {
  Map, ExternalLink, ChevronDown, ChevronRight, Clock, Zap,
  AlertTriangle, CheckCircle, Sparkles, BookOpen, Layers, Award,
  Compass, ArrowRight, ShieldCheck, HelpCircle, Briefcase, DollarSign,
  FileCode, CheckSquare
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

import {
  cardFadeUp,
  cardSlideLeft,
  cardSlideRight,
  statMotion,
  staggerContainer,
  bidirectionalViewport
} from '../utils/motionVariants';

const STAGE_META = {
  foundation: { label: 'Stage 1: Foundation Principles', color: '#2563eb', bg: '#eff6ff', icon: '🏗️', order: 0 },
  core: { label: 'Stage 2: Core Competencies', color: '#10b981', bg: '#ecfdf5', icon: '⚙️', order: 1 },
  applied: { label: 'Stage 3: Applied Technologies', color: '#ec4899', bg: '#fdf2f8', icon: '🚀', order: 2 },
  advanced: { label: 'Stage 4: Advanced Architecture & System Design', color: '#8b5cf6', bg: '#f5f3ff', icon: '⭐', order: 3 },
  projects: { label: 'Stage 5: Progressive Project Proofs', color: '#eab308', bg: '#fefce8', icon: '💼', order: 4 },
  assessment: { label: 'Stage 6: Placement Assessment & Verification', color: '#ea580c', bg: '#fff7ed', icon: '📋', order: 5 },
};

const GAP_COLORS = {
  critical: { color: '#dc2626', bg: '#fef2f2', label: 'Critical Gap (Unassessed)', border: 'rgba(239, 68, 68, 0.2)' },
  high: { color: '#ea580c', bg: '#fff7ed', label: 'High Priority Gap', border: 'rgba(234, 88, 12, 0.2)' },
  moderate: { color: '#d97706', bg: '#fefce8', label: 'Moderate Delta', border: 'rgba(234, 179, 8, 0.2)' },
  low: { color: '#2563eb', bg: '#eff6ff', label: 'Low Delta', border: 'rgba(37, 99, 235, 0.2)' },
  satisfied: { color: '#059669', bg: '#ecfdf5', label: 'Verified Satisfied', border: 'rgba(16, 185, 129, 0.2)' },
  unknown: { color: '#64748b', bg: '#f1f5f9', label: 'Uncertain / Unknown', border: 'rgba(100, 116, 139, 0.2)' },
};

export default function RoadmapPage() {
  const [roadmap, setRoadmap] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expandedStages, setExpandedStages] = useState(new Set(['foundation', 'core', 'applied', 'projects']));

  // Relational options loaded dynamically from knowledge graph
  const [branches, setBranches] = useState([]);
  const [domains, setDomains] = useState([]);
  const [roles, setRoles] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [technologies, setTechnologies] = useState([]);
  const [sources, setSources] = useState([]);

  const [config, setConfig] = useState({
    branch: '',
    domain: '',
    target_role: '',
    preferred_language: '',
    preferred_technologies: [],
  });

  // 1. Initial Load: Branches, Sources & Current Saved Roadmap
  useEffect(() => {
    roadmapAPI.getBranches().then((res) => {
      const bList = res.data.branches || [];
      setBranches(bList);
    }).catch(() => {});

    roadmapAPI.getSources().then((res) => {
      setSources(res.data.sources || []);
    }).catch(() => {});

    loadInitialRoadmap();
  }, []);

  const loadInitialRoadmap = async () => {
    setLoading(true);
    try {
      // Check if user has active saved roadmap
      const currentRes = await roadmapAPI.getCurrent();
      if (currentRes.data?.has_roadmap && currentRes.data?.stages) {
        const r = currentRes.data;
        setRoadmap(r);
        setConfig({
          branch: r.branch || '',
          domain: r.domain || '',
          target_role: r.target_role || '',
          preferred_language: r.language || '',
          preferred_technologies: r.technologies || [],
        });
        setLoading(false);
        return;
      }

      // If no active roadmap, check profile
      let targetConfig = config;
      try {
        const pRes = await profileAPI.getMe();
        if (pRes.data?.has_profile) {
          const p = pRes.data;
          targetConfig = {
            branch: p.branch || '',
            domain: p.target_domain || '',
            target_role: p.target_role || '',
            preferred_language: p.preferred_languages?.[0] || '',
            preferred_technologies: p.preferred_technologies?.slice(0, 3) || [],
          };
          setConfig(targetConfig);
        }
      } catch (e) {}

      // Generate initial dynamic roadmap
      const genRes = await roadmapAPI.generate(targetConfig);
      setRoadmap(genRes.data);
    } catch (err) {
      console.error('Error loading roadmap:', err);
    } finally {
      setLoading(false);
    }
  };

  // 2. Cascading Effect: When Branch changes -> Fetch Domains valid ONLY for that branch
  useEffect(() => {
    if (!config.branch) return;
    roadmapAPI.getDomains(config.branch).then((res) => {
      const rawDomains = res.data.domains || [];
      const dList = rawDomains.map(d => typeof d === 'object' ? d.name : d);
      setDomains(dList);

      // Reset domain if current selection is invalid for new branch
      if (!dList.includes(config.domain)) {
        const firstDomain = dList[0] || '';
        setConfig(prev => ({
          ...prev,
          domain: firstDomain,
          target_role: '',
          preferred_language: '',
          preferred_technologies: []
        }));
      }
    }).catch(() => {});
  }, [config.branch]);

  // 3. Cascading Effect: When Domain changes -> Fetch Roles valid ONLY for that domain
  useEffect(() => {
    if (!config.domain) return;
    roadmapAPI.getRoles(config.domain).then((res) => {
      const rawRoles = res.data.roles || [];
      const rList = rawRoles.map(r => typeof r === 'object' ? r.title : r);
      setRoles(rList);

      // Reset role if current selection is invalid for new domain
      if (!rList.includes(config.target_role)) {
        const firstRole = rList[0] || '';
        setConfig(prev => ({
          ...prev,
          target_role: firstRole,
          preferred_language: '',
          preferred_technologies: []
        }));
      }
    }).catch(() => {});
  }, [config.domain]);

  // 4. Cascading Effect: When Role changes -> Fetch Ranked Languages & Compatible Technologies
  useEffect(() => {
    if (!config.target_role) return;
    roadmapAPI.getLanguagesForRole(config.target_role).then((res) => {
      const lList = res.data.languages || [];
      setLanguages(lList);

      // Default to first ranked language if current invalid
      const langNames = lList.map(l => typeof l === 'string' ? l : l.name);
      if (!langNames.includes(config.preferred_language)) {
        setConfig(prev => ({
          ...prev,
          preferred_language: langNames[0] || 'Python'
        }));
      }
    }).catch(() => {});
  }, [config.target_role]);

  // 5. Cascading Effect: When Language or Role changes -> Fetch Compatible Frameworks & Tools
  useEffect(() => {
    if (!config.target_role) return;
    roadmapAPI.getTechnologiesForRole(config.target_role, config.preferred_language).then((res) => {
      const tList = res.data.technologies || [];
      const formattedTechs = tList.map(t => typeof t === 'object' ? t.name : t);
      setTechnologies(formattedTechs);

      // Ensure preferred_technologies has valid choices
      const validPrefs = config.preferred_technologies.filter(pt => formattedTechs.includes(pt));
      if (validPrefs.length === 0 && formattedTechs.length > 0) {
        setConfig(prev => ({
          ...prev,
          preferred_technologies: formattedTechs.slice(0, 3)
        }));
      }
    }).catch(() => {});
  }, [config.target_role, config.preferred_language]);

  const handleGenerateRoadmap = async () => {
    setLoading(true);
    try {
      const res = await roadmapAPI.generate(config);
      setRoadmap(res.data);
      setExpandedStages(new Set(['foundation', 'core', 'applied', 'projects', 'assessment']));
      toast.success(`Personalized roadmap generated for ${config.target_role}!`);
    } catch (err) {
      toast.error('Failed to generate roadmap. Please check parameters.');
    } finally {
      setLoading(false);
    }
  };

  const toggleTechnology = (tech) => {
    setConfig(prev => {
      const exists = prev.preferred_technologies.includes(tech);
      const updated = exists
        ? prev.preferred_technologies.filter(t => t !== tech)
        : [...prev.preferred_technologies, tech];
      return { ...prev, preferred_technologies: updated };
    });
  };

  const toggleStage = (stage) => {
    setExpandedStages(prev => {
      const next = new Set(prev);
      next.has(stage) ? next.delete(stage) : next.add(stage);
      return next;
    });
  };

  const sortedStages = roadmap?.stages
    ? Object.entries(roadmap.stages).sort(([a], [b]) =>
        (STAGE_META[a]?.order || 99) - (STAGE_META[b]?.order || 99)
      )
    : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* Top Banner with Connected Career Graph Telemetry */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={bidirectionalViewport}
        variants={cardFadeUp}
        className="card card-noborder"
        style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #fff7ed 100%)',
          borderRadius: 20,
          padding: '30px 36px'
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 24, alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span className="tag-pill tag-orange">
                <Compass size={13} /> Relational Knowledge Graph Engine
              </span>
              <span className="font-croissant-pink" style={{ fontSize: '0.9rem' }}>
                B.Tech Curated Blueprint
              </span>
            </div>
            <h2 style={{ fontSize: '2.1rem', fontFamily: 'var(--font-heading)', color: '#0f172a', marginBottom: 8, fontWeight: 800 }}>
              {roadmap?.target_role || config.target_role || 'Engineering Career'} Roadmap
            </h2>
            <p style={{ fontSize: '0.95rem', color: '#475569', lineHeight: 1.6, marginBottom: 16 }}>
              Connected path generated dynamically from branch prerequisites, target role competency graph,
              and candidate evidence telemetry.
            </p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <button onClick={handleGenerateRoadmap} className="btn btn-primary btn-sm" disabled={loading}>
                <Zap size={14} /> {loading ? 'Computing Dynamic Graph...' : 'Regenerate Personalized Route'}
              </button>
              <Link to="/interview" className="btn btn-secondary btn-sm">
                Validate Gaps via Interview <ArrowRight size={14} />
              </Link>
            </div>
          </div>

          {/* Role Spec & Authoritative Source Attribution */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #fed7aa',
            borderRadius: 16,
            padding: '20px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            boxShadow: '0 4px 12px rgba(234, 88, 12, 0.08)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-tech)', fontWeight: 800, color: '#c2410c' }}>
                OCCUPATIONAL FRAMEWORK SPECIFICATION
              </span>
              <span className="tag-pill tag-green" style={{ fontSize: '0.75rem' }}>
                {roadmap?.job_family || 'Engineering'}
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 12px' }}>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Benchmark Compensation</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                  {roadmap?.salary_range || '₹6 - 22 LPA'}
                </div>
              </div>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 12px' }}>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Curriculum Stages</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#ea580c' }}>
                  {sortedStages.length || 6} Connected Stages
                </div>
              </div>
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: 6 }}>
              <BookOpen size={14} color="#ea580c" />
              <span>Source: <strong>{roadmap?.roadmap_source || 'roadmap.sh / O*NET / NIST NICE / Arm'}</strong></span>
            </div>
          </div>
        </div>
      </motion.section>

      {/* ── DYNAMIC DEPENDENT SELECTION MATRIX ── */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={bidirectionalViewport}
        variants={cardFadeUp}
        className="card"
        style={{ background: '#ffffff', borderRadius: 20, padding: '24px 28px' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h4 style={{ fontSize: '1.05rem', fontFamily: 'var(--font-heading)', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 }}>
            <Zap size={18} color="#ea580c" />
            DYNAMIC CAREER HIERARCHY SELECTOR (CASCADING FILTER)
          </h4>
          <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
            Branch → Domain → Role → Language → Specialization
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
          
          {/* 1. Branch Selector */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontFamily: 'var(--font-tech)', fontWeight: 800, color: '#475569', marginBottom: 6 }}>
              STEP 1 • B.TECH BRANCH
            </label>
            <select
              className="form-select"
              value={config.branch}
              onChange={(e) => setConfig(p => ({ ...p, branch: e.target.value }))}
              style={{ width: '100%', padding: '10px 12px', fontSize: '0.9rem', borderRadius: 10 }}
            >
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.icon} {b.name} ({b.id})</option>
              ))}
            </select>
          </div>

          {/* 2. Domain Selector (Filtered strictly by Branch) */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontFamily: 'var(--font-tech)', fontWeight: 800, color: '#475569', marginBottom: 6 }}>
              STEP 2 • CAREER DOMAIN ({config.branch})
            </label>
            <select
              className="form-select"
              value={config.domain}
              onChange={(e) => setConfig(p => ({ ...p, domain: e.target.value }))}
              style={{ width: '100%', padding: '10px 12px', fontSize: '0.9rem', borderRadius: 10 }}
            >
              {domains.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* 3. Target Role Selector (Filtered strictly by Domain) */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontFamily: 'var(--font-tech)', fontWeight: 800, color: '#475569', marginBottom: 6 }}>
              STEP 3 • TARGET ROLE ({config.domain})
            </label>
            <select
              className="form-select"
              value={config.target_role}
              onChange={(e) => setConfig(p => ({ ...p, target_role: e.target.value }))}
              style={{ width: '100%', padding: '10px 12px', fontSize: '0.9rem', borderRadius: 10 }}
            >
              {roles.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {/* 4. Ranked Language Selector (Role-Specific) */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontFamily: 'var(--font-tech)', fontWeight: 800, color: '#475569', marginBottom: 6 }}>
              STEP 4 • PRIMARY LANGUAGE (RANKED)
            </label>
            <select
              className="form-select"
              value={config.preferred_language}
              onChange={(e) => setConfig(p => ({ ...p, preferred_language: e.target.value }))}
              style={{ width: '100%', padding: '10px 12px', fontSize: '0.9rem', borderRadius: 10 }}
            >
              {languages.map(l => {
                const name = typeof l === 'string' ? l : l.name;
                const rel = l.relevance ? `[${l.relevance}]` : '';
                return <option key={name} value={name}>{name} {rel}</option>;
              })}
            </select>
          </div>

        </div>

        {/* 5. Compatible Technologies Pills */}
        {technologies.length > 0 && (
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #f1f5f9' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <label style={{ fontSize: '0.75rem', fontFamily: 'var(--font-tech)', fontWeight: 800, color: '#475569' }}>
                STEP 5 • ROLE COMPATIBLE FRAMEWORKS & TOOLS ({config.target_role} • {config.preferred_language})
              </label>
              <span style={{ fontSize: '0.72rem', color: '#ea580c' }}>
                Click to toggle active roadmap focus
              </span>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {technologies.map(tech => {
                const isSelected = config.preferred_technologies.includes(tech);
                return (
                  <button
                    key={tech}
                    type="button"
                    onClick={() => toggleTechnology(tech)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 20,
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      fontWeight: isSelected ? 700 : 500,
                      transition: 'all 0.2s',
                      background: isSelected ? '#ea580c' : '#f8fafc',
                      border: `1px solid ${isSelected ? '#ea580c' : '#cbd5e1'}`,
                      color: isSelected ? '#ffffff' : '#334155',
                      boxShadow: isSelected ? '0 2px 8px rgba(234, 88, 12, 0.2)' : 'none'
                    }}
                  >
                    {isSelected ? '✓ ' : '+ '} {tech}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </motion.section>

      {/* ── PROGRESSIVE 4-TIER PROJECT LADDER ── */}
      {roadmap?.projects_ladder && roadmap.projects_ladder.length > 0 && (
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={bidirectionalViewport}
          variants={cardFadeUp}
          className="card"
          style={{ background: '#ffffff', borderRadius: 20, padding: '24px 28px' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, borderBottom: '1px solid #f1f5f9', paddingBottom: 12 }}>
            <div>
              <span className="tag-pill tag-yellow" style={{ marginBottom: 4 }}>Portfolio Milestone Proofs</span>
              <h3 style={{ fontSize: '1.25rem', margin: 0, fontFamily: 'var(--font-heading)', color: '#0f172a', fontWeight: 800 }}>
                Progressive 4-Tier Project Ladder for {roadmap.target_role}
              </h3>
            </div>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
              Guided → Integrated → Advanced → Capstone
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 16 }}>
            {roadmap.projects_ladder.map((proj, pIdx) => {
              const tierBadges = {
                Guided: { color: '#059669', bg: '#ecfdf5', label: 'Tier 1 • Guided Project' },
                Integrated: { color: '#2563eb', bg: '#eff6ff', label: 'Tier 2 • Integrated App' },
                Advanced: { color: '#7c3aed', bg: '#f5f3ff', label: 'Tier 3 • Production Scale' },
                Capstone: { color: '#ea580c', bg: '#fff7ed', label: 'Tier 4 • Capstone Portfolio' },
              };
              const meta = tierBadges[proj.tier] || tierBadges.Guided;

              return (
                <div
                  key={pIdx}
                  style={{
                    padding: '18px 20px',
                    borderRadius: 14,
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: 12
                  }}
                >
                  <div>
                    <span style={{
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      padding: '3px 8px',
                      borderRadius: 12,
                      background: meta.bg,
                      color: meta.color,
                      display: 'inline-block',
                      marginBottom: 8
                    }}>
                      {meta.label}
                    </span>
                    <h5 style={{ margin: '0 0 6px', fontSize: '0.95rem', color: '#0f172a', fontWeight: 700 }}>
                      {proj.title}
                    </h5>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Clock size={12} color="#ea580c" />
                      <span>{proj.hours || 30} Hours Required Effort</span>
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 8 }}>
                    <div style={{ fontSize: '0.7rem', color: '#475569', fontWeight: 700, marginBottom: 4 }}>
                      Target Competencies Applied:
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {(proj.skills || []).map((sk, skIdx) => (
                        <span key={skIdx} style={{ fontSize: '0.68rem', background: '#e2e8f0', padding: '2px 6px', borderRadius: 4, color: '#334155' }}>
                          {sk}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.section>
      )}

      {/* Summary KPI Badges */}
      {roadmap?.summary && (
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={bidirectionalViewport}
          variants={staggerContainer}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}
        >
          <motion.div variants={statMotion} className="card" style={{ borderLeft: '4px solid var(--color-blue)' }}>
            <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-tech)', fontWeight: 700, color: 'var(--text-subtle)' }}>TOTAL CURRICULUM OBJECTIVES</div>
            <div className="font-tech-black" style={{ fontSize: '1.8rem', margin: '4px 0' }}>{roadmap.summary.total_skills ?? sortedStages.reduce((a, [_, s]) => a + s.length, 0)}</div>
            <div className="font-oswald-blue" style={{ fontSize: '0.8rem' }}>Connected Competencies</div>
          </motion.div>

          <motion.div variants={statMotion} className="card" style={{ borderLeft: '4px solid var(--color-red)' }}>
            <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-tech)', fontWeight: 700, color: 'var(--text-subtle)' }}>SKILL GAPS DETECTED</div>
            <div className="font-tech-black" style={{ fontSize: '1.8rem', margin: '4px 0' }}>{roadmap.summary.skills_to_learn ?? 0}</div>
            <div className="font-mono-red" style={{ fontSize: '0.8rem' }}>Prioritized for Study</div>
          </motion.div>

          <motion.div variants={statMotion} className="card" style={{ borderLeft: '4px solid var(--color-green)' }}>
            <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-tech)', fontWeight: 700, color: 'var(--text-subtle)' }}>VERIFIED MILESTONES</div>
            <div className="font-tech-black" style={{ fontSize: '1.8rem', margin: '4px 0' }}>{roadmap.summary.skills_known ?? 0}</div>
            <div className="font-tech-green" style={{ fontSize: '0.8rem' }}>Demonstrated Evidence</div>
          </motion.div>

          <motion.div variants={statMotion} className="card" style={{ borderLeft: '4px solid var(--color-yellow)' }}>
            <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-tech)', fontWeight: 700, color: 'var(--text-subtle)' }}>ESTIMATED DURATION</div>
            <div className="font-tech-black" style={{ fontSize: '1.8rem', margin: '4px 0' }}>{Math.max(1, Math.ceil((roadmap.summary.estimated_hours || 40) / 10))} Wks</div>
            <div className="font-handwriting-yellow" style={{ fontSize: '1.05rem' }}>{roadmap.summary.estimated_hours || 40} Total Hours</div>
          </motion.div>
        </motion.section>
      )}

      {/* ── 6 STAGES ACCORDION CURRICULUM WITH EXPLAINABLE RECOMMENDATIONS ── */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={bidirectionalViewport}
        variants={cardFadeUp}
        style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
      >
        {sortedStages.map(([stageKey, skills]) => {
          const meta = STAGE_META[stageKey] || { label: stageKey, color: '#0f172a', bg: '#f8fafc', icon: '📌' };
          const isExpanded = expandedStages.has(stageKey);

          return (
            <div key={stageKey} className="card" style={{ padding: 0, overflow: 'hidden' }}>
              
              {/* Accordion Stage Header */}
              <div
                onClick={() => toggleStage(stageKey)}
                style={{
                  padding: '18px 24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  background: isExpanded ? meta.bg : '#ffffff',
                  borderBottom: isExpanded ? 'var(--border-ultra-thin)' : 'none',
                  transition: 'background 0.2s'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: '1.4rem' }}>{meta.icon}</span>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-primary)', fontFamily: 'var(--font-heading)', fontWeight: 800 }}>
                      {meta.label}
                    </h3>
                    <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-tech)', color: 'var(--text-muted)' }}>
                      {skills.length} Technical Milestones / Prerequisites
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="tag-pill tag-black" style={{ fontSize: '0.7rem' }}>
                    {stageKey.toUpperCase()}
                  </span>
                  {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                </div>
              </div>

              {/* Accordion Stage Body */}
              {isExpanded && (
                <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {skills.map((item, idx) => {
                    const gap = GAP_COLORS[item.gap_severity] || GAP_COLORS.unknown;

                    return (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 10,
                          padding: '16px 20px',
                          background: item.gap_severity === 'satisfied' ? '#f0fdf4' : 'var(--bg-surface-subtle)',
                          borderRadius: 12,
                          border: `1px solid ${item.gap_severity === 'satisfied' ? '#bbf7d0' : '#e2e8f0'}`
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <h4 style={{ margin: 0, fontSize: '1.05rem', color: '#0f172a', fontFamily: 'var(--font-tech)', fontWeight: 800 }}>
                              {item.skill_name || item.name}
                            </h4>
                            <span style={{
                              padding: '2px 8px', borderRadius: 4, fontSize: '0.7rem',
                              fontFamily: 'var(--font-tech)', fontWeight: 700,
                              background: gap.bg, color: gap.color, border: `1px solid ${gap.border}`
                            }}>
                              {gap.label}
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: '0.75rem', color: '#64748b' }}>
                            <span>Certainty: {Math.round((1 - (item.uncertainty ?? 1)) * 100)}%</span>
                            <span>•</span>
                            <span>Est: {item.estimated_effort_hours || 20} hrs</span>
                          </div>
                        </div>

                        {/* Explainable Recommendation Reason Callout */}
                        {item.recommendation_reason && (
                          <div style={{
                            background: '#ffffff',
                            padding: '10px 14px',
                            borderRadius: 8,
                            borderLeft: '3px solid #ea580c',
                            fontSize: '0.82rem',
                            color: '#334155',
                            lineHeight: 1.5
                          }}>
                            <strong>Recommendation Rationale:</strong> {item.recommendation_reason}
                          </div>
                        )}

                        {/* Prerequisites & Applied Tools */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, fontSize: '0.75rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            {item.prerequisites && item.prerequisites.length > 0 && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <span style={{ color: '#64748b', fontWeight: 600 }}>Prerequisites:</span>
                                {item.prerequisites.map((pr, pIdx) => (
                                  <span key={pIdx} style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: 4, color: '#475569' }}>
                                    {pr}
                                  </span>
                                ))}
                              </div>
                            )}

                            {item.tools && item.tools.length > 0 && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 8 }}>
                                <span style={{ color: '#64748b', fontWeight: 600 }}>Tools:</span>
                                {item.tools.map((tl, tIdx) => (
                                  <span key={tIdx} style={{ background: '#e0f2fe', color: '#0369a1', padding: '2px 6px', borderRadius: 4 }}>
                                    {tl}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Curated Official Resources */}
                          {item.resources && item.resources.length > 0 && (
                            <div style={{ display: 'flex', gap: 8 }}>
                              {item.resources.map((res, rIdx) => (
                                <a
                                  key={rIdx}
                                  href={res.url || '#'}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 4,
                                    fontSize: '0.75rem', fontFamily: 'var(--font-tech)',
                                    color: '#ea580c', textDecoration: 'none', fontWeight: 600
                                  }}
                                >
                                  <BookOpen size={12} /> {res.title || 'Official Pathway'} <ExternalLink size={11} />
                                </a>
                              ))}
                            </div>
                          )}
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          );
        })}
      </motion.section>

      {/* Authoritative Standards Verification Footer */}
      {sources.length > 0 && (
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={bidirectionalViewport}
          variants={cardFadeUp}
          className="card"
          style={{ background: '#f8fafc', borderRadius: 16, padding: '20px 24px', border: '1px solid #e2e8f0' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <ShieldCheck size={18} color="#16a34a" />
            <h4 style={{ margin: 0, fontSize: '0.95rem', color: '#0f172a', fontWeight: 700 }}>
              VERIFIED AGAINST AUTHORITATIVE INDUSTRY & GOVERNMENT SOURCES
            </h4>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {sources.map((src, sIdx) => (
              <a
                key={sIdx}
                href={src.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '4px 10px',
                  borderRadius: 6,
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  color: '#334155',
                  fontSize: '0.75rem',
                  textDecoration: 'none'
                }}
              >
                <span>{src.name}</span>
                <span style={{ color: '#94a3b8', fontSize: '0.68rem' }}>({src.type})</span>
                <ExternalLink size={10} color="#ea580c" />
              </a>
            ))}
          </div>
        </motion.section>
      )}

    </div>
  );
}
