// CareerGPT - API Service Layer
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor — attach JWT
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('careergpt_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !error.config?.url?.includes('/auth/login')) {
      localStorage.removeItem('careergpt_token');
      localStorage.removeItem('careergpt_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ── Auth ──────────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (email, password) => {
    const form = new FormData();
    form.append('username', email);
    form.append('password', password);
    return api.post('/auth/login', form, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
  },
  demoLogin: () => api.post('/auth/demo-login'),
  getMe: () => api.get('/auth/me'),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (email, otp, new_password) => api.post('/auth/reset-password', { email, otp, new_password }),
};

// ── Profile ────────────────────────────────────────────────
export const profileAPI = {
  create: (data) => api.post('/profile/create', data),
  getMe: () => api.get('/profile/me'),
};

// ── Resume ─────────────────────────────────────────────────
export const resumeAPI = {
  upload: (file) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/resume/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  get: (id) => api.get(`/resume/${id}`),
  getDemo: () => api.get('/resume/demo/sample'),
};

// ── Interview ──────────────────────────────────────────────
export const interviewAPI = {
  start: (data) => api.post('/interview/start', data),
  nextQuestion: (interviewId) => api.post('/interview/next-question', { interview_id: interviewId }),
  submitAnswer: (data) => api.post('/interview/answer', data),
  getGraph: (interviewId) => api.get(`/interview/${interviewId}/graph`),
  getReport: (interviewId) => api.get(`/interview/${interviewId}/report`),
  getStatus: (interviewId) => api.get(`/interview/${interviewId}/status`),
  list: () => api.get('/interview/list'),
};

// ── Roadmap (existing engine) ──────────────────────────────
export const roadmapAPI = {
  generate: (data) => api.post('/roadmap/generate', data),
  getCurrent: () => api.get('/roadmap/current'),
  getBranches: () => api.get('/roadmap/knowledge/branches'),
  getAllDomains: () => api.get('/roadmap/knowledge/all-domains'),
  getDomains: (branch) => api.get(`/roadmap/knowledge/domains/${encodeURIComponent(branch)}`),
  getRoles: (domain) => api.get(`/roadmap/knowledge/roles/${encodeURIComponent(domain)}`),
  getLanguagesForRole: (role) => api.get(`/roadmap/knowledge/languages/${encodeURIComponent(role)}`),
  getTechnologiesForRole: (role, language) => api.get(`/roadmap/knowledge/technologies/${encodeURIComponent(role)}`, {
    params: language ? { language } : {}
  }),
  getRoleDetails: (role) => api.get(`/roadmap/knowledge/role/${encodeURIComponent(role)}`),
  getSources: () => api.get('/roadmap/knowledge/sources'),
};

// ── Roadmap Sources (new — roadmap.sh explorer) ────────────
export const roadmapSourcesAPI = {
  list: (params = {}) => api.get('/roadmaps', { params }),
  getMy: () => api.get('/roadmaps/my'),
  getSources: () => api.get('/roadmaps/sources'),
  get: (slug) => api.get(`/roadmaps/${encodeURIComponent(slug)}`),
  getTopics: (slug, params = {}) => api.get(`/roadmaps/${encodeURIComponent(slug)}/topics`, { params }),
  getProgress: (slug) => api.get(`/roadmaps/${encodeURIComponent(slug)}/progress`),
};

// ── Career Knowledge (Excel-derived) ──────────────────────
export const careerAPI = {
  getIndex: () => api.get('/career/index'),
  getRoadmap: (branch, domain, track) => api.get('/career/roadmap', {
    params: { branch, domain, track }
  }),
};

// ── Learning Goals (new — multi-domain) ───────────────────
export const learningGoalsAPI = {
  list: () => api.get('/learning-goals'),
  create: (data) => api.post('/learning-goals', data),
  get: (id) => api.get(`/learning-goals/${id}`),
  update: (id, data) => api.patch(`/learning-goals/${id}`, data),
  remove: (id) => api.delete(`/learning-goals/${id}`),
  updateProgress: (goalId, data) => api.post(`/learning-goals/${goalId}/progress`, data),
  getSkillGap: (goalId) => api.get(`/learning-goals/${goalId}/skill-gap`),
};

// ── Knowledge ──────────────────────────────────────────────
export const knowledgeAPI = {
  getLanguages: () => api.get('/knowledge/languages'),
  getTechnologies: () => api.get('/knowledge/technologies'),
};

// ── Competency ─────────────────────────────────────────────
export const competencyAPI = {
  getGraph: () => api.get('/competency/graph'),
};

// ── Health ─────────────────────────────────────────────────
export const healthAPI = {
  check: () => api.get('/health'),
};

export default api;
