import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { profileAPI, roadmapAPI, knowledgeAPI, resumeAPI } from '../services/api';
import toast from 'react-hot-toast';
import {
  GraduationCap, Building2, Calendar, ChevronRight, ChevronLeft,
  CheckCircle, Upload, FileText, Sparkles, Code2, Layers, Globe
} from 'lucide-react';

const STEP_LABELS = [
  { title: 'ACADEMICS & BRANCH', desc: 'College & Major' },
  { title: 'DOMAIN & ROLE', desc: 'Target Specialization' },
  { title: 'TECH STACK', desc: 'Languages & Tools' },
  { title: 'RESUME UPLOAD', desc: 'Extract Baseline Skills' }
];

export default function ProfileSetupPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [uploadedResume, setUploadedResume] = useState(null);

  const [form, setForm] = useState({
    branch: '',
    college: '',
    year_of_study: 3,
    target_domain: '',
    target_role: '',
    preferred_languages: [],
    preferred_technologies: [],
    experience_level: 'student',
    github_url: '',
    linkedin_url: '',
  });

  const [branches, setBranches] = useState([]);
  const [allDomains, setAllDomains] = useState([]);   // Full taxonomy — all 94 domains
  const [domains, setDomains] = useState([]);           // Filtered for legacy role lookup
  const [roles, setRoles] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [technologies, setTechnologies] = useState([]);
  const [domainSearch, setDomainSearch] = useState('');
  const [activeCat, setActiveCat] = useState('All');

  useEffect(() => {
    roadmapAPI.getBranches().then((r) => {
      const bList = r.data.branches || [];
      const seen = new Set();
      setBranches(bList.filter((b) => !seen.has(b.id) && seen.add(b.id)));
    }).catch(() => {});

    // Load the FULL domain taxonomy — all 94 domains, all branches
    roadmapAPI.getAllDomains().then((r) => {
      setAllDomains(r.data.domains || []);
    }).catch(() => {});

    knowledgeAPI.getLanguages().then((r) => {
      const lList = r.data.languages || [];
      const seen = new Set();
      setLanguages(lList.filter((l) => !seen.has(l.name.toLowerCase()) && seen.add(l.name.toLowerCase())));
    }).catch(() => {});

    knowledgeAPI.getTechnologies().then((r) => {
      const tList = r.data.technologies || [];
      const seen = new Set();
      setTechnologies(tList.filter((t) => !seen.has(t.name.toLowerCase()) && seen.add(t.name.toLowerCase())));
    }).catch(() => {});

    // Pre-fill profile if existing
    profileAPI.getMe().then((r) => {
      if (r.data?.has_profile) {
        const p = r.data;
        setForm((prev) => ({
          ...prev,
          branch: p.branch || '',
          college: p.college || '',
          year_of_study: p.year_of_study || 3,
          target_domain: p.target_domain || '',
          target_role: p.target_role || '',
          preferred_languages: Array.from(new Set(p.preferred_languages || [])),
          preferred_technologies: Array.from(new Set(p.preferred_technologies || [])),
          github_url: p.github_url || '',
          linkedin_url: p.linkedin_url || ''
        }));
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (form.branch) {
      roadmapAPI.getDomains(form.branch).then((r) => {
        const rawDomains = r.data.domains || [];
        setDomains(rawDomains);
      }).catch(() => {});
    }
  }, [form.branch]);

  useEffect(() => {
    if (form.target_domain) {
      roadmapAPI.getRoles(form.target_domain).then((r) => {
        const rawRoles = r.data.roles || [];
        const rList = rawRoles.map((role) => (typeof role === 'object' ? role.title : role));
        setRoles(Array.from(new Set(rList)));
        if (form.target_role && !rList.includes(form.target_role)) {
          setForm((p) => ({ ...p, target_role: '', preferred_languages: [], preferred_technologies: [] }));
        }
      }).catch(() => {});
    }
  }, [form.target_domain]);

  useEffect(() => {
    if (form.target_role) {
      roadmapAPI.getLanguagesForRole(form.target_role).then((r) => {
        const lList = r.data.languages || [];
        setLanguages(lList);
      }).catch(() => {});

      const primaryLang = form.preferred_languages?.[0];
      roadmapAPI.getTechnologiesForRole(form.target_role, primaryLang).then((r) => {
        const tList = r.data.technologies || [];
        setTechnologies(tList.map((t) => (typeof t === 'object' ? t : { id: t.toLowerCase().replace(/\s+/g, '_'), name: t })));
      }).catch(() => {});
    }
  }, [form.target_role, form.preferred_languages]);


  const toggle = (field, val) => {
    setForm((p) => ({
      ...p,
      [field]: p[field].includes(val)
        ? p[field].filter((x) => x !== val)
        : [...p[field], val]
    }));
  };

  const handleResumeUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.match(/\.(pdf|docx)$/i)) {
      toast.error('Please upload a PDF or DOCX file.');
      return;
    }

    setUploadingResume(true);
    try {
      const res = await resumeAPI.upload(file);
      setUploadedResume(res.data);
      toast.success(`Resume uploaded & parsed! ${res.data.skills_extracted?.length || 0} skills detected.`);
      if (res.data.skills_extracted?.length > 0) {
        // Auto-add extracted skills to preferred technologies if not present
        const extracted = res.data.skills_extracted.map((s) => s.replace('_', ' ').toUpperCase());
        setForm((p) => ({
          ...p,
          preferred_technologies: Array.from(new Set([...p.preferred_technologies, ...extracted]))
        }));
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Resume upload failed. Try again.');
    } finally {
      setUploadingResume(false);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await profileAPI.create(form);
      toast.success('Career profile successfully calibrated and saved!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save career profile');
    } finally {
      setLoading(false);
    }
  };

  const isStepValid = () => {
    if (step === 0) return Boolean(form.branch) && Boolean(form.college.trim());
    if (step === 1) return Boolean(form.target_domain) && Boolean(form.target_role);
    if (step === 2) return form.preferred_languages.length > 0;
    if (step === 3) return Boolean(uploadedResume);
    return true;
  };

  const handleLoadDemoResume = async () => {
    setUploadingResume(true);
    try {
      const res = await resumeAPI.getDemo();
      setUploadedResume(res.data);
      toast.success(`Demo resume loaded! ${res.data.skills_extracted?.length || 0} skills detected.`);
      if (res.data.skills_extracted?.length > 0) {
        const extracted = res.data.skills_extracted.map((s) => s.replace('_', ' ').toUpperCase());
        setForm((p) => ({
          ...p,
          preferred_technologies: Array.from(new Set([...p.preferred_technologies, ...extracted]))
        }));
      }
    } catch (err) {
      toast.error('Failed to load demo resume.');
    } finally {
      setUploadingResume(false);
    }
  };

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '40px 24px 80px' }}>
      
      {/* Page Title & Breadcrumb */}
      <div style={{ marginBottom: 32, textAlign: 'center' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          background: '#fff7ed',
          border: '1px solid #fed7aa',
          padding: '6px 16px',
          borderRadius: 99,
          color: '#ea580c',
          fontSize: '0.82rem',
          fontFamily: 'var(--font-tech)',
          fontWeight: 700,
          marginBottom: 12
        }}>
          <Sparkles size={14} /> CANDIDATE PROFILE CALIBRATION
        </div>
        <h1 style={{
          fontSize: '2.2rem',
          fontFamily: 'var(--font-heading)',
          color: '#0f172a',
          margin: '0 0 8px'
        }}>
          Set Up Your Career Profile
        </h1>
        <p style={{
          fontSize: '0.95rem',
          color: '#64748b',
          maxWidth: 600,
          margin: '0 auto',
          lineHeight: 1.6
        }}>
          Tailor CareerGPT to your engineering discipline, target industry role, and technical competencies.
        </p>
      </div>

      {/* Stepper Navigation */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 12,
        marginBottom: 32
      }}>
        {STEP_LABELS.map((item, idx) => {
          const isActive = step === idx;
          const isCompleted = step > idx;
          return (
            <div
              key={item.title}
              onClick={() => {
                if (isCompleted) setStep(idx);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '12px 14px',
                background: isActive ? '#ffffff' : '#f8fafc',
                border: `1px solid ${isActive ? '#ea580c' : isCompleted ? '#86efac' : '#e2e8f0'}`,
                borderRadius: 14,
                boxShadow: isActive ? '0 4px 14px rgba(234, 88, 12, 0.12)' : 'none',
                cursor: isCompleted ? 'pointer' : 'default',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: isActive ? '#ea580c' : isCompleted ? '#22c55e' : '#e2e8f0',
                color: isActive || isCompleted ? '#ffffff' : '#64748b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.8rem',
                fontWeight: 800,
                flexShrink: 0
              }}>
                {isCompleted ? <CheckCircle size={16} /> : idx + 1}
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{
                  fontSize: '0.72rem',
                  fontFamily: 'var(--font-tech)',
                  fontWeight: 700,
                  color: isActive ? '#ea580c' : isCompleted ? '#15803d' : '#64748b',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                  overflow: 'hidden'
                }}>
                  {item.title}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                  {item.desc}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Form Container */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 20,
        padding: '36px 32px',
        boxShadow: '0 10px 30px rgba(15, 23, 42, 0.04)'
      }}>

        {/* ── STEP 0: ACADEMICS & BRANCH ── */}
        {step === 0 && (
          <div>
            {/* Section 1: College & Academic Details (Highlighted at top for maximum visibility) */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 16,
              padding: '24px',
              marginBottom: 32
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <Building2 size={20} color="#ea580c" />
                <h3 style={{ fontSize: '1.15rem', color: '#0f172a', margin: 0, fontWeight: 700 }}>
                  Academic Institution & Study Year
                </h3>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 18 }}>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.8rem',
                    fontFamily: 'var(--font-tech)',
                    fontWeight: 700,
                    color: '#334155',
                    marginBottom: 6
                  }}>
                    COLLEGE / UNIVERSITY NAME <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. RGMCET, Nandyal / JNTU / IIT / NIT"
                    value={form.college}
                    onChange={(e) => setForm((p) => ({ ...p, college: e.target.value }))}
                    id="college_input"
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      fontSize: '0.95rem',
                      color: '#0f172a',
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: 10,
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#ea580c';
                      e.target.style.boxShadow = '0 0 0 3px rgba(234, 88, 12, 0.15)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#cbd5e1';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                  <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 4, display: 'block' }}>
                    Enter your college or university to benchmark placement eligibility.
                  </span>
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.8rem',
                    fontFamily: 'var(--font-tech)',
                    fontWeight: 700,
                    color: '#334155',
                    marginBottom: 6
                  }}>
                    CURRENT YEAR OF STUDY <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select
                    value={form.year_of_study}
                    onChange={(e) => setForm((p) => ({ ...p, year_of_study: parseInt(e.target.value) }))}
                    id="year_of_study"
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      fontSize: '0.95rem',
                      color: '#0f172a',
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: 10,
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#ea580c';
                      e.target.style.boxShadow = '0 0 0 3px rgba(234, 88, 12, 0.15)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#cbd5e1';
                      e.target.style.boxShadow = 'none';
                    }}
                  >
                    <option value={1}>1st Year B.Tech (Foundation & Core Concepts)</option>
                    <option value={2}>2nd Year B.Tech (Data Structures & Specialization)</option>
                    <option value={3}>3rd Year B.Tech (Internships & Applied Projects)</option>
                    <option value={4}>4th Year B.Tech (Campus Placement Readiness)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Section 2: Branch Selection */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <h3 style={{ fontSize: '1.15rem', color: '#0f172a', margin: 0, fontWeight: 700 }}>
                  Select Your B.Tech Branch <span style={{ color: '#ef4444' }}>*</span>
                </h3>
                <span style={{ fontSize: '0.8rem', color: '#ea580c', fontWeight: 600 }}>
                  {form.branch ? `Selected: ${form.branch}` : 'Choose one branch'}
                </span>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                gap: 12
              }}>
                {branches.map((b) => {
                  const isSelected = form.branch === b.id;
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, branch: b.id }))}
                      style={{
                        padding: '16px 18px',
                        borderRadius: 14,
                        textAlign: 'left',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        background: isSelected ? '#fff7ed' : '#ffffff',
                        border: `2px solid ${isSelected ? '#ea580c' : '#e2e8f0'}`,
                        color: isSelected ? '#9a3412' : '#1e293b',
                        boxShadow: isSelected ? '0 4px 12px rgba(234, 88, 12, 0.15)' : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12
                      }}
                    >
                      <span style={{ fontSize: '1.4rem' }}>{b.icon}</span>
                      <div>
                        <div style={{ fontSize: '0.95rem', fontWeight: isSelected ? 800 : 600 }}>
                          {b.id}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: isSelected ? '#c2410c' : '#64748b', marginTop: 2 }}>
                          {b.name}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 1: TARGET DOMAIN & TARGET ROLE ── */}
        {step === 1 && (() => {
          // ── Compute categories from full taxonomy
          const categories = ['All', ...Array.from(new Set(allDomains.map(d => d.category || 'General'))).sort()];
          const filtered = allDomains.filter(d => {
            const matchCat = activeCat === 'All' || d.category === activeCat;
            const q = domainSearch.toLowerCase();
            const matchSearch = !q ||
              d.name.toLowerCase().includes(q) ||
              (d.category || '').toLowerCase().includes(q) ||
              (d.branch_id || '').toLowerCase().includes(q) ||
              (d.sample_roles || []).some(r => r.toLowerCase().includes(q));
            return matchCat && matchSearch;
          });

          // Group filtered domains by category for display
          const grouped = {};
          filtered.forEach(d => {
            const cat = d.category || 'General';
            if (!grouped[cat]) grouped[cat] = [];
            grouped[cat].push(d);
          });

          const catColors = {
            'Software & Development': '#3b82f6',
            'AI and Machine Learning': '#8b5cf6',
            'AI & Machine Learning': '#8b5cf6',
            'Data': '#06b6d4',
            'Cloud and DevOps': '#0ea5e9',
            'Cloud & DevOps': '#0ea5e9',
            'Cybersecurity': '#ef4444',
            'Systems and Networks': '#64748b',
            'Systems & Networks': '#64748b',
            'Emerging and Specialized': '#f59e0b',
            'Emerging & Specialized': '#f59e0b',
            'Developer Experience': '#84cc16',
            'Programming and Languages': '#a855f7',
            'Programming & Languages': '#a855f7',
            'Electronics and Hardware': '#f97316',
            'Electronics & Hardware': '#f97316',
            'Embedded and IoT': '#10b981',
            'Embedded & IoT': '#10b981',
            'Robotics and Control': '#6366f1',
            'Robotics & Control': '#6366f1',
            'Power and Energy': '#eab308',
            'Power & Energy': '#eab308',
            'Automation and Control': '#14b8a6',
            'Automation & Control': '#14b8a6',
            'Mechanical Engineering': '#dc2626',
            'Civil Engineering': '#78716c',
            'Chemical Engineering': '#0891b2',
            'Biotechnology and Biomedical': '#059669',
            'Biotechnology & Biomedical': '#059669',
            'Aerospace Engineering': '#7c3aed',
            'Automotive': '#b45309',
          };

          const getBranchColor = (bid) => ({
            CSE: '#3b82f6', ECE: '#8b5cf6', EEE: '#f59e0b',
            MECH: '#ef4444', CIVIL: '#78716c', CHEM: '#0891b2',
            BIOTECH: '#059669', AERO: '#7c3aed', AUTO: '#b45309', ROBOTICS: '#6366f1'
          }[bid] || '#94a3b8');

          return (
            <div>
              {/* Header */}
              <div style={{ marginBottom: 20 }}>
                <h3 style={{ fontSize: '1.2rem', color: '#0f172a', margin: '0 0 4px', fontWeight: 700 }}>
                  Choose Your Career Domain
                </h3>
                <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>
                  Browse <strong>{allDomains.length}</strong> career tracks across all engineering disciplines.
                  Your academic branch ({form.branch || 'selected above'}) does <em>not</em> restrict your choices.
                </p>
              </div>

              {/* Search Bar */}
              <div style={{ position: 'relative', marginBottom: 16 }}>
                <input
                  type="text"
                  id="domain_search"
                  placeholder="Search domains, roles, or technologies... (e.g. React, VLSI, GenAI)"
                  value={domainSearch}
                  onChange={e => setDomainSearch(e.target.value)}
                  style={{
                    width: '100%', padding: '12px 40px 12px 14px',
                    fontSize: '0.9rem', borderRadius: 12, boxSizing: 'border-box',
                    border: '2px solid #e2e8f0', outline: 'none',
                    background: '#f8fafc', color: '#0f172a'
                  }}
                  onFocus={e => { e.target.style.borderColor = '#ea580c'; e.target.style.background = '#fff'; }}
                  onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.background = '#f8fafc'; }}
                />
                {domainSearch && (
                  <button onClick={() => setDomainSearch('')}
                    style={{
                      position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8',
                      fontSize: '1.1rem', lineHeight: 1
                    }}>×</button>
                )}
              </div>

              {/* Category Filter Pills */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                {categories.map(cat => (
                  <button key={cat} type="button"
                    onClick={() => setActiveCat(cat)}
                    style={{
                      padding: '5px 12px', borderRadius: 99, fontSize: '0.78rem', fontWeight: 600,
                      cursor: 'pointer', transition: 'all 0.15s',
                      border: `1.5px solid ${activeCat === cat ? (catColors[cat] || '#ea580c') : '#e2e8f0'}`,
                      background: activeCat === cat ? (catColors[cat] || '#ea580c') : '#f8fafc',
                      color: activeCat === cat ? '#ffffff' : '#64748b',
                    }}>
                    {cat}
                  </button>
                ))}
              </div>

              {/* Results count */}
              <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: 12 }}>
                Showing {filtered.length} of {allDomains.length} domains
                {domainSearch && <span> matching &quot;<strong>{domainSearch}</strong>&quot;</span>}
              </div>

              {/* Domain Cards grouped by Category */}
              {Object.entries(grouped).map(([cat, catDomains]) => (
                <div key={cat} style={{ marginBottom: 28 }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    marginBottom: 12, paddingBottom: 8,
                    borderBottom: `2px solid ${catColors[cat] || '#e2e8f0'}22`
                  }}>
                    <div style={{
                      width: 10, height: 10, borderRadius: '50%',
                      background: catColors[cat] || '#64748b', flexShrink: 0
                    }} />
                    <span style={{
                      fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.06em',
                      color: catColors[cat] || '#64748b', textTransform: 'uppercase'
                    }}>{cat}</span>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>({catDomains.length})</span>
                  </div>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
                    gap: 10
                  }}>
                    {catDomains.map(d => {
                      const isSelected = form.target_domain === d.name;
                      const accentColor = catColors[d.category] || '#ea580c';
                      const branchColor = getBranchColor(d.branch_id);
                      return (
                        <button
                          key={d.id}
                          type="button"
                          id={`domain_${d.id}`}
                          onClick={() => setForm(p => ({ ...p, target_domain: d.name, target_role: '' }))}
                          style={{
                            padding: '14px 14px', borderRadius: 12, textAlign: 'left',
                            cursor: 'pointer', transition: 'all 0.18s',
                            background: isSelected ? `${accentColor}0f` : '#ffffff',
                            border: `2px solid ${isSelected ? accentColor : '#e2e8f0'}`,
                            boxShadow: isSelected ? `0 4px 16px ${accentColor}25` : '0 1px 3px rgba(0,0,0,0.04)',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                            <span style={{
                              fontSize: '0.88rem', fontWeight: 700,
                              color: isSelected ? accentColor : '#1e293b',
                              lineHeight: 1.3
                            }}>{d.name}</span>
                            {isSelected && (
                              <span style={{
                                width: 18, height: 18, borderRadius: '50%',
                                background: accentColor, color: '#fff',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '0.7rem', flexShrink: 0, marginLeft: 6
                              }}>✓</span>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                            <span style={{
                              display: 'inline-flex', padding: '2px 7px', borderRadius: 6,
                              background: `${branchColor}18`, color: branchColor,
                              fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.04em'
                            }}>{d.branch_id}</span>
                            {d.role_count > 0 && (
                              <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                                {d.role_count} {d.role_count === 1 ? 'role' : 'roles'}
                              </span>
                            )}
                          </div>
                          {d.sample_roles && d.sample_roles.length > 0 && (
                            <div style={{ marginTop: 6, fontSize: '0.72rem', color: '#64748b', lineHeight: 1.4 }}>
                              {d.sample_roles.slice(0, 2).join(' · ')}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {filtered.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
                  <div style={{ fontSize: '2rem', marginBottom: 8 }}>🔍</div>
                  <p style={{ margin: 0 }}>No domains found for &quot;{domainSearch}&quot;</p>
                  <button type="button" onClick={() => { setDomainSearch(''); setActiveCat('All'); }}
                    style={{ marginTop: 12, padding: '8px 16px', borderRadius: 8, border: '1px solid #e2e8f0',
                      background: '#f8fafc', color: '#64748b', cursor: 'pointer', fontSize: '0.85rem' }}>
                    Clear Filters
                  </button>
                </div>
              )}

              {/* Selected Domain → Role Selection */}
              {form.target_domain && (
                <div style={{
                  marginTop: 24,
                  background: '#f8fafc',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: 16, padding: '20px 20px'
                }}>
                  <div style={{ marginBottom: 14 }}>
                    <h4 style={{ fontSize: '1rem', color: '#0f172a', margin: '0 0 4px', fontWeight: 700 }}>
                      Target Career Role in <span style={{ color: '#ea580c' }}>{form.target_domain}</span>
                    </h4>
                    <p style={{ fontSize: '0.82rem', color: '#64748b', margin: 0 }}>
                      Select the specific job title you are preparing for.
                    </p>
                  </div>
                  {roles.length > 0 ? (
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                      gap: 10
                    }}>
                      {roles.map(r => {
                        const isSelected = form.target_role === r;
                        return (
                          <button key={r} type="button"
                            id={`role_${r.replace(/[^a-z0-9]/gi, '_').toLowerCase()}`}
                            onClick={() => setForm(p => ({ ...p, target_role: r }))}
                            style={{
                              padding: '12px 14px', borderRadius: 10, textAlign: 'left',
                              cursor: 'pointer', transition: 'all 0.18s',
                              background: isSelected ? '#fff7ed' : '#ffffff',
                              border: `2px solid ${isSelected ? '#ea580c' : '#e2e8f0'}`,
                              color: isSelected ? '#9a3412' : '#1e293b',
                              fontWeight: isSelected ? 700 : 500,
                              fontSize: '0.88rem',
                              boxShadow: isSelected ? '0 4px 12px rgba(234,88,12,0.12)' : 'none'
                            }}>
                            {isSelected && <span style={{ marginRight: 6 }}>✓</span>}
                            {r}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ color: '#94a3b8', fontSize: '0.85rem', padding: '8px 0' }}>
                      Loading roles for this domain...
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })()}

        {/* ── STEP 2: LANGUAGES & TECH STACK ── */}
        {step === 2 && (
          <div>
            <div style={{ marginBottom: 28 }}>
              <h3 style={{ fontSize: '1.15rem', color: '#0f172a', margin: '0 0 6px', fontWeight: 700 }}>
                Preferred Programming Languages <span style={{ color: '#ef4444' }}>*</span>
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 12px' }}>
                Select the languages you code in or want in your assessment.
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {languages.map((l) => {
                  const langName = typeof l === 'string' ? l : l.name;
                  const relevance = l.relevance || 'Recommended';
                  const reason = l.reason || '';
                  const isSelected = form.preferred_languages.includes(langName);
                  return (
                    <button
                      key={langName}
                      type="button"
                      title={reason}
                      onClick={() => toggle('preferred_languages', langName)}
                      style={{
                        padding: '8px 16px',
                        borderRadius: 99,
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        fontWeight: isSelected ? 700 : 500,
                        transition: 'all 0.2s',
                        background: isSelected ? '#ea580c' : '#f8fafc',
                        border: `1px solid ${isSelected ? '#ea580c' : '#cbd5e1'}`,
                        color: isSelected ? '#ffffff' : '#334155',
                        boxShadow: isSelected ? '0 3px 10px rgba(234, 88, 12, 0.2)' : 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8
                      }}
                    >
                      <span>{langName}</span>
                      <span style={{
                        fontSize: '0.68rem',
                        padding: '2px 6px',
                        borderRadius: 8,
                        background: isSelected ? 'rgba(255,255,255,0.25)' : '#e2e8f0',
                        color: isSelected ? '#ffffff' : '#475569',
                        fontWeight: 700
                      }}>
                        {relevance}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ marginBottom: 28 }}>
              <h3 style={{ fontSize: '1.15rem', color: '#0f172a', margin: '0 0 6px', fontWeight: 700 }}>
                Frameworks, Databases & Tools
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 12px' }}>
                Select technologies relevant to your {form.target_role || 'target role'}.
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {technologies.slice(0, 24).map((t) => {
                  const isSelected = form.preferred_technologies.includes(t.name);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => toggle('preferred_technologies', t.name)}
                      style={{
                        padding: '8px 16px',
                        borderRadius: 99,
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        fontWeight: isSelected ? 700 : 500,
                        transition: 'all 0.2s',
                        background: isSelected ? '#2563eb' : '#f8fafc',
                        border: `1px solid ${isSelected ? '#2563eb' : '#cbd5e1'}`,
                        color: isSelected ? '#ffffff' : '#334155',
                        boxShadow: isSelected ? '0 3px 10px rgba(37, 99, 235, 0.2)' : 'none'
                      }}
                    >
                      {t.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Profile URLs */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 14,
              padding: '20px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: 16
            }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontFamily: 'var(--font-tech)', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  GITHUB PROFILE URL (OPTIONAL)
                </label>
                <input
                  type="url"
                  placeholder="https://github.com/username"
                  value={form.github_url}
                  onChange={(e) => setForm((p) => ({ ...p, github_url: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    fontSize: '0.9rem',
                    color: '#0f172a',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: 8,
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontFamily: 'var(--font-tech)', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  LINKEDIN PROFILE URL (OPTIONAL)
                </label>
                <input
                  type="url"
                  placeholder="https://linkedin.com/in/username"
                  value={form.linkedin_url}
                  onChange={(e) => setForm((p) => ({ ...p, linkedin_url: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    fontSize: '0.9rem',
                    color: '#0f172a',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: 8,
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 3: RESUME UPLOAD (OPTIONAL BUT RECOMMENDED) ── */}
        {step === 3 && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <div style={{
                width: 60,
                height: 60,
                borderRadius: '50%',
                background: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px'
              }}>
                <Upload size={28} />
              </div>
              <h3 style={{ fontSize: '1.3rem', color: '#0f172a', margin: '0 0 6px', fontWeight: 700 }}>
                Upload Candidate Resume (PDF / DOCX)
              </h3>
              <p style={{ fontSize: '0.9rem', color: '#64748b', maxWidth: 520, margin: '0 auto', lineHeight: 1.5 }}>
                Your resume will be safely stored in private cloud storage. We automatically extract skills, projects, and initialize your baseline competency graph.
              </p>
            </div>

            {/* Upload Box */}
            <div style={{
              border: '2px dashed #cbd5e1',
              borderRadius: 16,
              padding: '36px 24px',
              textAlign: 'center',
              background: '#f8fafc',
              cursor: 'pointer',
              position: 'relative'
            }}>
              <input
                type="file"
                accept=".pdf,.docx"
                onChange={handleResumeUpload}
                disabled={uploadingResume}
                style={{
                  position: 'absolute',
                  inset: 0,
                  opacity: 0,
                  cursor: 'pointer',
                  width: '100%',
                  height: '100%'
                }}
              />
              <FileText size={40} color="#94a3b8" style={{ margin: '0 auto 12px' }} />
              <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>
                {uploadingResume ? 'Processing & Parsing Resume...' : 'Drop your resume here, or click to browse'}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                Supports standard PDF and DOCX files (Up to 10MB)
              </div>
            </div>

            {/* Uploaded Confirmation */}
            {uploadedResume && (
              <div style={{
                marginTop: 20,
                background: '#ecfdf5',
                border: '1px solid #a7f3d0',
                borderRadius: 12,
                padding: '16px 20px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#065f46', fontWeight: 700, marginBottom: 8 }}>
                  <CheckCircle size={18} color="#059669" />
                  <span>Resume Stored Persistently: {uploadedResume.filename}</span>
                </div>
                <div style={{ fontSize: '0.85rem', color: '#047857', marginBottom: 10 }}>
                  Extracted {uploadedResume.skills_extracted?.length || 0} skills into your baseline competency graph.
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {uploadedResume.skills_extracted?.map((sk) => (
                    <span
                      key={sk}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #6ee7b7',
                        padding: '4px 10px',
                        borderRadius: 20,
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: '#065f46'
                      }}
                    >
                      {sk.replace('_', ' ')}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Navigation Buttons */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 36,
          paddingTop: 24,
          borderTop: '1px solid #f1f5f9'
        }}>
          {step > 0 ? (
            <button
              type="button"
              onClick={() => setStep((p) => p - 1)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '12px 22px',
                borderRadius: 10,
                background: '#f1f5f9',
                border: '1px solid #cbd5e1',
                color: '#334155',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <ChevronLeft size={16} /> Back
            </button>
          ) : <div />}

          {step < 3 ? (
            <button
              type="button"
              onClick={() => setStep((p) => p + 1)}
              disabled={!isStepValid()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '12px 28px',
                borderRadius: 10,
                background: isStepValid() ? '#ea580c' : '#cbd5e1',
                border: 'none',
                color: '#ffffff',
                fontWeight: 700,
                cursor: isStepValid() ? 'pointer' : 'not-allowed',
                boxShadow: isStepValid() ? '0 4px 12px rgba(234, 88, 12, 0.25)' : 'none',
                transition: 'all 0.2s'
              }}
            >
              Next Step <ChevronRight size={16} />
            </button>
          ) : (
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                type="button"
                onClick={handleLoadDemoResume}
                disabled={loading || uploadingResume}
                style={{
                  padding: '14px 20px',
                  borderRadius: 10,
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  color: '#475569',
                  fontWeight: 600,
                  cursor: loading || uploadingResume ? 'not-allowed' : 'pointer',
                }}
              >
                Use Demo Resume
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading || !isStepValid()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '14px 32px',
                  borderRadius: 10,
                  background: (!loading && isStepValid()) ? 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)' : '#cbd5e1',
                  border: 'none',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  cursor: (!loading && isStepValid()) ? 'pointer' : 'not-allowed',
                  boxShadow: (!loading && isStepValid()) ? '0 4px 16px rgba(234, 88, 12, 0.35)' : 'none'
                }}
              >
                <CheckCircle size={18} />
                {loading ? 'SAVING PROFILE...' : 'SAVE & GO TO DASHBOARD'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
