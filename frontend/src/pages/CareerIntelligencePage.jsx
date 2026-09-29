import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Target, Brain, ArrowRight, Zap, Target as TargetIcon, Map, FileText, Activity, Layers, Compass, CheckCircle, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { cardFadeUp, bidirectionalViewport } from '../utils/motionVariants';
import api from '../services/api';

export default function CareerIntelligencePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await api.get('/api/dashboard');
        setData(res.data);
      } catch (err) {
        console.error('Failed to load career intelligence', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid #f97316', borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  if (!data) return <div>Failed to load intelligence data.</div>;

  const { readiness, top_gaps, projects, next_action } = data;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      
      {/* HEADER */}
      <motion.section initial="hidden" whileInView="visible" viewport={bidirectionalViewport} variants={cardFadeUp}>
        <div style={{ background: 'linear-gradient(135deg, rgba(249,115,22,0.1), rgba(255,255,255,1))', borderRadius: '20px', padding: '32px', border: '1px solid rgba(249,115,22,0.2)' }}>
          <h1 style={{ fontSize: '2.5rem', fontFamily: 'var(--font-heading)', margin: '0 0 8px 0' }}>
            Good morning, {user?.full_name || user?.username || 'Engineer'} 👋
          </h1>
          <p style={{ color: '#64748b', fontSize: '1.1rem', margin: 0 }}>Your career intelligence dashboard</p>
        </div>
      </motion.section>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
        
        {/* TARGET & READINESS */}
        <motion.div initial="hidden" whileInView="visible" viewport={bidirectionalViewport} variants={cardFadeUp} className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <TargetIcon size={24} color="#ea580c" />
            <h2 style={{ margin: 0, fontFamily: 'var(--font-heading)' }}>Primary Goal</h2>
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: 8 }}>{readiness?.target_role || 'Not Set'}</div>
          
          <div style={{ marginTop: 24 }}>
            <div style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: 8 }}>Readiness Status</div>
            <div style={{ display: 'inline-block', padding: '6px 14px', borderRadius: 20, background: '#fefce8', color: '#b45309', fontWeight: 800, border: '1px solid #fef08a', textTransform: 'uppercase' }}>
              {readiness?.readiness_level?.replace('_', ' ') || 'NOT ASSESSED'}
            </div>
          </div>

          <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ background: '#f8fafc', padding: 12, borderRadius: 10 }}>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Technical</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{readiness?.dimensions?.['Technical Skills'] || 0}%</div>
            </div>
            <div style={{ background: '#f8fafc', padding: 12, borderRadius: 10 }}>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Projects</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{readiness?.dimensions?.['Projects'] || 0}%</div>
            </div>
          </div>
        </motion.div>

        {/* STRENGTHS & GAPS */}
        <motion.div initial="hidden" whileInView="visible" viewport={bidirectionalViewport} variants={cardFadeUp} className="card">
          <h2 style={{ margin: '0 0 16px 0', fontFamily: 'var(--font-heading)' }}>Skill Analysis</h2>
          
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: '0.9rem', color: '#64748b', textTransform: 'uppercase', marginBottom: 12 }}>Priority Gaps</h3>
            {top_gaps && top_gaps.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {top_gaps.map((gap, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 10, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8 }}>
                    <AlertCircle size={16} color="#ef4444" />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#991b1b' }}>{gap.skill_name}</div>
                      <div style={{ fontSize: '0.8rem', color: '#b91c1c' }}>{gap.priority} Priority</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: '0.9rem', color: '#64748b' }}>No critical gaps identified yet.</div>
            )}
          </div>
        </motion.div>

        {/* NEXT ACTION */}
        <motion.div initial="hidden" whileInView="visible" viewport={bidirectionalViewport} variants={cardFadeUp} className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <Zap size={24} color="#3b82f6" />
            <h2 style={{ margin: 0, fontFamily: 'var(--font-heading)' }}>Next Best Action</h2>
          </div>
          
          {next_action ? (
            <div style={{ background: '#eff6ff', padding: 20, borderRadius: 12, border: '1px solid #bfdbfe' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1d4ed8', marginBottom: 8, textTransform: 'uppercase' }}>
                {next_action.action_type?.replace(/_/g, ' ')}
              </div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '1.3rem', color: '#1e3a8a' }}>{next_action.title}</h3>
              <p style={{ margin: 0, color: '#3b82f6', fontSize: '0.95rem' }}>{next_action.description}</p>
              
              <div style={{ marginTop: 16, fontSize: '0.85rem', color: '#1e40af', borderTop: '1px solid #bfdbfe', paddingTop: 12 }}>
                <strong>Why?</strong> {next_action.reasoning}
              </div>
            </div>
          ) : (
            <p style={{ color: '#64748b' }}>Configure your profile to get a personalized action plan.</p>
          )}
        </motion.div>
      </div>

      {/* RECOMMENDED PROJECTS */}
      <motion.section initial="hidden" whileInView="visible" viewport={bidirectionalViewport} variants={cardFadeUp}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <Layers size={24} color="#8b5cf6" />
          <h2 style={{ margin: 0, fontFamily: 'var(--font-heading)', fontSize: '1.6rem' }}>Recommended Projects</h2>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
          {projects && projects.length > 0 ? (
            projects.map((proj, idx) => (
              <div key={idx} className="card" style={{ borderTop: '4px solid #8b5cf6' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span className="tag-pill tag-violet">{proj.difficulty}</span>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{proj.estimated_duration}</span>
                </div>
                <h3 style={{ fontSize: '1.2rem', margin: '8px 0 12px 0' }}>{proj.title}</h3>
                
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569', marginBottom: 4 }}>Skills Addressed:</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {(proj.competencies || []).map((c, i) => (
                      <span key={i} style={{ background: '#f1f5f9', padding: '2px 8px', borderRadius: 4, fontSize: '0.75rem' }}>{c}</span>
                    ))}
                  </div>
                </div>
                
                <div style={{ fontSize: '0.85rem', color: '#64748b', background: '#f8fafc', padding: 10, borderRadius: 8 }}>
                  <strong>Why?</strong> {proj.why_recommended || "Addresses critical skill gaps."}
                </div>
                
                <button className="btn btn-secondary" style={{ width: '100%', marginTop: 16 }}>
                  View Project Details <ArrowRight size={16} />
                </button>
              </div>
            ))
          ) : (
            <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 40, color: '#64748b' }}>
              No project recommendations available at this time.
            </div>
          )}
        </div>
      </motion.section>
    </div>
  );
}
