import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { portfolioAPI } from '../services/api';
import { 
  Link as LinkIcon, Globe, MapPin, Mail, Award, BookOpen, 
  Briefcase, Code, Terminal, ExternalLink, Calendar, Star, GitFork 
} from 'lucide-react';

const LeetCodeIcon = () => <span style={{fontWeight: 900, color: '#f59e0b'}}>LC</span>;
const CodeforcesIcon = () => <span style={{fontWeight: 900, color: '#3b82f6'}}>CF</span>;

export default function PortfolioPage() {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    portfolioAPI.getPublic(slug)
      .then(res => {
        setData(res.data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.response?.data?.detail || "Portfolio not found.");
        setLoading(false);
      });
  }, [slug]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#09090b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#38bdf8', fontFamily: 'monospace', fontSize: '1.2rem' }}>
          &gt; Loading portfolio details...
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ minHeight: '100vh', background: '#09090b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
        <h2>{error}</h2>
      </div>
    );
  }

  const { user, basic_profile, portfolio, educations, experiences, certifications, external_platforms, projects } = data;

  return (
    <div style={{ minHeight: '100vh', background: '#09090b', color: '#f8fafc', fontFamily: 'Inter, sans-serif' }}>
      {/* Navbar */}
      <nav style={{ padding: '24px 5%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #27272a' }}>
        <div style={{ fontWeight: 800, fontSize: '1.2rem', letterSpacing: '-0.5px' }}>
          {user.full_name}<span style={{ color: '#38bdf8' }}>.dev</span>
        </div>
        <div style={{ display: 'flex', gap: '20px' }}>
          <a href="#about" style={{ color: '#a1a1aa', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 500 }}>About</a>
          <a href="#skills" style={{ color: '#a1a1aa', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 500 }}>Skills</a>
          <a href="#projects" style={{ color: '#a1a1aa', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 500 }}>Projects</a>
        </div>
      </nav>

      {/* Hero Section */}
      <header style={{ padding: '100px 5% 80px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-20%', right: '-10%', width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(56,189,248,0.15) 0%, rgba(0,0,0,0) 70%)', filter: 'blur(40px)', zIndex: 0 }} />
        <div style={{ position: 'relative', zIndex: 1, maxWidth: '800px' }}>
          <div style={{ display: 'inline-block', padding: '6px 12px', background: '#1e293b', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600, color: '#38bdf8', marginBottom: '24px', border: '1px solid #334155' }}>
            {basic_profile?.target_role || "Software Engineer"}
          </div>
          <h1 style={{ fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', fontWeight: 900, lineHeight: 1.1, margin: '0 0 24px', letterSpacing: '-1px' }}>
            Hi, I'm {user.full_name}.<br/>
            <span style={{ color: '#94a3b8' }}>{portfolio?.headline || "Building digital experiences."}</span>
          </h1>
          
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '32px', color: '#a1a1aa' }}>
            {portfolio?.location && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem' }}>
                <MapPin size={16} /> {portfolio.location}
              </span>
            )}
            {basic_profile?.college && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem' }}>
                <BookOpen size={16} /> {basic_profile.college} {basic_profile.year_of_study ? `(Year ${basic_profile.year_of_study})` : ''}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            {portfolio?.show_resume && (
              <button style={{ padding: '12px 24px', background: '#f8fafc', color: '#0f172a', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
                View Resume
              </button>
            )}
            {basic_profile?.github_url && portfolio?.show_github && (
              <a href={basic_profile.github_url} target="_blank" rel="noreferrer" style={{ padding: '12px', background: '#27272a', color: '#f8fafc', borderRadius: '8px', display: 'flex', alignItems: 'center' }}>
                <Globe size={20} />
              </a>
            )}
            {basic_profile?.linkedin_url && (
              <a href={basic_profile.linkedin_url} target="_blank" rel="noreferrer" style={{ padding: '12px', background: '#27272a', color: '#f8fafc', borderRadius: '8px', display: 'flex', alignItems: 'center' }}>
                <Globe size={20} />
              </a>
            )}
          </div>
        </div>
      </header>

      <main style={{ padding: '0 5% 100px', maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '80px' }}>
        
        {/* About & Skills */}
        <section id="about" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '40px' }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Terminal size={24} color="#38bdf8" /> About Me
            </h2>
            <p style={{ color: '#a1a1aa', lineHeight: 1.7, fontSize: '1.05rem' }}>
              {basic_profile?.bio || "I am a passionate developer eager to learn and build impactful software."}
            </p>
          </div>
          
          <div id="skills">
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Code size={24} color="#38bdf8" /> Technical Arsenal
            </h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {(basic_profile?.preferred_languages || []).map((lang, i) => (
                <span key={i} style={{ padding: '8px 16px', background: 'rgba(56,189,248,0.1)', color: '#38bdf8', borderRadius: '6px', fontSize: '0.9rem', fontWeight: 600, border: '1px solid rgba(56,189,248,0.2)' }}>
                  {lang}
                </span>
              ))}
              {(basic_profile?.preferred_technologies || []).map((tech, i) => (
                <span key={i} style={{ padding: '8px 16px', background: '#27272a', color: '#e4e4e7', borderRadius: '6px', fontSize: '0.9rem', fontWeight: 500, border: '1px solid #3f3f46' }}>
                  {tech.name || tech}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Coding Platforms */}
        {external_platforms?.length > 0 && (
          <section>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Award size={24} color="#38bdf8" /> Coding Profiles
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
              {external_platforms.map((plat, i) => (
                <a key={i} href={plat.profile_url} target="_blank" rel="noreferrer" style={{ 
                  display: 'block', padding: '24px', background: '#18181b', borderRadius: '12px', 
                  border: '1px solid #27272a', textDecoration: 'none', color: 'inherit',
                  transition: 'transform 0.2s', cursor: 'pointer'
                }} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-4px)'} onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    {plat.platform_name.toLowerCase() === 'leetcode' ? <LeetCodeIcon /> : 
                     plat.platform_name.toLowerCase() === 'codeforces' ? <CodeforcesIcon /> : 
                     <Globe size={24} color="#a1a1aa" />}
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>{plat.platform_name}</h3>
                  </div>
                  <div style={{ color: '#a1a1aa', fontSize: '0.9rem', marginBottom: '12px' }}>@{plat.username}</div>
                  
                  {/* Stats if available */}
                  {plat.stats_json && Object.keys(plat.stats_json).length > 0 ? (
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                      {Object.entries(plat.stats_json).map(([k, v]) => (
                        <div key={k} style={{ background: '#27272a', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', color: '#e4e4e7' }}>
                          <span style={{ color: '#a1a1aa', marginRight: '4px' }}>{k}:</span> {v}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.8rem', color: '#52525b' }}>Sync unavailable</div>
                  )}
                </a>
              ))}
            </div>
          </section>
        )}

        {/* Projects */}
        {projects?.length > 0 && (
          <section id="projects">
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Briefcase size={24} color="#38bdf8" /> Featured Projects
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
              {projects.filter(p => !p.is_hidden).map((proj, i) => (
                <div key={i} style={{ 
                  background: '#18181b', borderRadius: '12px', border: '1px solid #27272a', 
                  display: 'flex', flexDirection: 'column', height: '100%'
                }}>
                  <div style={{ padding: '24px', flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                      <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>{proj.title}</h3>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {proj.repo_url && <a href={proj.repo_url} target="_blank" rel="noreferrer" style={{ color: '#a1a1aa' }}><Globe size={20} /></a>}
                        {proj.demo_url && <a href={proj.demo_url} target="_blank" rel="noreferrer" style={{ color: '#a1a1aa' }}><ExternalLink size={20} /></a>}
                      </div>
                    </div>
                    <p style={{ color: '#a1a1aa', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '24px' }}>
                      {proj.description}
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
                      {(proj.languages || []).map((lang, idx) => (
                        <span key={idx} style={{ fontSize: '0.75rem', padding: '2px 8px', background: '#27272a', borderRadius: '12px', color: '#d4d4d8' }}>
                          {lang}
                        </span>
                      ))}
                    </div>
                  </div>
                  {(proj.stars > 0 || proj.forks > 0) && (
                    <div style={{ padding: '12px 24px', borderTop: '1px solid #27272a', display: 'flex', gap: '16px', fontSize: '0.85rem', color: '#a1a1aa' }}>
                      {proj.stars > 0 && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Star size={14} /> {proj.stars}</span>}
                      {proj.forks > 0 && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><GitFork size={14} /> {proj.forks}</span>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Experience & Education */}
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '40px' }}>
          {experiences?.length > 0 && (
            <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Briefcase size={24} color="#38bdf8" /> Experience
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {experiences.map((exp, i) => (
                  <div key={i} style={{ borderLeft: '2px solid #27272a', paddingLeft: '20px', position: 'relative' }}>
                    <div style={{ position: 'absolute', left: '-6px', top: '4px', width: '10px', height: '10px', borderRadius: '50%', background: '#38bdf8' }} />
                    <h3 style={{ margin: '0 0 4px', fontSize: '1.1rem', fontWeight: 600 }}>{exp.role}</h3>
                    <div style={{ color: '#a1a1aa', fontSize: '0.9rem', marginBottom: '8px' }}>{exp.company} • {exp.start_date} - {exp.is_current ? 'Present' : exp.end_date}</div>
                    <p style={{ margin: 0, color: '#d4d4d8', fontSize: '0.95rem' }}>{exp.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {educations?.length > 0 && (
            <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BookOpen size={24} color="#38bdf8" /> Education
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {educations.map((edu, i) => (
                  <div key={i} style={{ borderLeft: '2px solid #27272a', paddingLeft: '20px', position: 'relative' }}>
                    <div style={{ position: 'absolute', left: '-6px', top: '4px', width: '10px', height: '10px', borderRadius: '50%', background: '#a1a1aa' }} />
                    <h3 style={{ margin: '0 0 4px', fontSize: '1.1rem', fontWeight: 600 }}>{edu.institution}</h3>
                    <div style={{ color: '#e4e4e7', fontSize: '0.95rem', marginBottom: '4px' }}>{edu.degree} in {edu.department}</div>
                    <div style={{ color: '#a1a1aa', fontSize: '0.85rem' }}>{edu.start_year} - {edu.end_year} • Grade: {edu.grade}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

      </main>

      <footer style={{ textAlign: 'center', padding: '40px 20px', color: '#52525b', fontSize: '0.9rem', borderTop: '1px solid #27272a' }}>
        Built with <span style={{color: '#38bdf8'}}>CareerGPT</span>. 
      </footer>
    </div>
  );
}
