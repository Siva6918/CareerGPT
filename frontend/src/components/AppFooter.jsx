import { Link } from 'react-router-dom';
import { GraduationCap, Heart } from 'lucide-react';
import { FaLinkedin, FaGithub, FaGlobe } from 'react-icons/fa';

export default function AppFooter() {
  return (
    <footer 
      className="app-footer-wrapper"
      style={{
        background: '#ea580c', // Solid orange for logged-in consistency
        color: '#ffffff',
        padding: '48px 24px 24px',
        width: '100%',
        marginTop: 'auto' // Pushes footer to bottom in flex layouts
      }}
    >
      <div 
        style={{
          maxWidth: 1440,
          margin: '0 auto',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '32px',
          justifyContent: 'space-between',
          marginBottom: '40px'
        }}
      >
        {/* Brand & Mission Section */}
        <div style={{ flex: '2 1 260px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: '#ffffff',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <GraduationCap size={20} color="#ea580c" />
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 'clamp(1.15rem, 3.5vw, 1.5rem)', lineHeight: 1 }}>
                <span style={{ color: '#ffffff' }}>CAREER</span><span style={{ color: '#fde047' }}>GPT</span>
              </div>
              <div className="font-niconne" style={{ fontSize: '1.05rem', color: '#67e8f9', marginTop: 2 }}>
                Agentic Placement Mentoring
              </div>
            </div>
          </div>
          <p style={{ fontSize: '0.95rem', lineHeight: 1.5, color: '#f1f5f9', fontFamily: 'var(--font-body)', margin: 0, maxWidth: 300 }}>
            Your personalized AI career engine. Track competency, close gaps, and get placed.
          </p>
        </div>

        {/* Application Navigation */}
        <div style={{ flex: '1 1 120px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem', fontWeight: 700, letterSpacing: '0.05em' }}>
            CAREERGPT
          </h4>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontFamily: 'var(--font-body)', fontSize: '0.95rem' }}>
            <Link to="/dashboard" style={{ color: '#ffffff', textDecoration: 'none' }}>Dashboard</Link>
            <Link to="/profile/setup" style={{ color: '#ffffff', textDecoration: 'none' }}>Profile</Link>
            <Link to="/roadmap" style={{ color: '#ffffff', textDecoration: 'none' }}>Career Roadmap</Link>
            <Link to="/learning" style={{ color: '#ffffff', textDecoration: 'none' }}>My Learning</Link>
          </nav>
        </div>

        {/* Career Intelligence */}
        <div style={{ flex: '1 1 140px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem', fontWeight: 700, letterSpacing: '0.05em' }}>
            INTELLIGENCE
          </h4>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontFamily: 'var(--font-body)', fontSize: '0.95rem' }}>
            <Link to="/competency" style={{ color: '#ffffff', textDecoration: 'none' }}>Competency Graph</Link>
            <Link to="/interview" style={{ color: '#ffffff', textDecoration: 'none' }}>AI Interview</Link>
            <Link to="/intelligence" style={{ color: '#ffffff', textDecoration: 'none' }}>Skill Gap</Link>
            <Link to="/intelligence" style={{ color: '#ffffff', textDecoration: 'none' }}>Readiness</Link>
          </nav>
        </div>

        {/* Developers Section */}
        <div style={{ flex: '1 1 180px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem', fontWeight: 700, letterSpacing: '0.05em' }}>
            DEVELOPERS
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontFamily: 'var(--font-body)', fontSize: '0.95rem' }}>
            <a href="https://linkedin.com/in/venkatasiva-reddy/" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#ffffff', textDecoration: 'none' }}>
              <span style={{ width: 24, height: 24, borderRadius: '50%', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0077b5' }}><FaLinkedin size={14} /></span>
              Venkata Siva Reddy
            </a>
            <a href="https://www.linkedin.com/in/tasleem-shaik-/" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#ffffff', textDecoration: 'none' }}>
              <span style={{ width: 24, height: 24, borderRadius: '50%', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0077b5' }}><FaLinkedin size={14} /></span>
              Tasleem Shaik
            </a>
            <a href="https://www.linkedin.com/in/shaik-tayyibah/" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#ffffff', textDecoration: 'none' }}>
              <span style={{ width: 24, height: 24, borderRadius: '50%', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0077b5' }}><FaLinkedin size={14} /></span>
              Shaik Tayyibah
            </a>
          </div>
        </div>

        {/* Connect Section */}
        <div style={{ flex: '1 1 120px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem', fontWeight: 700, letterSpacing: '0.05em' }}>
            CONNECT
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontFamily: 'var(--font-body)', fontSize: '0.95rem' }}>
            <a href="mailto:support@careergpt.com" style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#ffffff', textDecoration: 'none' }}>Support</a>
            <a href="https://github.com/Siva6918/" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#ffffff', textDecoration: 'none' }}>
              <span style={{ width: 24, height: 24, borderRadius: '50%', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#24292e' }}><FaGithub size={14} /></span>
              GitHub
            </a>
            <a href="https://portfolio-azure-theta-94.vercel.app/" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#ffffff', textDecoration: 'none' }}>
              <span style={{ width: 24, height: 24, borderRadius: '50%', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}><FaGlobe size={14} /></span>
              Portfolio
            </a>
          </div>
        </div>
      </div>

      {/* Footer Bottom */}
      <div 
        style={{
          borderTop: '1px solid rgba(255, 255, 255, 0.2)',
          paddingTop: '20px',
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px',
          maxWidth: 1440,
          margin: '0 auto',
          fontFamily: 'var(--font-body)',
          fontSize: '0.85rem'
        }}
      >
        <span style={{ color: '#ffedd5' }}>&copy; {new Date().getFullYear()} CareerGPT. All rights reserved.</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#fed7aa' }}>
          Made with <Heart size={14} fill="#fed7aa" /> for Engineering Students
        </div>
      </div>
    </footer>
  );
}
