import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard, User, Brain, Map, Cpu, GraduationCap,
  LogOut, Menu, X, Sparkles, ChevronRight, Award, Compass, ShieldCheck,
  CheckCircle2, Target, BookOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AppFooter from '../components/AppFooter';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/intelligence', icon: Sparkles, label: 'Intelligence', isHighlight: true },
  { to: '/competency', icon: Brain, label: 'Competency' },
  { to: '/interview', icon: Cpu, label: 'Interview' },
  { to: '/learning', icon: Target, label: 'Learning' },
  { to: '/roadmaps', icon: Map, label: 'Explore' },
  { to: '/roadmap', icon: BookOpen, label: 'Roadmap' },
];


export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    setMobileMenuOpen(false);
    logout();
    navigate('/');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg-base)' }}>
      
      {/* ── Top Navbar (Sticky on all screen sizes) ── */}
      <header
        className="navbar-header-container"
        style={{
          position: 'relative',
          zIndex: 1000,
          background: '#ffffff',
          borderBottom: 'var(--border-ultra-thin)',
          boxShadow: '0 2px 12px rgba(15, 23, 42, 0.04)',
          padding: '12px 28px'
        }}
      >
        <div style={{ maxWidth: 1440, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          
          {/* Brand Logo */}
          <div 
            onClick={() => navigate('/dashboard')}
            style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none', flexShrink: 0 }}
          >
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(234, 88, 12, 0.25)',
              flexShrink: 0
            }}>
              <GraduationCap size={22} color="#ffffff" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: '1.35rem',
                  fontWeight: 800,
                  letterSpacing: '0.04em',
                  color: 'var(--text-primary)',
                  lineHeight: 1
                }}>
                  CAREER<span style={{ color: 'var(--color-primary)' }}>GPT</span>
                </span>
                <span className="tag-pill tag-pink" style={{ fontSize: '0.62rem', padding: '2px 6px', fontWeight: 700 }}>
                  v2.6
                </span>
              </div>
              <span className="brand-subtitle font-niconne-violet" style={{ fontSize: '0.9rem', marginTop: 1, lineHeight: 1 }}>
                Agentic Placement Mentoring
              </span>
            </div>
          </div>

          {/* Laptop & Desktop Navigation Links (>= 1025px) */}
          <nav className="navbar-desktop-nav" style={{ gap: 4 }}>
            {navItems.map(({ to, icon: Icon, label, isHighlight }) => (
              <NavLink
                key={to}
                to={to}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: isHighlight ? '7px 12px' : '7px 10px',
                  borderRadius: 8,
                  textDecoration: 'none',
                  fontSize: '0.82rem',
                  fontWeight: isActive ? 700 : 600,
                  fontFamily: 'var(--font-tech)',
                  color: isActive
                    ? (isHighlight ? '#ffffff' : 'var(--color-primary-dark)')
                    : 'var(--text-secondary)',
                  background: isActive
                    ? (isHighlight ? 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)' : 'var(--color-orange-soft)')
                    : (isHighlight ? '#fff7ed' : 'transparent'),
                  border: isActive
                    ? (isHighlight ? '1px solid #ea580c' : '1px solid rgba(249, 115, 22, 0.25)')
                    : (isHighlight ? '1px solid #fed7aa' : '1px solid transparent'),
                  boxShadow: (isActive && isHighlight) ? '0 2px 8px rgba(234, 88, 12, 0.25)' : 'none',
                  transition: 'all 0.2s ease',
                  whiteSpace: 'nowrap'
                })}
              >
                <Icon size={16} />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>

          {/* Laptop & Desktop Right Section (>= 1025px) */}
          <div className="navbar-desktop-actions">
            {/* Live AI Status Badge */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: '#ecfdf5',
              padding: '5px 12px',
              borderRadius: 20,
              border: '1px solid rgba(16, 185, 129, 0.15)',
              whiteSpace: 'nowrap'
            }}>
              <div style={{
                width: 7, height: 7, borderRadius: '50%',
                background: '#10b981',
                boxShadow: '0 0 0 2px rgba(16, 185, 129, 0.3)'
              }} />
              <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-tech)', fontWeight: 700, color: '#047857' }}>
                AI Engine Online
              </span>
            </div>

            {/* Candidate User Pill */}
            <div
              onClick={() => navigate('/profile/setup')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 9,
                padding: '4px 6px 4px 12px',
                background: '#f8fafc',
                borderRadius: 30,
                border: 'var(--border-ultra-thin)',
                cursor: 'pointer',
                userSelect: 'none'
              }}
            >
              <div style={{ textAlign: 'right', lineHeight: 1.1 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, fontFamily: 'var(--font-tech)', color: 'var(--text-primary)' }}>
                  {user?.full_name || user?.username || 'Candidate'}
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                  B.Tech Candidate
                </div>
              </div>
              <div style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 6px rgba(37, 99, 235, 0.25)',
                flexShrink: 0
              }}>
                {(user?.full_name || user?.username || 'C')[0].toUpperCase()}
              </div>
            </div>

            {/* Sign Out Button */}
            <button
              onClick={handleLogout}
              className="btn btn-secondary btn-sm"
              title="Sign Out"
              style={{ padding: '7px 12px', borderRadius: 8, whiteSpace: 'nowrap' }}
            >
              <LogOut size={14} />
              <span>EXIT</span>
            </button>
          </div>

          {/* Mobile & Tablet Hamburger Button (< 1025px) */}
          <button
            className="navbar-mobile-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
            style={{
              background: mobileMenuOpen ? '#fff7ed' : '#ffffff',
              border: `1px solid ${mobileMenuOpen ? '#fdba74' : '#e2e8f0'}`,
              borderRadius: 10,
              width: 42,
              height: 42,
              color: mobileMenuOpen ? '#ea580c' : '#0f172a',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              flexShrink: 0
            }}
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>

        </div>
      </header>

      {/* ── Mobile & Tablet Slide-Down Drawer (< 1025px) ── */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            style={{
              position: 'sticky',
              top: 65,
              zIndex: 999,
              background: '#ffffff',
              borderBottom: '1px solid #e2e8f0',
              boxShadow: '0 12px 28px rgba(15, 23, 42, 0.1)',
              overflow: 'hidden'
            }}
          >
            <div style={{ padding: '20px 20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              
              {/* User Identity Card in Drawer */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                background: '#f8fafc',
                borderRadius: 14,
                border: '1px solid #e2e8f0'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 38,
                    height: 38,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {(user?.full_name || user?.username || 'C')[0].toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>
                      {user?.full_name || user?.username || 'Candidate'}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                      {user?.email || 'Engineering Student'}
                    </div>
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  background: '#ecfdf5',
                  padding: '4px 10px',
                  borderRadius: 14,
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: '#047857'
                }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
                  <span>ONLINE</span>
                </div>
              </div>

              {/* Navigation Items List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {navItems.map(({ to, icon: Icon, label, isHighlight }) => {
                  const isActive = location.pathname === to;
                  return (
                    <NavLink
                      key={to}
                      to={to}
                      onClick={() => setMobileMenuOpen(false)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 16px',
                        borderRadius: 12,
                        textDecoration: 'none',
                        fontSize: '0.92rem',
                        fontWeight: isActive ? 800 : 600,
                        fontFamily: 'var(--font-tech)',
                        color: isActive ? '#ea580c' : '#334155',
                        background: isActive ? '#fff7ed' : '#ffffff',
                        border: `1px solid ${isActive ? '#fed7aa' : 'transparent'}`,
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <Icon size={19} color={isActive ? '#ea580c' : '#64748b'} />
                        <span>{label}</span>
                      </div>
                      <ChevronRight size={16} color={isActive ? '#ea580c' : '#94a3b8'} />
                    </NavLink>
                  );
                })}
              </div>

              {/* Sign Out Action Button */}
              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 10 }}>
                <button
                  onClick={handleLogout}
                  className="btn btn-secondary"
                  style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
                >
                  <LogOut size={16} /> Sign Out of CareerGPT
                </button>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main Page Content ── */}
      <main className="app-main-content" style={{ flex: 1, padding: '28px', maxWidth: 1440, width: '100%', margin: '0 auto' }}>
        <Outlet />
      </main>

      {/* ── Mobile Persistent Bottom Navigation Dock (<= 768px) ── */}
      <nav className="mobile-bottom-dock" aria-label="Mobile Navigation Dock">
        {[
          { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
          { to: '/intelligence', icon: Sparkles, label: 'Intelligence' },
          { to: '/interview', icon: Cpu, label: 'Interview', isPrimary: true },
          { to: '/roadmap', icon: Map, label: 'Roadmap' },
          { to: '/profile/setup', icon: User, label: 'Profile' },
        ].map(({ to, icon: Icon, label, isPrimary }) => {
          const isActive = location.pathname === to;
          
          if (isPrimary) {
            return (
              <NavLink
                key={to}
                to={to}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textDecoration: 'none',
                  marginTop: -16,
                  position: 'relative'
                }}
              >
                <div style={{
                  width: 50,
                  height: 50,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 6px 16px rgba(234, 88, 12, 0.4)',
                  border: '3px solid #ffffff'
                }}>
                  <Icon size={24} color="#ffffff" />
                </div>
                <span style={{
                  fontSize: '0.68rem',
                  fontFamily: 'var(--font-tech)',
                  fontWeight: 800,
                  color: isActive ? '#ea580c' : '#475569',
                  marginTop: 2
                }}>
                  {label}
                </span>
              </NavLink>
            );
          }

          return (
            <NavLink
              key={to}
              to={to}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 3,
                textDecoration: 'none',
                padding: '6px 10px',
                color: isActive ? '#ea580c' : '#64748b',
                transition: 'all 0.15s ease'
              }}
            >
              <Icon size={20} color={isActive ? '#ea580c' : '#64748b'} />
              <span style={{
                fontSize: '0.68rem',
                fontFamily: 'var(--font-tech)',
                fontWeight: isActive ? 800 : 600,
                color: isActive ? '#ea580c' : '#64748b'
              }}>
                {label}
              </span>
            </NavLink>
          );
        })}
      </nav>

      {/* ── Modern, Clean Footer ── */}
      <AppFooter />

    </div>
  );
}
