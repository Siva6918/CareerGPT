// CareerGPT - Report Page
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { interviewAPI } from '../services/api';
import { BarChart3, Brain, CheckCircle, AlertCircle, HelpCircle, Download, ArrowLeft } from 'lucide-react';



const STATE_COLORS = {
  strong: { text: '#ffffff', bg: 'rgba(255,255,255,0.15)', border: 'rgba(255,255,255,0.4)' },
  demonstrated: { text: '#e5e7eb', bg: 'rgba(255,255,255,0.15)', border: 'rgba(255,255,255,0.4)' },
  developing: { text: '#f3f4f6', bg: 'rgba(255,255,255,0.15)', border: 'rgba(255,255,255,0.4)' },
  emerging: { text: '#ffffff', bg: 'rgba(0,0,0,0.15)', border: 'rgba(0,0,0,0.4)' },
  unknown: { text: '#9ca3af', bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.1)' },
};

function RadiusBar({ value, color, label }) {
  const pct = Math.round(value * 100);
  const angle = (value * 360).toFixed(1);
  const r = 70;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value * circ);

  return (
    <div style={{ textAlign: 'center' }}>
      <svg width="180" height="180" viewBox="0 0 180 180" style={{ filter: `drop-shadow(0 0 10px ${color}40)` }}>
        <circle cx="90" cy="90" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="14" />
        <circle
          cx="90" cy="90" r={r} fill="none"
          stroke={color} strokeWidth="14"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 90 90)"
          style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1)' }}
        />
        <text className="text-tech" x="90" y="85" textAnchor="middle" fill="#fff" fontSize="28" fontWeight="800">{pct}%</text>
        <text className="text-tech" x="90" y="108" textAnchor="middle" fill="var(--text-muted)" fontSize="12">{label.toUpperCase()}</text>
      </svg>
    </div>
  );
}

