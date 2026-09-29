import { useState, useEffect } from 'react';
import { Brain, HelpCircle, TrendingUp, BarChart3, Info, Film, Eye, Sparkles, Shield, ArrowRight, Upload } from 'lucide-react';
import { competencyAPI } from '../services/api';
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

const STATE_META = {
  strong: { label: 'Strong', color: '#10b981', bg: '#ecfdf5', icon: '⭐', textClass: 'font-tech-green' },
  demonstrated: { label: 'Demonstrated', color: '#2563eb', bg: '#eff6ff', icon: '✅', textClass: 'font-oswald-blue' },
  developing: { label: 'Developing', color: '#d97706', bg: '#fefce8', icon: '📈', textClass: 'font-handwriting-yellow' },
  emerging: { label: 'Emerging', color: '#ec4899', bg: '#fdf2f8', icon: '🌱', textClass: 'font-croissant-pink' },
  unknown: { label: 'Unknown', color: '#64748b', bg: '#f1f5f9', icon: '❓', textClass: 'font-mono' },
};

export default function CompetencyPage() {
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedNode, setSelectedNode] = useState(null);

  useEffect(() => {
    loadGraph();
  }, []);

  const loadGraph = async () => {
    setLoading(true);
    try {
      const res = await competencyAPI.getGraph();
      if (res.data?.nodes && res.data.nodes.length > 0) {
        setNodes(res.data.nodes);
      } else {
        setNodes([]);
      }
    } catch (err) {
      console.log('Error fetching competency graph:', err);
      setNodes([]);
    } finally {
      setLoading(false);
    }
  };

  const stateCounts = nodes.reduce((acc, n) => {
    acc[n.competency_state] = (acc[n.competency_state] || 0) + 1;
    return acc;
  }, {});

  const filteredNodes = filter === 'all' ? nodes : nodes.filter(n => n.competency_state === filter);

  const avgCertainty = nodes.length
    ? Math.round(nodes.reduce((a, n) => a + (1 - (n.uncertainty !== null && n.uncertainty !== undefined ? n.uncertainty : 1)), 0) / nodes.length * 100)
    : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      
      {/* Visual Reference & Media Showcase Banner */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={bidirectionalViewport}
        variants={cardFadeUp}
        className="card card-noborder"
        style={{ background: '#ffffff', borderRadius: 20 }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 24, alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span className="tag-pill tag-pink">
                <Sparkles size={13} /> Graph Simulation Engine
              </span>
              <span className="font-croissant-pink" style={{ fontSize: '0.9rem' }}>
                Bayesian Certainty Telemetry
              </span>
            </div>
            <h2 style={{ fontSize: '1.8rem', fontFamily: 'var(--font-heading)', color: 'var(--text-primary)', marginBottom: 10 }}>
              Evidence-Based Competency Graph
            </h2>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 16 }}>
              Every skill in CareerGPT maintains an evidence score, Bayesian uncertainty distribution, and prerequisite edges. Skills without evidence are explicitly preserved as <strong>Unknown / Insufficient Evidence</strong> rather than guessed as 0%.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Link to="/interview" className="btn btn-primary btn-sm">
                Take Adaptive Interview <ArrowRight size={14} />
              </Link>
              <Link to="/roadmap" className="btn btn-secondary btn-sm">
                View Roadmap
              </Link>
            </div>
          </div>

          {/* Real-time Candidate Competency Telemetry Card */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 16,
            padding: '20px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.8rem', fontFamily: 'var(--font-tech)', fontWeight: 700, color: '#475569' }}>
                BAYESIAN CERTAINTY LEVEL
              </span>
              <span className="font-tech-black" style={{ fontSize: '1.2rem', color: 'var(--color-primary)' }}>
                {avgCertainty}%
              </span>
            </div>
            <div style={{ width: '100%', height: 8, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{
                width: `${avgCertainty}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #f97316, #ea580c)',
                borderRadius: 99,
                transition: 'width 0.5s ease'
              }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginTop: 4 }}>
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 12px' }}>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Demonstrated / Strong</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#10b981' }}>
                  {(stateCounts['demonstrated'] || 0) + (stateCounts['strong'] || 0)}
                </div>
              </div>
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 12px' }}>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Needs Evidence</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f59e0b' }}>
                  {(stateCounts['emerging'] || 0) + (stateCounts['developing'] || 0) + (stateCounts['unknown'] || 0)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Summary KPI Cards with Vibrant Fonts */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={bidirectionalViewport}
        variants={staggerContainer}
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 18 }}
      >
        <motion.div variants={statMotion} className="card" style={{ borderLeft: '4px solid var(--color-blue)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', fontFamily: 'var(--font-tech)', fontWeight: 700 }}>
            TRACKED SKILLS
          </div>
          <div className="font-tech-black" style={{ fontSize: '2rem', margin: '4px 0' }}>
            {nodes.length}
          </div>
          <div className="font-oswald-blue" style={{ fontSize: '0.85rem' }}>
            Active Competency Nodes
          </div>
        </motion.div>

        <motion.div variants={statMotion} className="card" style={{ borderLeft: '4px solid var(--color-pink)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', fontFamily: 'var(--font-tech)', fontWeight: 700 }}>
            AVERAGE CERTAINTY
          </div>
          <div className="font-tech-black" style={{ fontSize: '2rem', margin: '4px 0' }}>
            {avgCertainty}%
          </div>
          <div className="font-croissant-pink" style={{ fontSize: '0.85rem' }}>
            Calculated Confidence
          </div>
        </motion.div>

        <motion.div variants={statMotion} className="card" style={{ borderLeft: '4px solid var(--color-green)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', fontFamily: 'var(--font-tech)', fontWeight: 700 }}>
            DEMONSTRATED+
          </div>
          <div className="font-tech-black" style={{ fontSize: '2rem', margin: '4px 0' }}>
            {(stateCounts.demonstrated || 0) + (stateCounts.strong || 0)}
          </div>
          <div className="font-tech-green" style={{ fontSize: '0.85rem' }}>
            Validated by Evidence
          </div>
        </motion.div>

        <motion.div variants={statMotion} className="card" style={{ borderLeft: '4px solid var(--color-yellow)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', fontFamily: 'var(--font-tech)', fontWeight: 700 }}>
            NEEDS ASSESSMENT
          </div>
          <div className="font-tech-black" style={{ fontSize: '2rem', margin: '4px 0' }}>
            {stateCounts.unknown || 0}
          </div>
          <div className="font-handwriting-yellow" style={{ fontSize: '1.1rem' }}>
            High Information Gain
          </div>
        </motion.div>
      </motion.section>

      {/* Filter Tabs with Light Border */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <button
          onClick={() => setFilter('all')}
          className={`btn btn-sm ${filter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
        >
          All Skills ({nodes.length})
        </button>

        {Object.entries(STATE_META).map(([state, meta]) => (
          <button
            key={state}
            onClick={() => setFilter(state)}
            className="btn btn-sm btn-secondary"
            style={{
              background: filter === state ? meta.bg : '#ffffff',
              color: filter === state ? meta.color : 'var(--text-secondary)',
              borderColor: filter === state ? meta.color : 'rgba(0,0,0,0.08)',
              fontWeight: filter === state ? 700 : 500
            }}
          >
            <span>{meta.icon}</span> {meta.label} ({stateCounts[state] || 0})
          </button>
        ))}
      </div>

      {/* Competency Nodes Grid (Clean White Cards, Ultra-Thin Borders) */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div className="animate-spin" style={{ width: 40, height: 40, border: '3px solid #e2e8f0', borderTop: '3px solid var(--color-orange)', borderRadius: '50%', margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--text-muted)' }}>Retrieving competency evidence from PostgreSQL...</p>
        </div>
      ) : nodes.length === 0 ? (
        <div className="card" style={{ padding: '60px 24px', background: '#fff', textAlign: 'center' }}>
          <Brain size={48} color="var(--color-orange)" style={{ margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: '1.4rem', marginBottom: 8 }}>No Competency Nodes Initialized Yet</h3>
          <p style={{ color: 'var(--text-secondary)', maxWidth: 520, margin: '0 auto 24px', lineHeight: 1.6 }}>
            Upload your resume or start an adaptive AI mock interview to extract skills, evaluate proficiency, and populate your dynamic Bayesian competency topology.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <Link to="/profile/setup" className="btn btn-primary btn-sm">
              <Upload size={15} /> Upload Resume
            </Link>
            <Link to="/interview" className="btn btn-secondary btn-sm">
              <Sparkles size={15} /> Start AI Interview
            </Link>
          </div>
        </div>
      ) : (
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={bidirectionalViewport}
          variants={staggerContainer}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 18 }}
        >
          {filteredNodes.map(node => {
            const meta = STATE_META[node.competency_state] || STATE_META.unknown;
            const isSelected = selectedNode?.skill_id === node.skill_id;

            return (
            <motion.div
              key={node.skill_id}
              variants={cardFadeUp}
              className="card"
              onClick={() => setSelectedNode(isSelected ? null : node)}
              style={{
                cursor: 'pointer',
                borderColor: isSelected ? meta.color : 'rgba(0,0,0,0.06)',
                boxShadow: isSelected ? `0 8px 24px ${meta.color}25` : 'var(--shadow-md)',
                transform: isSelected ? 'translateY(-2px)' : 'none'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <h4 style={{ fontSize: '1.15rem', color: 'var(--text-primary)', marginBottom: 2 }}>
                    {node.skill_name}
                  </h4>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-tech)' }}>
                    {node.category}
                  </span>
                </div>
                <span className={`state-badge state-${node.competency_state}`}>
                  {meta.icon} {meta.label}
                </span>
              </div>

              {/* Score / Status */}
              <div style={{ margin: '14px 0 10px' }}>
                {node.competency_score !== null ? (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontFamily: 'var(--font-tech)', marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, color: meta.color }}>
                        {Math.round(node.competency_score * 100)}% Demonstrated
                      </span>
                      <span style={{ color: 'var(--text-muted)' }}>
                        Certainty: {Math.round((1 - node.uncertainty) * 100)}%
                      </span>
                    </div>
                    <div style={{ height: 6, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${node.competency_score * 100}%`, background: meta.color, borderRadius: 99 }} />
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: '8px 12px', background: '#f8fafc', borderRadius: 8, fontSize: '0.75rem', fontFamily: 'var(--font-tech)', color: 'var(--text-subtle)' }}>
                    ❓ No evidence collected yet (Unknown)
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', fontFamily: 'var(--font-tech)', color: 'var(--text-secondary)', paddingTop: 10, borderTop: 'var(--border-ultra-thin)' }}>
                <span>Evidence Items: {node.evidence_count}</span>
                {node.evidence_from_resume && (
                  <span className="tag-pill tag-blue" style={{ fontSize: '0.65rem' }}>
                    Resume Verified
                  </span>
                )}
              </div>
            </motion.div>
          );
        })}
        </motion.div>
      )}

      {/* Selected Node Detail Inspector */}
      {selectedNode && (
        <motion.section
          initial="hidden"
          animate="visible"
          variants={cardFadeUp}
          className="card"
          style={{ background: '#ffffff', borderRadius: 16, borderLeft: `4px solid ${STATE_META[selectedNode.competency_state]?.color}` }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: '1.3rem', fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}>
              Node Telemetry: {selectedNode.skill_name}
            </h3>
            <span className={`state-badge state-${selectedNode.competency_state}`}>
              {selectedNode.competency_state}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 14 }}>
            <div className="card-subtle">
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-tech)' }}>SCORE</div>
              <div className="font-tech-black" style={{ fontSize: '1.25rem' }}>
                {selectedNode.competency_score !== null ? `${Math.round(selectedNode.competency_score * 100)}%` : 'Unassessed'}
              </div>
            </div>
            <div className="card-subtle">
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-tech)' }}>UNCERTAINTY</div>
              <div className="font-mono-red" style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                {Math.round(selectedNode.uncertainty * 100)}%
              </div>
            </div>
            <div className="card-subtle">
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-tech)' }}>EVIDENCE COUNT</div>
              <div className="font-tech-green" style={{ fontSize: '1.25rem' }}>
                {selectedNode.evidence_count}
              </div>
            </div>
            <div className="card-subtle">
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-tech)' }}>FROM RESUME</div>
              <div className="font-oswald-blue" style={{ fontSize: '1.25rem' }}>
                {selectedNode.evidence_from_resume ? 'YES' : 'NO'}
              </div>
            </div>
          </div>
        </motion.section>
      )}

      {/* State Legend */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={bidirectionalViewport}
        variants={cardFadeUp}
        className="card"
      >
        <h4 style={{ fontSize: '1.1rem', fontFamily: 'var(--font-heading)', marginBottom: 16 }}>
          Competency State Specification
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
          {Object.entries(STATE_META).map(([state, meta]) => (
            <div key={state} style={{ padding: '12px 14px', borderRadius: 10, background: meta.bg, border: 'var(--border-ultra-thin)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span>{meta.icon}</span>
                <span style={{ fontWeight: 700, fontFamily: 'var(--font-tech)', fontSize: '0.85rem', color: meta.color }}>
                  {meta.label}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                {state === 'unknown' ? 'Insufficient evidence; never penalized as zero.' :
                 state === 'emerging' ? 'Basic syntax and conceptual familiarity.' :
                 state === 'developing' ? 'Moderate proficiency; working on projects.' :
                 state === 'demonstrated' ? 'Solid practical evidence with low uncertainty.' :
                 'Consistent mastery across multiple modalities.'}
              </p>
            </div>
          ))}
        </div>
      </motion.section>

    </div>
  );
}
