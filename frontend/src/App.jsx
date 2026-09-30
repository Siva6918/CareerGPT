// CareerGPT - Main App Router
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Pages
import LandingPage from './pages/LandingPage';
import DashboardPage from './pages/DashboardPage';
import ProfileSetupPage from './pages/ProfileSetupPage';
import InterviewPage from './pages/InterviewPage';
import RoadmapPage from './pages/RoadmapPage';
import CompetencyPage from './pages/CompetencyPage';
import ReportPage from './pages/ReportPage';
import RoadmapExplorerPage from './pages/RoadmapExplorerPage';
import MyLearningPage from './pages/MyLearningPage';
import CareerIntelligencePage from './pages/CareerIntelligencePage';

// Layout
import AppLayout from './layouts/AppLayout';
import GlobalBackground from './components/GlobalBackground';

import ProfileGate from './components/ProfileGate';
import InstallPWA from './components/InstallPWA';

function ProtectedRoute({ children }) {
  const { user } = useAuth();
  return user ? <ProfileGate>{children}</ProfileGate> : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  const { user } = useAuth();
  return user ? <Navigate to="/dashboard" replace /> : children;
}

export default function App() {
  return (
    <BrowserRouter>
      <GlobalBackground />
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#1e293b',
              color: '#ffffff',
              border: '1px solid #334155',
              borderRadius: '10px',
              zIndex: 9999,
            },
            duration: 4000,
          }}
        />
        <InstallPWA />
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<PublicRoute><LandingPage initialModal="login" /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><LandingPage initialModal="register" /></PublicRoute>} />

          {/* Protected routes - wrapped in AppLayout */}
          <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="profile/setup" element={<ProfileSetupPage />} />
            <Route path="interview" element={<InterviewPage />} />
            <Route path="interview/:id" element={<InterviewPage />} />
            <Route path="roadmap" element={<RoadmapPage />} />
            <Route path="roadmaps" element={<RoadmapExplorerPage />} />
            <Route path="roadmaps/:slug" element={<RoadmapExplorerPage />} />
            <Route path="learning" element={<MyLearningPage />} />
            <Route path="intelligence" element={<CareerIntelligencePage />} />
            <Route path="competency" element={<CompetencyPage />} />
            <Route path="report/:id" element={<ReportPage />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
