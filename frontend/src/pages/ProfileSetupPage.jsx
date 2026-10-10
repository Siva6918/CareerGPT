import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import EmojiLoadingBar from '../components/EmojiLoadingBar';
import { profileAPI, portfolioAPI, roadmapAPI, resumeAPI, knowledgeAPI } from '../services/api';
import toast from 'react-hot-toast';
import {
  User, GraduationCap, Briefcase, Globe, FileText, CheckCircle, Upload, ChevronRight, ChevronLeft, Plus, Trash2, Link, Lock, Eye
} from 'lucide-react';

const STEP_LABELS = [
  { title: 'Personal Info', desc: 'Basics & Identity', icon: User },
  { title: 'Education & Goals', desc: 'College & Career', icon: GraduationCap },
  { title: 'Skills & Experience', desc: 'Tech & Work', icon: Briefcase },
  { title: 'External Profiles', desc: 'Coding Platforms', icon: Globe },
  { title: 'Resume & Privacy', desc: 'Upload & Visiblity', icon: FileText }
];

export default function ProfileSetupPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [uploadedResume, setUploadedResume] = useState(null);

  // Core profile state
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
    bio: ''
  });

  // Portfolio extended state
  const [portfolio, setPortfolio] = useState({
    headline: '',
    location: '',
    preferred_location: '',
    public_slug: '',
    is_public: true,
    show_resume: false,
    show_github: true,
    educations: [],
    experiences: [],
    certifications: [],
    external_platforms: [],
    projects: []
  });

  // Dropdown options
  const [branches, setBranches] = useState([]);
  const [domains, setDomains] = useState([]);
  const [roles, setRoles] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [technologies, setTechnologies] = useState([]);

  useEffect(() => {
    roadmapAPI.getBranches().then(r => setBranches(r.data.branches || [])).catch(() => {});
    knowledgeAPI.getLanguages().then(r => setLanguages(r.data.languages || [])).catch(() => {});
    knowledgeAPI.getTechnologies().then(r => setTechnologies(r.data.technologies || [])).catch(() => {});
    
    // Load existing profile & portfolio
    profileAPI.getMe().then(r => {
      if (r.data?.has_profile) {
        setForm(p => ({ ...p, ...r.data }));
      }
    }).catch(() => {});

    portfolioAPI.getMe().then(r => {
      if (r.data?.profile) {
        setPortfolio({
          ...r.data.profile,
          educations: r.data.educations || [],
          experiences: r.data.experiences || [],
          certifications: r.data.certifications || [],
          external_platforms: r.data.external_platforms || [],
          projects: r.data.projects || []
        });
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (form.branch) roadmapAPI.getDomains(form.branch).then(r => setDomains(r.data.domains || [])).catch(() => {});
  }, [form.branch]);

  useEffect(() => {
    if (form.target_domain) roadmapAPI.getRoles(form.target_domain).then(r => setRoles(r.data.roles || [])).catch(() => {});
  }, [form.target_domain]);

  const toggle = (field, val) => {
    setForm(p => ({
      ...p,
      [field]: p[field].includes(val) ? p[field].filter(x => x !== val) : [...p[field], val]
    }));
  };

  const addArrayItem = (field, defaultObj) => {
    setPortfolio(p => ({ ...p, [field]: [...p[field], defaultObj] }));
  };

  const removeArrayItem = (field, idx) => {
    setPortfolio(p => ({ ...p, [field]: p[field].filter((_, i) => i !== idx) }));
  };

  const updateArrayItem = (field, idx, key, val) => {
    setPortfolio(p => {
      const arr = [...p[field]];
      arr[idx] = { ...arr[idx], [key]: val };
      return { ...p, [field]: arr };
    });
  };

  const handleResumeUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingResume(true);
    try {
      const res = await resumeAPI.upload(file);
      setUploadedResume(res.data);
      if (res.data.extracted_data?.skills?.length > 0) {
        toast.success(`Extracted ${res.data.extracted_data.skills.length} skills!`);
      }
    } catch (err) {
      toast.error('Resume upload failed.');
    } finally {
      setUploadingResume(false);
    }
  };

  const submit = async () => {
    setLoading(true);
    try {
      // 1. Submit basic profile (needed for system to work)
      await profileAPI.create({
        ...form,
        resume_id: uploadedResume?.id
      });
      // 2. Submit portfolio
      await portfolioAPI.updateMe(portfolio);
      toast.success('Profile created successfully!');
      localStorage.removeItem('careergpt_setup_step');
      window.location.href = '/dashboard';
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create profile');
      setLoading(false);
    }
  };

  const handleContinue = () => {
    // Fire-and-forget save to backend so progress is preserved
    profileAPI.create({ ...form, resume_id: uploadedResume?.id }).catch(() => {});
    portfolioAPI.updateMe(portfolio).catch(() => {});
    
    setStep(s => {
      const nextStep = Math.min(4, s + 1);
      localStorage.setItem('careergpt_setup_step', nextStep.toString());
      return nextStep;
    });
  };

  useEffect(() => {
    const savedStep = localStorage.getItem('careergpt_setup_step');
    if (savedStep) {
      setStep(parseInt(savedStep, 10));
    }
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#09090b', color: '#f8fafc', padding: '40px 20px', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        
        {/* Progress header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '40px', borderBottom: '1px solid #27272a', paddingBottom: '20px' }}>
          {STEP_LABELS.map((s, i) => {
            const Icon = s.icon;
            const active = step === i;
            const past = step > i;
            return (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: active || past ? 1 : 0.4, transition: '0.3s' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: active ? '#38bdf8' : past ? '#10b981' : '#27272a', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
                  {past ? <CheckCircle size={20} color="#fff" /> : <Icon size={20} color={active ? '#0f172a' : '#fff'} />}
                </div>
                <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{s.title}</div>
              </div>
            )
          })}
        </div>

        {/* Step 1: Personal Info */}
        {step === 0 && (
          <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
            <h2 style={{ fontSize: '2rem', marginBottom: '8px' }}>Personal Information</h2>
            <p style={{ color: '#a1a1aa', marginBottom: '32px' }}>Let's start with your identity and public portfolio slug.</p>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '8px', color: '#a1a1aa' }}>Professional Headline</label>
                <input value={portfolio.headline} onChange={e => setPortfolio({...portfolio, headline: e.target.value})} placeholder="e.g. Full Stack Developer | AI Enthusiast" style={{ width: '100%', padding: '12px', background: '#18181b', border: '1px solid #27272a', borderRadius: '8px', color: '#fff' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '8px', color: '#a1a1aa' }}>Public Portfolio Slug</label>
                <div style={{ display: 'flex' }}>
                  <div style={{ padding: '12px', background: '#27272a', borderRadius: '8px 0 0 8px', color: '#a1a1aa' }}>careergpt.com/u/</div>
                  <input value={portfolio.public_slug} onChange={e => setPortfolio({...portfolio, public_slug: e.target.value})} placeholder="username" style={{ flex: 1, padding: '12px', background: '#18181b', border: '1px solid #27272a', borderRadius: '0 8px 8px 0', color: '#fff' }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '8px', color: '#a1a1aa' }}>Location</label>
                <input value={portfolio.location} onChange={e => setPortfolio({...portfolio, location: e.target.value})} placeholder="e.g. San Francisco, CA" style={{ width: '100%', padding: '12px', background: '#18181b', border: '1px solid #27272a', borderRadius: '8px', color: '#fff' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '8px', color: '#a1a1aa' }}>Bio</label>
                <textarea value={form.bio} onChange={e => setForm({...form, bio: e.target.value})} placeholder="Tell us about yourself..." style={{ width: '100%', padding: '12px', background: '#18181b', border: '1px solid #27272a', borderRadius: '8px', color: '#fff', minHeight: '100px' }} />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Education */}
        {step === 1 && (
          <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
            <h2 style={{ fontSize: '2rem', marginBottom: '8px' }}>Education & Career Goals</h2>
            
            <div style={{ background: '#18181b', padding: '24px', borderRadius: '12px', marginBottom: '24px', border: '1px solid #27272a' }}>
              <h3 style={{ marginTop: 0, marginBottom: '20px', fontSize: '1.2rem' }}>Career Targets</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '8px', color: '#a1a1aa' }}>Academic Branch</label>
                  <select value={form.branch} onChange={e => setForm({...form, branch: e.target.value})} style={{ width: '100%', padding: '12px', background: '#09090b', border: '1px solid #27272a', borderRadius: '8px', color: '#fff' }}>
                    <option value="">Select Branch</option>
                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '8px', color: '#a1a1aa' }}>Target Domain</label>
                  <select value={form.target_domain} onChange={e => setForm({...form, target_domain: e.target.value})} style={{ width: '100%', padding: '12px', background: '#09090b', border: '1px solid #27272a', borderRadius: '8px', color: '#fff' }}>
                    <option value="">Select Domain</option>
                    {domains.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Education History</h3>
              <button onClick={() => addArrayItem('educations', { institution: '', degree: '', department: '', start_year: '', end_year: '' })} style={{ padding: '8px 16px', background: 'rgba(56,189,248,0.1)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.2)', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}><Plus size={16} /> Add Degree</button>
            </div>
            
            {portfolio.educations.map((edu, idx) => (
              <div key={idx} style={{ background: '#18181b', padding: '20px', borderRadius: '12px', marginBottom: '16px', position: 'relative', border: '1px solid #27272a' }}>
                <button onClick={() => removeArrayItem('educations', idx)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={20} /></button>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <input value={edu.institution} onChange={e => updateArrayItem('educations', idx, 'institution', e.target.value)} placeholder="Institution Name" style={{ padding: '12px', background: '#09090b', border: '1px solid #27272a', borderRadius: '8px', color: '#fff' }} />
                  <input value={edu.degree} onChange={e => updateArrayItem('educations', idx, 'degree', e.target.value)} placeholder="Degree (e.g. B.Tech)" style={{ padding: '12px', background: '#09090b', border: '1px solid #27272a', borderRadius: '8px', color: '#fff' }} />
                  <input value={edu.start_year} onChange={e => updateArrayItem('educations', idx, 'start_year', e.target.value)} placeholder="Start Year" style={{ padding: '12px', background: '#09090b', border: '1px solid #27272a', borderRadius: '8px', color: '#fff' }} />
                  <input value={edu.end_year} onChange={e => updateArrayItem('educations', idx, 'end_year', e.target.value)} placeholder="End Year" style={{ padding: '12px', background: '#09090b', border: '1px solid #27272a', borderRadius: '8px', color: '#fff' }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Step 3: Skills & Experience */}
        {step === 2 && (
          <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
            <h2 style={{ fontSize: '2rem', marginBottom: '8px' }}>Skills & Experience</h2>
            
            <div style={{ marginBottom: '40px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Work Experience</h3>
                <button onClick={() => addArrayItem('experiences', { role: '', company: '', start_date: '', description: '' })} style={{ padding: '8px 16px', background: 'rgba(56,189,248,0.1)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.2)', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}><Plus size={16} /> Add Experience</button>
              </div>
              {portfolio.experiences.map((exp, idx) => (
                <div key={idx} style={{ background: '#18181b', padding: '20px', borderRadius: '12px', marginBottom: '16px', position: 'relative', border: '1px solid #27272a' }}>
                  <button onClick={() => removeArrayItem('experiences', idx)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={20} /></button>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    <input value={exp.role} onChange={e => updateArrayItem('experiences', idx, 'role', e.target.value)} placeholder="Job Role" style={{ padding: '12px', background: '#09090b', border: '1px solid #27272a', borderRadius: '8px', color: '#fff' }} />
                    <input value={exp.company} onChange={e => updateArrayItem('experiences', idx, 'company', e.target.value)} placeholder="Company Name" style={{ padding: '12px', background: '#09090b', border: '1px solid #27272a', borderRadius: '8px', color: '#fff' }} />
                  </div>
                  <textarea value={exp.description} onChange={e => updateArrayItem('experiences', idx, 'description', e.target.value)} placeholder="Description..." style={{ width: '100%', padding: '12px', background: '#09090b', border: '1px solid #27272a', borderRadius: '8px', color: '#fff' }} />
                </div>
              ))}
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Featured Projects</h3>
                <button onClick={() => addArrayItem('projects', { title: '', description: '', repo_url: '' })} style={{ padding: '8px 16px', background: 'rgba(56,189,248,0.1)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.2)', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}><Plus size={16} /> Add Project</button>
              </div>
              {portfolio.projects.map((proj, idx) => (
                <div key={idx} style={{ background: '#18181b', padding: '20px', borderRadius: '12px', marginBottom: '16px', position: 'relative', border: '1px solid #27272a' }}>
                  <button onClick={() => removeArrayItem('projects', idx)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={20} /></button>
                  <input value={proj.title} onChange={e => updateArrayItem('projects', idx, 'title', e.target.value)} placeholder="Project Title" style={{ width: '100%', padding: '12px', background: '#09090b', border: '1px solid #27272a', borderRadius: '8px', color: '#fff', marginBottom: '16px' }} />
                  <textarea value={proj.description} onChange={e => updateArrayItem('projects', idx, 'description', e.target.value)} placeholder="Project Description..." style={{ width: '100%', padding: '12px', background: '#09090b', border: '1px solid #27272a', borderRadius: '8px', color: '#fff', marginBottom: '16px' }} />
                  <input value={proj.repo_url} onChange={e => updateArrayItem('projects', idx, 'repo_url', e.target.value)} placeholder="Repository URL (e.g. GitHub)" style={{ width: '100%', padding: '12px', background: '#09090b', border: '1px solid #27272a', borderRadius: '8px', color: '#fff' }} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: External Platforms */}
        {step === 3 && (
          <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
            <h2 style={{ fontSize: '2rem', marginBottom: '8px' }}>External Coding Profiles</h2>
            <p style={{ color: '#a1a1aa', marginBottom: '32px' }}>Link your LeetCode, Codeforces, GitHub, and more to show off your stats on your portfolio.</p>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
              <button onClick={() => addArrayItem('external_platforms', { platform_name: 'LeetCode', username: '', profile_url: '' })} style={{ padding: '8px 16px', background: 'rgba(56,189,248,0.1)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.2)', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}><Plus size={16} /> Add Platform</button>
            </div>

            {portfolio.external_platforms.map((plat, idx) => (
              <div key={idx} style={{ background: '#18181b', padding: '20px', borderRadius: '12px', marginBottom: '16px', position: 'relative', border: '1px solid #27272a' }}>
                <button onClick={() => removeArrayItem('external_platforms', idx)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={20} /></button>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px' }}>
                  <select value={plat.platform_name} onChange={e => updateArrayItem('external_platforms', idx, 'platform_name', e.target.value)} style={{ padding: '12px', background: '#09090b', border: '1px solid #27272a', borderRadius: '8px', color: '#fff' }}>
                    <option value="GitHub">GitHub</option>
                    <option value="LeetCode">LeetCode</option>
                    <option value="Codeforces">Codeforces</option>
                    <option value="HackerRank">HackerRank</option>
                    <option value="CodeChef">CodeChef</option>
                  </select>
                  <input value={plat.username} onChange={e => {
                    updateArrayItem('external_platforms', idx, 'username', e.target.value);
                    let url = '';
                    if (plat.platform_name === 'GitHub') url = `https://github.com/${e.target.value}`;
                    if (plat.platform_name === 'LeetCode') url = `https://leetcode.com/${e.target.value}`;
                    updateArrayItem('external_platforms', idx, 'profile_url', url);
                  }} placeholder="Username" style={{ padding: '12px', background: '#09090b', border: '1px solid #27272a', borderRadius: '8px', color: '#fff' }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Step 5: Resume & Visibility */}
        {step === 4 && (
          <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
            <h2 style={{ fontSize: '2rem', marginBottom: '8px' }}>Resume & Visibility</h2>
            <p style={{ color: '#a1a1aa', marginBottom: '32px' }}>Upload your resume to extract skills and configure what the world sees.</p>
            
            <div style={{ background: '#18181b', padding: '32px', borderRadius: '12px', border: '2px dashed #3f3f46', textAlign: 'center', marginBottom: '40px' }}>
              <Upload size={40} color="#a1a1aa" style={{ marginBottom: '16px' }} />
              <h3 style={{ margin: '0 0 8px' }}>Upload your Resume</h3>
              <p style={{ color: '#a1a1aa', fontSize: '0.9rem', marginBottom: '24px' }}>PDF or DOCX format. We will extract your baseline skills.</p>
              <label style={{ padding: '12px 24px', background: '#38bdf8', color: '#0f172a', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
                {uploadingResume ? 'Uploading...' : uploadedResume ? 'Resume Uploaded!' : 'Select File'}
                <input type="file" hidden accept=".pdf,.docx" onChange={handleResumeUpload} disabled={uploadingResume} />
              </label>
            </div>

            <div style={{ background: '#18181b', padding: '24px', borderRadius: '12px', border: '1px solid #27272a' }}>
              <h3 style={{ margin: '0 0 20px', display: 'flex', alignItems: 'center', gap: '8px' }}><Eye size={20} color="#38bdf8" /> Portfolio Visibility</h3>
              
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: '#09090b', borderRadius: '8px', marginBottom: '12px' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>Public Portfolio</div>
                  <div style={{ fontSize: '0.85rem', color: '#a1a1aa' }}>Allow anyone with your link to view your profile.</div>
                </div>
                <input type="checkbox" checked={portfolio.is_public} onChange={e => setPortfolio({...portfolio, is_public: e.target.checked})} style={{ width: '20px', height: '20px' }} />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: '#09090b', borderRadius: '8px' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>Show Resume Download</div>
                  <div style={{ fontSize: '0.85rem', color: '#a1a1aa' }}>Allow visitors to download your uploaded resume.</div>
                </div>
                <input type="checkbox" checked={portfolio.show_resume} onChange={e => setPortfolio({...portfolio, show_resume: e.target.checked})} style={{ width: '20px', height: '20px' }} />
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '40px', paddingTop: '20px', borderTop: '1px solid #27272a' }}>
          <button 
            onClick={() => setStep(s => {
              const prev = Math.max(0, s - 1);
              localStorage.setItem('careergpt_setup_step', prev.toString());
              return prev;
            })}
            disabled={step === 0}
            style={{ padding: '12px 24px', background: 'transparent', color: step === 0 ? '#52525b' : '#fff', border: 'none', display: 'flex', alignItems: 'center', gap: '8px', cursor: step === 0 ? 'not-allowed' : 'pointer' }}>
            <ChevronLeft size={20} /> Back
          </button>
          
          {step < 4 ? (
            <button 
              onClick={handleContinue}
              style={{ padding: '12px 24px', background: '#38bdf8', color: '#0f172a', border: 'none', borderRadius: '8px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              Continue <ChevronRight size={20} />
            </button>
          ) : (
            <button 
              onClick={submit}
              disabled={loading}
              style={{ padding: '12px 32px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', cursor: loading ? 'wait' : 'pointer' }}>
              {loading ? <EmojiLoadingBar /> : <><CheckCircle size={20} /> Complete Setup</>}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