export default function ReportPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      interviewAPI.getReport(id)
        .then(res => setReport(res.data))
        .catch(err => {
          console.error('Failed to load report:', err);
          setReport(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [id]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <div className="animate-spin animate-glow" style={{ width: 60, height: 60, border: '3px solid rgba(255,255,255,0.2)', borderTop: '3px solid var(--color-accent)', borderRadius: '50%' }} />
      </div>
    );
  }

  if (!report) return <div className="dashboard-page"><p className="text-tech" style={{ color: '#fff' }}>REPORT NOT FOUND.</p></div>;

  const { readiness, competency_summary, interview, skill_gaps } = report;
  const readinessScore = readiness?.score || 0;
  const readinessColor = readinessScore >= 0.7 ? '#ffffff' : readinessScore >= 0.5 ? 'var(--color-accent-2)' : 'var(--color-accent)';

  const allSkills = [
    ...((competency_summary?.strong || []).map(s => ({ ...s, state: 'strong' }))),
    ...((competency_summary?.demonstrated || []).map(s => ({ ...s, state: 'demonstrated' }))),
    ...((competency_summary?.developing || []).map(s => ({ ...s, state: 'developing' }))),
    ...((competency_summary?.emerging || []).map(s => ({ ...s, state: 'emerging' }))),
  ];

  return (
    <div className="dashboard-page animate-fade-up">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 40, flexWrap: 'wrap' }}>
        <button className="btn btn-ghost btn-icon" style={{ padding: 12, border: '1px solid rgba(255,255,255,0.1)', borderRadius: '50%' }} onClick={() => navigate('/dashboard')}>
          <ArrowLeft size={20} color="var(--text-secondary)" />
        </button>
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: '2.5rem', fontFamily: 'var(--font-heading)' }}>
            <BarChart3 size={32} color="var(--color-accent)" />
            INTERVIEW REPORT
          </h2>
          <p className="text-sm text-muted text-tech" style={{ letterSpacing: '0.05em' }}>
            {interview?.target_role.toUpperCase()} · {interview?.questions_asked} QUESTIONS · EVIDENCE-BASED ASSESSMENT
          </p>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <button className="btn btn-secondary text-tech" style={{ padding: '12px 24px' }} onClick={() => window.print()}>
            <Download size={16} /> EXPORT PDF
          </button>
        </div>
      </div>

      {/* Readiness Gauge */}
      <div className="glass-card" style={{ marginBottom: 32, textAlign: 'center', padding: 48 }}>
        <h4 className="text-tech" style={{ marginBottom: 40, fontSize: '1.2rem', color: '#fff' }}>PLACEMENT READINESS SCORE</h4>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 48, flexWrap: 'wrap' }}>
          <RadiusBar value={readinessScore} color={readinessColor} label="OVERALL" />
          {readiness?.components && (
            <>
              <RadiusBar value={readiness.components.performance} color="var(--color-accent)" label="PERFORMANCE" />
              <RadiusBar value={readiness.components.coverage} color="var(--color-accent-2)" label="COVERAGE" />
              <RadiusBar value={readiness.components.certainty} color="#ffffff" label="CERTAINTY" />
            </>
          )}
        </div>

        {/* Formula */}
        <div className="text-tech" style={{
          marginTop: 48, padding: '16px 24px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 12, fontSize: '0.8rem', color: 'var(--text-muted)',
          display: 'inline-block'
        }}>
          <strong style={{ color: '#fff' }}>FORMULA: </strong>
          {readiness?.formula || '0.4 × PERFORMANCE + 0.35 × COVERAGE + 0.25 × CERTAINTY'}
        </div>

        <div className="text-tech animate-pulse" style={{
          marginTop: 20, padding: '16px 24px', background: 'rgba(255,255,255,0.1)',
          border: '1px solid rgba(255,255,255,0.3)', borderRadius: 12,
          fontSize: '0.8rem', color: 'var(--color-accent)', maxWidth: 600, margin: '20px auto 0'
        }}>
          ⚠️ <strong>NOTE:</strong> THIS SCORE REFLECTS DEMONSTRATED EVIDENCE ONLY.
          SKILLS WITH NO EVIDENCE ARE MARKED UNKNOWN — NOT SCORED AS ZERO.
        </div>
      </div>

      {/* Competency Summary Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: 24, marginBottom: 24 }}>
        {/* Assessed Skills */}
        <div className="glass-card" style={{ padding: 32 }}>
          <h4 className="text-tech" style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12, color: '#fff', fontSize: '1.1rem' }}>
            <CheckCircle size={20} color="var(--color-accent)" />
            ASSESSED SKILLS ({allSkills.length})
          </h4>
          {allSkills.length > 0 ? allSkills.map((skill, i) => {
            const colors = STATE_COLORS[skill.state];
            return (
              <div key={i} className="animate-fade-up" style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '16px 20px', marginBottom: 12,
                background: colors.bg, border: `1px solid ${colors.border}`,
                borderRadius: 12, animationDelay: `${i * 0.05}s`
              }}>
                <span style={{ fontWeight: 700, fontSize: '1.1rem', color: '#fff', fontFamily: 'var(--font-heading)' }}>{skill.skill_name}</span>
                <div style={{ textAlign: 'right' }}>
                  {skill.competency_score !== null && skill.competency_score !== undefined && (
                    <div className="text-tech" style={{ fontSize: '1.1rem', fontWeight: 800, color: colors.text, marginBottom: 4 }}>
                      {Math.round(skill.competency_score * 100)}%
                    </div>
                  )}
                  <span className={`state-badge state-${skill.state}`}>{skill.state.toUpperCase()}</span>
                </div>
              </div>
            );
          }) : (
            <p className="text-muted text-sm text-tech">NO SKILLS ASSESSED YET</p>
          )}
        </div>

        {/* Unknown Skills */}
        <div className="glass-card" style={{ padding: 32 }}>
          <h4 className="text-tech" style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12, color: '#fff', fontSize: '1.1rem' }}>
            <HelpCircle size={20} color="var(--text-muted)" />
            UNKNOWN SKILLS ({competency_summary?.unknown?.length || 0})
          </h4>
          {(competency_summary?.unknown || []).map((skill, i) => (
            <div key={i} className="animate-fade-up" style={{
              padding: '16px 20px', marginBottom: 12,
              background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 12, animationDelay: `${i * 0.05}s`
            }}>
              <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 6, color: '#fff', fontFamily: 'var(--font-heading)' }}>{skill.skill_name}</div>
              <div className="text-tech" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {skill.note ? skill.note.toUpperCase() : 'NO EVIDENCE COLLECTED — NOT SCORED'}
              </div>
            </div>
          ))}

          <div className="text-tech" style={{
            marginTop: 24, padding: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 12, fontSize: '0.8rem', color: 'var(--text-secondary)'
          }}>
            💡 START ANOTHER INTERVIEW SESSION TO COLLECT EVIDENCE FOR THESE SKILLS
          </div>
        </div>
      </div>

      {/* Coverage Stats */}
      {skill_gaps && (
        <div className="glass-card" style={{ padding: 32 }}>
          <h4 className="text-tech" style={{ marginBottom: 24, color: '#fff', fontSize: '1.1rem' }}>EVIDENCE COVERAGE</h4>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            {[
              { label: 'SKILLS ASSESSED', val: skill_gaps.assessed, total: skill_gaps.total_required, color: 'var(--color-accent)' },
              { label: 'UNKNOWN SKILLS', val: skill_gaps.unknown, total: skill_gaps.total_required, color: '#9ca3af' },
            ].map(({ label, val, total, color }) => (
              <div key={label} style={{ flex: 1, minWidth: 200, background: 'rgba(255,255,255,0.02)', padding: 24, borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span className="text-tech" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{label}</span>
                  <span className="text-tech" style={{ fontSize: '1rem', fontWeight: 800, color }}>{val}/{total}</span>
                </div>
                <div className="progress-bar" style={{ height: 6, background: 'rgba(255,255,255,0.1)' }}>
                  <div className="progress-fill" style={{
                    width: `${(val / Math.max(total, 1)) * 100}%`,
                    background: color, transition: 'width 1s ease-out'
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
