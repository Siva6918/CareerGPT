import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { GraduationCap, UserPlus, X, AlertCircle } from 'lucide-react';

export default function RegisterModal({ onClose, onSwitchToLogin }) {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: '', username: '', password: '', full_name: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(form);
      toast.success('Account created! Welcome to CareerGPT');
      navigate('/profile/setup');
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Registration failed. Please check your information.';
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      width: '100%',
      maxWidth: 460,
      background: '#ffffff',
      borderRadius: 24,
      padding: '36px 36px',
      position: 'relative',
      boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25), 0 0 0 1px rgba(15, 23, 42, 0.08)',
      animation: 'fadeUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
    }}>
      {onClose && (
        <button
          onClick={onClose}
          aria-label="Close modal"
          style={{
            position: 'absolute',
            top: 20,
            right: 20,
            background: '#f1f5f9',
            border: 'none',
            borderRadius: '50%',
            width: 32,
            height: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#64748b',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#e2e8f0';
            e.currentTarget.style.color = '#0f172a';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#f1f5f9';
            e.currentTarget.style.color = '#64748b';
          }}
        >
          <X size={18} />
        </button>
      )}

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{
          width: 58,
          height: 58,
          borderRadius: 16,
          background: '#fff7ed',
          border: '1px solid #fed7aa',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 14px',
          boxShadow: '0 4px 12px rgba(249, 115, 22, 0.12)'
        }}>
          <GraduationCap size={30} color="#ea580c" />
        </div>
        <h1 style={{
          fontSize: '1.75rem',
          fontWeight: 800,
          color: '#0f172a',
          margin: '0 0 6px',
          fontFamily: 'var(--font-heading)',
          letterSpacing: '-0.02em'
        }}>
          CREATE ACCOUNT
        </h1>
        <p style={{
          fontSize: '0.875rem',
          color: '#64748b',
          margin: 0,
          fontFamily: 'var(--font-body)',
          lineHeight: 1.5
        }}>
          Join CareerGPT — AI Career Mentoring & Placement Readiness
        </p>
      </div>

      {/* High-Visibility Error Banner */}
      {error && (
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
          background: '#fef2f2',
          border: '1px solid #fca5a5',
          borderRadius: 12,
          padding: '12px 16px',
          marginBottom: 18,
          boxShadow: '0 2px 8px rgba(239, 68, 68, 0.08)'
        }}>
          <AlertCircle size={20} color="#dc2626" style={{ flexShrink: 0, marginTop: 1 }} />
          <div style={{ flex: 1, fontSize: '0.875rem', color: '#991b1b', fontWeight: 600, lineHeight: 1.4 }}>
            {error}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label style={{
            display: 'block',
            fontSize: '0.78rem',
            fontFamily: 'var(--font-tech)',
            fontWeight: 700,
            color: '#334155',
            letterSpacing: '0.04em',
            marginBottom: 4
          }}>
            FULL NAME
          </label>
          <input
            type="text"
            placeholder="John Doe"
            value={form.full_name}
            onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))}
            id="full_name"
            style={{
              width: '100%',
              padding: '10px 14px',
              fontSize: '0.92rem',
              color: '#0f172a',
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: 10,
              outline: 'none',
              boxSizing: 'border-box',
              transition: 'border-color 0.2s, box-shadow 0.2s, background 0.2s'
            }}
            onFocus={(e) => {
              e.target.style.background = '#ffffff';
              e.target.style.borderColor = '#f97316';
              e.target.style.boxShadow = '0 0 0 3px rgba(249, 115, 22, 0.15)';
            }}
            onBlur={(e) => {
              e.target.style.background = '#f8fafc';
              e.target.style.borderColor = '#cbd5e1';
              e.target.style.boxShadow = 'none';
            }}
          />
        </div>

        <div>
          <label style={{
            display: 'block',
            fontSize: '0.78rem',
            fontFamily: 'var(--font-tech)',
            fontWeight: 700,
            color: '#334155',
            letterSpacing: '0.04em',
            marginBottom: 4
          }}>
            USERNAME
          </label>
          <input
            type="text"
            placeholder="johndoe_2026"
            value={form.username}
            onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
            required
            id="username"
            style={{
              width: '100%',
              padding: '10px 14px',
              fontSize: '0.92rem',
              color: '#0f172a',
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: 10,
              outline: 'none',
              boxSizing: 'border-box',
              transition: 'border-color 0.2s, box-shadow 0.2s, background 0.2s'
            }}
            onFocus={(e) => {
              e.target.style.background = '#ffffff';
              e.target.style.borderColor = '#f97316';
              e.target.style.boxShadow = '0 0 0 3px rgba(249, 115, 22, 0.15)';
            }}
            onBlur={(e) => {
              e.target.style.background = '#f8fafc';
              e.target.style.borderColor = '#cbd5e1';
              e.target.style.boxShadow = 'none';
            }}
          />
        </div>

        <div>
          <label style={{
            display: 'block',
            fontSize: '0.78rem',
            fontFamily: 'var(--font-tech)',
            fontWeight: 700,
            color: '#334155',
            letterSpacing: '0.04em',
            marginBottom: 4
          }}>
            EMAIL ADDRESS
          </label>
          <input
            type="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
            required
            id="email"
            style={{
              width: '100%',
              padding: '10px 14px',
              fontSize: '0.92rem',
              color: '#0f172a',
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: 10,
              outline: 'none',
              boxSizing: 'border-box',
              transition: 'border-color 0.2s, box-shadow 0.2s, background 0.2s'
            }}
            onFocus={(e) => {
              e.target.style.background = '#ffffff';
              e.target.style.borderColor = '#f97316';
              e.target.style.boxShadow = '0 0 0 3px rgba(249, 115, 22, 0.15)';
            }}
            onBlur={(e) => {
              e.target.style.background = '#f8fafc';
              e.target.style.borderColor = '#cbd5e1';
              e.target.style.boxShadow = 'none';
            }}
          />
        </div>

        <div>
          <label style={{
            display: 'block',
            fontSize: '0.78rem',
            fontFamily: 'var(--font-tech)',
            fontWeight: 700,
            color: '#334155',
            letterSpacing: '0.04em',
            marginBottom: 4
          }}>
            PASSWORD (MIN 6 CHARACTERS)
          </label>
          <input
            type="password"
            placeholder="••••••••"
            value={form.password}
            onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
            required
            minLength={6}
            id="password"
            style={{
              width: '100%',
              padding: '10px 14px',
              fontSize: '0.92rem',
              color: '#0f172a',
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: 10,
              outline: 'none',
              boxSizing: 'border-box',
              transition: 'border-color 0.2s, box-shadow 0.2s, background 0.2s'
            }}
            onFocus={(e) => {
              e.target.style.background = '#ffffff';
              e.target.style.borderColor = '#f97316';
              e.target.style.boxShadow = '0 0 0 3px rgba(249, 115, 22, 0.15)';
            }}
            onBlur={(e) => {
              e.target.style.background = '#f8fafc';
              e.target.style.borderColor = '#cbd5e1';
              e.target.style.boxShadow = 'none';
            }}
          />
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading}
          style={{
            marginTop: 8,
            width: '100%',
            padding: '13px',
            fontSize: '0.95rem',
            fontWeight: 700,
            borderRadius: 10,
            letterSpacing: '0.04em',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
            border: 'none',
            color: '#ffffff',
            boxShadow: '0 4px 14px rgba(234, 88, 12, 0.3)',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          <UserPlus size={18} />
          {loading ? 'CREATING ACCOUNT...' : 'CREATE ACCOUNT'}
        </button>
      </form>

      <div style={{ marginTop: 20, position: 'relative', textAlign: 'center' }}>
        <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, borderTop: '1px solid #e2e8f0', zIndex: 1 }}></div>
        <span style={{ position: 'relative', zIndex: 2, background: '#ffffff', padding: '0 12px', fontSize: '0.8rem', color: '#94a3b8' }}>OR</span>
      </div>

      <button onClick={() => toast.error("Google Login is not configured yet. Missing API Keys.", { icon: '⚠️' })} type="button" style={{ marginTop: 20, width: '100%', padding: '12px', fontSize: '0.95rem', fontWeight: 600, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, background: '#ffffff', border: '1px solid #cbd5e1', color: '#334155', cursor: 'pointer' }}>
        <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        Sign up with Google
      </button>

      {/* Switch to Login */}
      <div style={{
        textAlign: 'center',
        marginTop: 20,
        paddingTop: 16,
        borderTop: '1px solid #f1f5f9',
        fontSize: '0.875rem',
        color: '#64748b'
      }}>
        Already have an account?{' '}
        <button
          type="button"
          onClick={onSwitchToLogin}
          style={{
            background: 'none',
            border: 'none',
            color: '#ea580c',
            fontWeight: 700,
            cursor: 'pointer',
            padding: 0,
            fontFamily: 'inherit',
            fontSize: 'inherit',
            textDecoration: 'underline'
          }}
        >
          Sign In
        </button>
      </div>
    </div>
  );
}
