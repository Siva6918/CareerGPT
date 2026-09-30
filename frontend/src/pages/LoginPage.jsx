import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';
import { GraduationCap, Eye, EyeOff, LogIn, X, AlertCircle, Key, ArrowRight } from 'lucide-react';
import { useGoogleLogin } from '@react-oauth/google';

const InputField = ({ label, type, value, onChange, placeholder, id }) => (
  <div>
    <label style={{ display: 'block', fontSize: '0.78rem', fontFamily: 'var(--font-tech)', fontWeight: 700, color: '#334155', letterSpacing: '0.04em', marginBottom: 6 }}>
      {label}
    </label>
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      required
      id={id}
      style={{
        width: '100%', padding: '12px 14px', fontSize: '0.95rem', color: '#0f172a',
        background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 10,
        outline: 'none', boxSizing: 'border-box',
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
);

export default function LoginModal({ onClose, onSwitchToRegister }) {
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('login'); // login | forgot | reset
  const [form, setForm] = useState({ email: '', password: '', otp: '', newPassword: '' });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email, form.password);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Invalid email or password.';
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!form.email) {
      setError("Please enter your email address");
      return;
    }
    setError('');
    setLoading(true);
    try {
      await authAPI.forgotPassword(form.email);
      toast.success('OTP sent to your email!');
      setMode('reset');
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to send OTP.';
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!form.otp || !form.newPassword) {
      setError("Please fill all fields");
      return;
    }
    setError('');
    setLoading(true);
    try {
      await authAPI.resetPassword(form.email, form.otp, form.newPassword);
      toast.success('Password updated! Please log in.');
      setMode('login');
      setForm(p => ({ ...p, password: '', otp: '', newPassword: '' }));
    } catch (err) {
      const msg = err.response?.data?.detail || 'Invalid or expired OTP.';
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setError('');
      setLoading(true);
      try {
        await loginWithGoogle(tokenResponse.access_token);
        toast.success('Welcome back!');
        navigate('/dashboard');
      } catch (err) {
        const msg = err.response?.data?.detail || 'Google Login failed.';
        setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
      } finally {
        setLoading(false);
      }
    },
    onError: () => {
      toast.error('Google Login Failed');
    }
  });

  return (
    <div style={{
      width: '100%', maxWidth: 440, background: '#ffffff', borderRadius: 24,
      padding: '40px 36px', position: 'relative',
      boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25), 0 0 0 1px rgba(15, 23, 42, 0.08)',
      animation: 'fadeUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
    }}>
      {onClose && (
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 20, right: 20, background: '#f1f5f9', border: 'none',
            borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center',
            justifyContent: 'center', color: '#64748b', cursor: 'pointer'
          }}
        ><X size={18} /></button>
      )}

      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{
          width: 58, height: 58, borderRadius: 16, background: '#fff7ed', border: '1px solid #fed7aa',
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
        }}>
          <GraduationCap size={30} color="#ea580c" />
        </div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', margin: '0 0 6px', fontFamily: 'var(--font-heading)' }}>
          {mode === 'login' ? 'SIGN IN' : mode === 'forgot' ? 'RESET PASSWORD' : 'NEW PASSWORD'}
        </h1>
        <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0, fontFamily: 'var(--font-body)' }}>
          {mode === 'login' ? 'Access your personalized CareerGPT candidate portal' : 
           mode === 'forgot' ? 'Enter your email to receive a One-Time Password' : 
           'Enter your OTP and choose a new password'}
        </p>
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 12, padding: '12px 16px', marginBottom: 20 }}>
          <AlertCircle size={20} color="#dc2626" style={{ flexShrink: 0, marginTop: 1 }} />
          <div style={{ flex: 1, fontSize: '0.875rem', color: '#991b1b', fontWeight: 600 }}>{error}</div>
        </div>
      )}

      {mode === 'login' && (
        <>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <InputField label="EMAIL ADDRESS" type="email" value={form.email} onChange={(e) => setForm(p => ({...p, email: e.target.value}))} placeholder="you@example.com" />
            
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label style={{ fontSize: '0.78rem', fontFamily: 'var(--font-tech)', fontWeight: 700, color: '#334155', letterSpacing: '0.04em' }}>
                  PASSWORD
                </label>
                <button type="button" onClick={() => { setError(''); setMode('forgot'); }} style={{ background: 'none', border: 'none', padding: 0, fontSize: '0.78rem', color: '#ea580c', cursor: 'pointer', fontWeight: 600 }}>
                  Forgot password?
                </button>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} required
                  style={{ width: '100%', padding: '12px 42px 12px 14px', fontSize: '0.95rem', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 10, outline: 'none', boxSizing: 'border-box' }}
                />
                <button type="button" onClick={() => setShowPassword(p => !p)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} style={{ marginTop: 8, width: '100%', padding: '14px', fontSize: '0.95rem', fontWeight: 700, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', border: 'none', color: '#ffffff', cursor: loading ? 'not-allowed' : 'pointer' }}>
              <LogIn size={18} /> {loading ? 'VERIFYING...' : 'SIGN IN'}
            </button>
          </form>

          <div style={{ marginTop: 20, position: 'relative', textAlign: 'center' }}>
            <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, borderTop: '1px solid #e2e8f0', zIndex: 1 }}></div>
            <span style={{ position: 'relative', zIndex: 2, background: '#ffffff', padding: '0 12px', fontSize: '0.8rem', color: '#94a3b8' }}>OR</span>
          </div>

          <button onClick={handleGoogleLogin} type="button" style={{ marginTop: 20, width: '100%', padding: '12px', fontSize: '0.95rem', fontWeight: 600, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, background: '#ffffff', border: '1px solid #cbd5e1', color: '#334155', cursor: 'pointer' }}>
            <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Sign in with Google
          </button>

          <div style={{ textAlign: 'center', marginTop: 24, paddingTop: 18, borderTop: '1px solid #f1f5f9', fontSize: '0.875rem', color: '#64748b' }}>
            Don't have an account yet?{' '}
            <button onClick={onSwitchToRegister} type="button" style={{ background: 'none', border: 'none', color: '#ea580c', fontWeight: 700, cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>Create Free Account</button>
          </div>
        </>
      )}

      {mode === 'forgot' && (
        <form onSubmit={handleForgotPassword} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <InputField label="EMAIL ADDRESS" type="email" value={form.email} onChange={(e) => setForm(p => ({...p, email: e.target.value}))} placeholder="you@example.com" />
          <button type="submit" disabled={loading} style={{ marginTop: 8, width: '100%', padding: '14px', fontSize: '0.95rem', fontWeight: 700, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#0f172a', border: 'none', color: '#ffffff', cursor: loading ? 'not-allowed' : 'pointer' }}>
            <Key size={18} /> {loading ? 'SENDING OTP...' : 'SEND OTP'}
          </button>
          <button type="button" onClick={() => setMode('login')} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '0.85rem', cursor: 'pointer', marginTop: 10 }}>
            ← Back to Login
          </button>
        </form>
      )}

      {mode === 'reset' && (
        <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <InputField label="ENTER OTP" type="text" value={form.otp} onChange={(e) => setForm(p => ({...p, otp: e.target.value}))} placeholder="123456" />
          <InputField label="NEW PASSWORD" type="password" value={form.newPassword} onChange={(e) => setForm(p => ({...p, newPassword: e.target.value}))} placeholder="••••••••" />
          <button type="submit" disabled={loading} style={{ marginTop: 8, width: '100%', padding: '14px', fontSize: '0.95rem', fontWeight: 700, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', border: 'none', color: '#ffffff', cursor: loading ? 'not-allowed' : 'pointer' }}>
            <ArrowRight size={18} /> {loading ? 'UPDATING...' : 'UPDATE PASSWORD'}
          </button>
          <button type="button" onClick={() => setMode('forgot')} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '0.85rem', cursor: 'pointer', marginTop: 10 }}>
            ← Didn't receive OTP? Try again
          </button>
        </form>
      )}
    </div>
  );
}
