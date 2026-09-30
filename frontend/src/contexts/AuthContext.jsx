// CareerGPT - Auth Context
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('careergpt_token');
    const savedUser = localStorage.getItem('careergpt_user');
    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await authAPI.login(email, password);
    const { access_token, user_id, username, email: userEmail } = res.data;
    const userData = { id: user_id, username, email: userEmail };
    localStorage.setItem('careergpt_token', access_token);
    localStorage.setItem('careergpt_user', JSON.stringify(userData));
    setUser(userData);
    setIsDemoMode(false);
    return userData;
  }, []);

  const register = useCallback(async (data) => {
    const res = await authAPI.register(data);
    const { access_token, user_id, username, email } = res.data;
    const userData = { id: user_id, username, email };
    localStorage.setItem('careergpt_token', access_token);
    localStorage.setItem('careergpt_user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  }, []);

  const demoLogin = useCallback(async () => {
    const res = await authAPI.demoLogin();
    const { access_token, user_id, username, email } = res.data;
    const userData = { id: user_id, username, email, isDemo: true };
    localStorage.setItem('careergpt_token', access_token);
    localStorage.setItem('careergpt_user', JSON.stringify(userData));
    setUser(userData);
    setIsDemoMode(true);
    return userData;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('careergpt_token');
    localStorage.removeItem('careergpt_user');
    setUser(null);
    setIsDemoMode(false);
  }, []);

  const loginWithGoogle = useCallback(async (token) => {
    const res = await authAPI.googleLogin(token);
    const { access_token, user_id, username, email } = res.data;
    const userData = { id: user_id, username, email };
    localStorage.setItem('careergpt_token', access_token);
    localStorage.setItem('careergpt_user', JSON.stringify(userData));
    setUser(userData);
    setIsDemoMode(false);
    return userData;
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, isDemoMode, login, register, demoLogin, logout, loginWithGoogle }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
