import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { GraduationCap, Eye, EyeOff, LogIn, X, AlertCircle } from 'lucide-react';

export default function LoginModal({ onClose, onSwitchToRegister }) {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email, form.password);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Invalid email or password. Please verify your credentials.';
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      width: '100%',
      maxWidth: 440,
      background: '#ffffff',
      borderRadius: 24,
      padding: '40px 36px',
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
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{
          width: 58,
          height: 58,
          borderRadius: 16,
          background: '#fff7ed',
          border: '1px solid #fed7aa',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px',
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
          SIGN IN
        </h1>
        <p style={{
          fontSize: '0.875rem',
          color: '#64748b',
          margin: 0,
          fontFamily: 'var(--font-body)',
          lineHeight: 1.5
        }}>
          Access your personalized CareerGPT candidate portal
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
          marginBottom: 20,
          boxShadow: '0 2px 8px rgba(239, 68, 68, 0.08)'
        }}>
          <AlertCircle size={20} color="#dc2626" style={{ flexShrink: 0, marginTop: 1 }} />
          <div style={{ flex: 1, fontSize: '0.875rem', color: '#991b1b', fontWeight: 600, lineHeight: 1.4 }}>
            {error}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div>
          <label style={{
            display: 'block',
            fontSize: '0.78rem',
            fontFamily: 'var(--font-tech)',
            fontWeight: 700,
            color: '#334155',
            letterSpacing: '0.04em',
            marginBottom: 6
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
              padding: '12px 14px',
              fontSize: '0.95rem',
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <label style={{
              display: 'block',
              fontSize: '0.78rem',
              fontFamily: 'var(--font-tech)',
              fontWeight: 700,
              color: '#334155',
              letterSpacing: '0.04em'
            }}>
              PASSWORD
            </label>
            <button 
              type="button" 
              onClick={() => {
                if (!form.email) {
                  toast.error("Please enter your email address first.");
                  return;
                }
                toast.success("Password reset instructions sent to " + form.email);
              }}
              style={{
                background: 'none', border: 'none', padding: 0,
                fontSize: '0.78rem', color: '#ea580c', cursor: 'pointer',
                fontFamily: 'var(--font-body)', fontWeight: 600
              }}
            >
              Forgot password?
            </button>
          </div>
          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
              required
              id="password"
              style={{
                width: '100%',
                padding: '12px 42px 12px 14px',
                fontSize: '0.95rem',
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
            <button
              type="button"
              onClick={() => setShowPassword((p) => !p)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              style={{
                position: 'absolute',
                right: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#64748b',
                display: 'flex',
                alignItems: 'center',
                padding: 4
              }}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading}
          style={{
            marginTop: 8,
            width: '100%',
            padding: '14px',
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
          <LogIn size={18} />
          {loading ? 'VERIFYING CREDENTIALS...' : 'SIGN IN TO CAREERGPT'}
        </button>
      </form>

      {/* Switch to Register */}
      <div style={{
        textAlign: 'center',
        marginTop: 24,
        paddingTop: 18,
        borderTop: '1px solid #f1f5f9',
        fontSize: '0.875rem',
        color: '#64748b'
      }}>
        Don't have an account yet?{' '}
        <button
          type="button"
          onClick={onSwitchToRegister}
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
          Create Free Account
        </button>
      </div>
    </div>
  );
}
