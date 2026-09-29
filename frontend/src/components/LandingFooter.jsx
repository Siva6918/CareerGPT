import { Link } from 'react-router-dom';
import { GraduationCap, Heart, Mail } from 'lucide-react';
import { FaLinkedin, FaGithub, FaInstagram, FaGlobe } from 'react-icons/fa';

export default function LandingFooter() {
  return (
    <footer 
      style={{
        background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
        color: '#ffffff',
        padding: '60px 24px 24px',
        width: '100%'
      }}
    >
      <div 
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '32px',
          justifyContent: 'space-between',
          marginBottom: '60px'
        }}
      >
        {/* Brand Section */}
        <div style={{ flex: '2 1 300px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: 42, height: 42, borderRadius: 12,
              background: '#ffffff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
            }}>
              <GraduationCap size={24} color="#ea580c" />
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1.9rem', lineHeight: 1 }}>
                <span style={{ color: '#ffffff' }}>CAREER</span><span style={{ color: '#fde047' }}>GPT</span>
              </div>
              <div className="font-niconne" style={{ fontSize: '1.2rem', color: '#67e8f9', marginTop: 2 }}>
                Agentic Placement Mentoring
              </div>
            </div>
          </div>
          <p style={{ fontSize: '1.05rem', lineHeight: 1.6, color: '#f1f5f9', maxWidth: 360, fontFamily: 'var(--font-body)' }}>
            CareerGPT is the agentic AI-based career mentoring and placement-readiness system that dynamically tracks engineering competency to build curated learning roadmaps.
          </p>
        </div>

        {/* Access Section */}
        <div style={{ flex: '1 1 140px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.3rem', fontWeight: 700, letterSpacing: '0.05em' }}>
            ACCESS
          </h4>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontFamily: 'var(--font-body)', fontSize: '1.05rem' }}>
            <Link to="/" style={{ color: '#ffffff', textDecoration: 'none', transition: 'color 0.2s' }}>Home</Link>
            <Link to="/login" style={{ color: '#ffffff', textDecoration: 'none', transition: 'color 0.2s' }}>Login to Portal</Link>
            <a href="mailto:support@careergpt.com" style={{ color: '#ffffff', textDecoration: 'none', transition: 'color 0.2s' }}>Support</a>
          </nav>
        </div>

        {/* Developers Section */}
        <div style={{ flex: '1 1 180px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.3rem', fontWeight: 700, letterSpacing: '0.05em' }}>
            DEVELOPERS
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontFamily: 'var(--font-body)', fontSize: '1.05rem' }}>
            <a 
              href="https://linkedin.com/in/venkatasiva-reddy/" 
              target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#ffffff', textDecoration: 'none' }}
            >
              <span style={{ width: 28, height: 28, borderRadius: '50%', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0077b5' }}><FaLinkedin size={16} /></span>
              Venkata Siva Reddy
            </a>
            <a 
              href="https://www.linkedin.com/in/tasleem-shaik-/" 
              target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#ffffff', textDecoration: 'none' }}
            >
              <span style={{ width: 28, height: 28, borderRadius: '50%', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0077b5' }}><FaLinkedin size={16} /></span>
              Tasleem Shaik
            </a>
            <a 
              href="https://www.linkedin.com/in/shaik-tayyibah/" 
              target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#ffffff', textDecoration: 'none' }}
            >
              <span style={{ width: 28, height: 28, borderRadius: '50%', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0077b5' }}><FaLinkedin size={16} /></span>
              Shaik Tayyibah
            </a>
          </div>
        </div>

        {/* Connect Section */}
        <div style={{ flex: '1 1 140px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.3rem', fontWeight: 700, letterSpacing: '0.05em' }}>
            CONNECT
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontFamily: 'var(--font-body)', fontSize: '1.05rem' }}>
            <a 
              href="https://github.com/Siva6918/" 
              target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#ffffff', textDecoration: 'none' }}
            >
              <span style={{ width: 28, height: 28, borderRadius: '50%', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#24292e' }}><FaGithub size={16} /></span>
              GitHub
            </a>
            <a 
              href="https://portfolio-azure-theta-94.vercel.app/" 
              target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#ffffff', textDecoration: 'none' }}
            >
              <span style={{ width: 28, height: 28, borderRadius: '50%', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}><FaGlobe size={16} /></span>
              Portfolio
            </a>
            <a 
              href="https://instagram.com/mr_siva_reddy_666" 
              target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#ffffff', textDecoration: 'none' }}
            >
              <span style={{ width: 28, height: 28, borderRadius: '50%', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#E1306C' }}><FaInstagram size={16} /></span>
              Instagram
            </a>
          </div>
        </div>
      </div>

      {/* Footer Bottom Row */}
      <div 
        style={{
          borderTop: '1px solid rgba(255, 255, 255, 0.2)',
          paddingTop: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          alignItems: 'center',
          fontFamily: 'var(--font-body)',
          fontSize: '0.95rem'
        }}
      >
        <div style={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: '24px', 
          justifyContent: 'center',
          width: '100%',
          maxWidth: 1200
        }}>
          <span>&copy; {new Date().getFullYear()} CareerGPT. All rights reserved.</span>
          <div style={{ display: 'flex', gap: '16px' }}>
            <Link to="/" style={{ color: '#ffedd5', textDecoration: 'none' }}>Privacy Policy</Link>
            <Link to="/" style={{ color: '#ffedd5', textDecoration: 'none' }}>Terms of Service</Link>
            <a href="mailto:support@careergpt.com" style={{ color: '#ffedd5', textDecoration: 'none' }}>Contact Support</a>
          </div>
        </div>
        <div className="font-croissant-pink" style={{ color: '#fed7aa', fontSize: '0.9rem', textAlign: 'center' }}>
          Empowering the next generation of engineers
        </div>
      </div>
    </footer>
  );
}
