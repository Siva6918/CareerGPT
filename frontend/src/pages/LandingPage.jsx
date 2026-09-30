import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import {
  Brain, ArrowRight, GraduationCap,
  CheckCircle, Sparkles, Shield, Compass, Cpu, Layers
} from 'lucide-react';

import LoginModal from './LoginPage';
import RegisterModal from './RegisterPage';
import InteractiveVideo from '../components/InteractiveVideo';
import InteractiveImage from '../components/InteractiveImage';
import LandingFooter from '../components/LandingFooter';

import {
  staggerContainer,
  headingMotion,
  subheadingMotion,
  bodyMotion,
  labelMotion,
  highlightMotion,
  cardSlideLeft,
  cardSlideRight,
  cardFadeUp,
  mediaReveal,
  bidirectionalViewport
} from '../utils/motionVariants';

export default function LandingPage({ initialModal = null }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [backendStatus, setBackendStatus] = useState(null);
  const [authModal, setAuthModal] = useState(initialModal);

  useEffect(() => {
    fetch('http://localhost:8000/health')
      .then(r => r.json())
      .then(data => setBackendStatus(data))
      .catch(() => setBackendStatus({ status: 'offline' }));
      
    if (initialModal) {
      setAuthModal(initialModal);
    }
  }, [initialModal]);

  const handleCloseModal = () => {
    setAuthModal(null);
    if (window.location.pathname === '/login' || window.location.pathname === '/register') {
      navigate('/', { replace: true });
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', color: 'var(--text-primary)', overflowX: 'hidden' }}>
      
      {/* Top Navbar */}
      <nav
        className="navbar-header-container"
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
          padding: '14px 28px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'rgba(255, 255, 255, 0.94)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: 'var(--border-ultra-thin)',
          boxShadow: '0 2px 10px rgba(15, 23, 42, 0.04)',
          gap: 12
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => navigate('/')}>
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(234, 88, 12, 0.25)',
            flexShrink: 0
          }}>
            <GraduationCap size={20} color="#ffffff" />
          </div>
          <div>
            <span style={{
              fontWeight: 800, fontSize: '1.35rem', fontFamily: 'var(--font-heading)',
              color: 'var(--text-primary)', letterSpacing: '0.04em', lineHeight: 1
            }}>
              CAREER<span style={{ color: 'var(--color-primary)' }}>GPT</span>
            </span>
            <span className="brand-subtitle font-croissant-pink" style={{ fontSize: '0.8rem', lineHeight: 1, marginTop: 1 }}>
              Agentic Career Engine
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {backendStatus && (
            <div className="hide-on-mobile" style={{
              display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', fontFamily: 'var(--font-tech)',
              padding: '4px 10px', borderRadius: 20,
              background: backendStatus.status === 'healthy' ? '#ecfdf5' : '#fff7ed',
              color: backendStatus.status === 'healthy' ? '#047857' : '#c2410c',
              border: 'var(--border-ultra-thin)'
            }}>
              <div style={{
                width: 6, height: 6, borderRadius: '50%',
                background: backendStatus.status === 'healthy' ? '#10b981' : '#f97316'
              }} className={backendStatus.status === 'healthy' ? 'animate-pulse' : ''} />
              {backendStatus.status === 'healthy' ? 'SYSTEM ACTIVE' : 'CONNECTING...'}
            </div>
          )}

          {user ? (
            <Link to="/dashboard" className="btn btn-primary btn-sm" style={{ padding: '8px 14px' }}>
              <span>Dashboard</span> <ArrowRight size={14} />
            </Link>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                onClick={() => setAuthModal('login')}
                className="btn btn-secondary btn-sm"
                style={{ padding: '7px 12px', fontSize: '0.8rem' }}
              >
                SIGN IN
              </button>
              <button
                onClick={() => setAuthModal('register')}
                className="btn btn-primary btn-sm"
                style={{ padding: '7px 12px', fontSize: '0.8rem' }}
              >
                GET STARTED
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section (Bidirectional Motion: Down & Up) */}
      <section style={{
        minHeight: '92vh', display: 'flex', alignItems: 'center',
        padding: '120px 24px 64px', position: 'relative'
      }}>
        <div className="container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))', gap: '48px', alignItems: 'center' }}>
          
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={bidirectionalViewport}
            variants={staggerContainer}
          >
            <motion.div variants={labelMotion} style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
              <span className="tag-pill tag-pink">
                <Sparkles size={13} /> Multimodal B.Tech Placement Platform
              </span>
              <span className="font-niconne-violet" style={{ fontSize: '1.25rem' }}>
                Engineering Readiness
              </span>
            </motion.div>
            
            <motion.h1 variants={headingMotion} style={{ fontSize: 'clamp(2rem, 8vw, 4.4rem)', fontWeight: 800, lineHeight: 1.1, marginBottom: 16, color: 'var(--text-primary)' }}>
              Agentic AI-Based <br/>
              <span className="font-oswald-blue">Career Mentoring</span> & <br/>
              <span className="font-fascinate-orange">Placement Readiness</span>
            </motion.h1>

            <motion.p variants={bodyMotion} style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 28, maxWidth: 580 }}>
              CareerGPT continuously evaluates candidate skills, conducts adaptive multimodal interviews, analyzes true skill gaps without false penalties, and synthesizes personalized roadmaps with curated project proofs.
            </motion.p>

            <motion.div variants={cardFadeUp} style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginBottom: 32 }}>
              <button
                onClick={() => setAuthModal('register')}
                className="btn btn-primary btn-lg"
              >
                Start Free Career Evaluation <ArrowRight size={18} />
              </button>
              <button
                onClick={() => setAuthModal('login')}
                className="btn btn-secondary btn-lg"
              >
                Sign In to Portal
              </button>
            </motion.div>

            <motion.div variants={labelMotion} style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <span className="tag-pill tag-green">✓ Bayesian Uncertainty Tracking</span>
              <span className="tag-pill tag-violet">✓ Multimodal Speech/Code/Tone</span>
              <span className="tag-pill tag-blue">✓ Dynamic Prerequisite Graphs</span>
            </motion.div>
          </motion.div>

          {/* Product Intro Video Showcase */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={bidirectionalViewport}
            variants={mediaReveal}
            style={{ maxWidth: 540, margin: '0 auto', width: '100%' }}
          >
            <div className="card" style={{ padding: 14, borderRadius: 20 }}>
              <InteractiveVideo
                src="/media/product_intro.mp4"
              />
              <div style={{ padding: '14px 6px 4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div className="font-tech-black" style={{ fontSize: '0.95rem' }}>
                    CareerGPT Product Tour & Architecture
                  </div>
                  <div className="font-handwriting-yellow" style={{ fontSize: '1rem', color: '#a16207' }}>
                    Real-time competency tracking • Intelligent roadmap generation
                  </div>
                </div>
                <span className="tag-pill tag-orange">Live Demo</span>
              </div>
            </div>
          </motion.div>

        </div>
      </section>

      {/* Module 1: Resume & Profile Understanding */}
      <section style={{ padding: '90px 24px', borderTop: '1px solid rgba(255,255,255,0.4)' }}>
        <div className="container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))', gap: '56px', alignItems: 'center' }}>
          
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={bidirectionalViewport}
            variants={cardSlideLeft}
          >
            <div className="card" style={{ padding: 14, borderRadius: 20 }}>
              <InteractiveVideo
                src="/media/resume_analysis.mp4"
              />
              <div style={{ padding: '12px 6px 2px' }}>
                <span className="tag-pill tag-blue" style={{ fontSize: '0.75rem' }}>AI-Powered PDF & DOCX Parsing • Instant Competency Mapping</span>
              </div>
            </div>
          </motion.div>
          
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={bidirectionalViewport}
            variants={staggerContainer}
          >
            <motion.span variants={labelMotion} className="font-croissant-pink" style={{ fontSize: '1.05rem', display: 'block', marginBottom: 6 }}>
              Module 01 • Candidate Baseline
            </motion.span>

            <motion.h2 variants={headingMotion} style={{ fontSize: '2.4rem', marginBottom: 18, color: 'var(--text-primary)' }}>
              RESUME TO COMPETENCY PROFILING
            </motion.h2>

            <motion.p variants={bodyMotion} style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', marginBottom: 20, lineHeight: 1.7 }}>
              Upload your PDF resume. CareerGPT extracts programming languages, frameworks, domain projects, and branch specializations, converting text into an evidence baseline.
            </motion.p>

            <motion.div variants={bodyMotion} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {['Multi-format resume parsing (PDF, DOCX, TXT)', 'Project evidence & tech stack extraction', 'Branch-calibrated candidate profile initialization'].map((item, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-secondary)', fontFamily: 'var(--font-tech)' }}>
                  <CheckCircle size={18} color="var(--color-green)" /> {item}
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Module 2: Dynamic Competency Graph */}
      <section style={{ padding: '90px 24px' }}>
        <div className="container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))', gap: '56px', alignItems: 'center' }}>
          
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={bidirectionalViewport}
            variants={staggerContainer}
            style={{ order: 1 }}
          >
            <motion.span variants={labelMotion} className="font-niconne-violet" style={{ fontSize: '1.35rem', display: 'block', marginBottom: 4 }}>
              Module 02 • Evidence Graph
            </motion.span>

            <motion.h2 variants={headingMotion} style={{ fontSize: '2.4rem', marginBottom: 18, color: 'var(--text-primary)' }}>
              DYNAMIC COMPETENCY GRAPH
            </motion.h2>

            <motion.p variants={bodyMotion} style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', marginBottom: 20, lineHeight: 1.7 }}>
              Skills are nodes in a directed prerequisite network. Each node tracks its current competency state (Strong, Demonstrated, Developing, Emerging, Unknown) alongside a Bayesian uncertainty score.
            </motion.p>

            <motion.div variants={highlightMotion} style={{ padding: '16px 20px', borderRadius: 12, background: 'var(--color-pink-soft)', border: 'var(--border-ultra-thin)' }}>
              <p className="font-handwriting-yellow" style={{ margin: 0, fontSize: '1.1rem', color: '#9d174d' }}>
                "Important Design Rule: An unassessed skill is marked Unknown / Insufficient Evidence, never scored 0%."
              </p>
            </motion.div>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={bidirectionalViewport}
            variants={cardSlideRight}
            style={{ order: 2 }}
          >
            <div className="card" style={{ padding: 14, borderRadius: 20 }}>
              <InteractiveVideo
                src="/media/competency_demo.mp4"
              />
              <div style={{ padding: '12px 6px 2px' }}>
                <span className="tag-pill tag-pink" style={{ fontSize: '0.75rem' }}>Bayesian Uncertainty Scoring • Directed Prerequisite Network</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Module 3: Adaptive AI Mock Interview */}
      <section style={{ padding: '90px 24px', borderTop: '1px solid rgba(255,255,255,0.4)' }}>
        <div className="container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))', gap: '56px', alignItems: 'center' }}>
          
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={bidirectionalViewport}
            variants={cardSlideLeft}
          >
            <div className="card" style={{ padding: 14, borderRadius: 20 }}>
              <InteractiveImage
                src="/media/interview_ui.jpg"
                alt="AI Interview Room Interface"
              />
              <div style={{ padding: '12px 6px 2px' }}>
                <span className="tag-pill tag-violet" style={{ fontSize: '0.75rem' }}>Adaptive Interviewing UI & Question Engine</span>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={bidirectionalViewport}
            variants={staggerContainer}
          >
            <motion.span variants={labelMotion} className="font-croissant-pink" style={{ fontSize: '1.05rem', display: 'block', marginBottom: 6 }}>
              Module 03 • Information Seeking Loop
            </motion.span>

            <motion.h2 variants={headingMotion} style={{ fontSize: '2.4rem', marginBottom: 18, color: 'var(--text-primary)' }}>
              ADAPTIVE AI INTERVIEWS
            </motion.h2>

            <motion.p variants={bodyMotion} style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', marginBottom: 20, lineHeight: 1.7 }}>
              Questions aren't static flashcards. The engine calculates which question will provide maximum information gain to reduce uncertainty on critical target-role skills.
            </motion.p>

            <motion.div variants={labelMotion} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <span className="tag-pill tag-blue">Text Evaluation</span>
              <span className="tag-pill tag-green">Speech Recognition</span>
              <span className="tag-pill tag-yellow">Tone & Confidence Telemetry</span>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Module 4 & 5: Gap Analysis and Career Roadmap */}
      <section style={{ padding: '90px 24px' }}>
        <div className="container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))', gap: '40px' }}>
          
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={bidirectionalViewport}
            variants={cardSlideLeft}
            className="card"
            style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: 24 }}
          >
            <InteractiveImage
              src="/media/gap_analysis.jpg"
              alt="Skill Gap Analysis"
              style={{ marginBottom: 18 }}
            />
            <div style={{ marginTop: 'auto' }}>
              <span className="tag-pill tag-red" style={{ marginBottom: 8 }}>Module 04</span>
              <h3 style={{ fontSize: '1.4rem', marginBottom: 8, color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>
                Skill Gap & Evidence Matrix
              </h3>
              <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                Pinpoints exact technical gaps between current verified competency and target industry roles without false penalties.
              </p>
            </div>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={bidirectionalViewport}
            variants={cardSlideRight}
            className="card"
            style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: 24 }}
          >
            <InteractiveImage
              src="/media/roadmap_preview.jpg"
              alt="Career Roadmap"
              style={{ marginBottom: 18 }}
            />
            <div style={{ marginTop: 'auto' }}>
              <span className="tag-pill tag-green" style={{ marginBottom: 8 }}>Module 05</span>
              <h3 style={{ fontSize: '1.4rem', marginBottom: 8, color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>
                Personalized B.Tech Roadmaps
              </h3>
              <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                Custom step-by-step milestones spanning Foundation, Core, Applied, and Industry Assessment stages.
              </p>
            </div>
          </motion.div>

        </div>
      </section>

      {/* Module 6, 7 & 8: Projects, Roles, and Continuous Development */}
      <section style={{ padding: '90px 24px', borderTop: '1px solid rgba(255,255,255,0.4)' }}>
        <div className="container">
          
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={bidirectionalViewport}
            variants={staggerContainer}
            style={{ textAlign: 'center', maxWidth: 650, margin: '0 auto 48px' }}
          >
            <motion.span variants={labelMotion} className="font-croissant-pink" style={{ fontSize: '1.1rem' }}>
              Modules 06, 07 & 08
            </motion.span>
            <motion.h2 variants={headingMotion} style={{ fontSize: '2.5rem', marginTop: 4, color: 'var(--text-primary)' }}>
              PRACTICE, ROLES & LIFELONG REASSESSMENT
            </motion.h2>
            <motion.p variants={bodyMotion} style={{ fontSize: '1.05rem', color: 'var(--text-secondary)' }}>
              Full portfolio project recommendations, evidence-based role matching, and ongoing telemetry.
            </motion.p>
          </motion.div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: 24 }}>
            
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={bidirectionalViewport}
              variants={cardFadeUp}
              className="card"
            >
              <InteractiveImage
                src="/media/project_recommendations.jpg"
                alt="Project Recommendations"
                style={{ marginBottom: 14 }}
              />
              <span className="tag-pill tag-yellow" style={{ marginBottom: 6 }}>Projects</span>
              <h4 style={{ fontSize: '1.15rem', color: 'var(--text-primary)', marginBottom: 6 }}>
                Curated Practice Projects
              </h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                Targeted project blueprints providing proof of skills for resume verification.
              </p>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={bidirectionalViewport}
              variants={cardFadeUp}
              transition={{ delay: 0.1 }}
              className="card"
            >
              <InteractiveImage
                src="/media/role_graph.jpg"
                alt="Role Hierarchy Graph"
                style={{ marginBottom: 14 }}
              />
              <span className="tag-pill tag-black" style={{ marginBottom: 6 }}>Role Matching</span>
              <h4 style={{ fontSize: '1.15rem', color: 'var(--text-primary)', marginBottom: 6 }}>
                Role Hierarchy & Weights
              </h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                Benchmark matching explaining why roles fit your demonstrated evidence.
              </p>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={bidirectionalViewport}
              variants={cardFadeUp}
              transition={{ delay: 0.2 }}
              className="card"
            >
              <InteractiveImage
                src="/media/continuous_dev.jpg"
                alt="Continuous Development"
                style={{ marginBottom: 14 }}
              />
              <span className="tag-pill tag-pink" style={{ marginBottom: 6 }}>Continuous Growth</span>
              <h4 style={{ fontSize: '1.15rem', color: 'var(--text-primary)', marginBottom: 6 }}>
                Lifelong Career Reassessment
              </h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                Skills adapt dynamically as you complete practice tasks and mock interviews.
              </p>
            </motion.div>

          </div>
        </div>
      </section>

      {/* Modern Clean Call to Action */}
      <section style={{ padding: '90px 24px', textAlign: 'center' }}>
        <div className="container-sm">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={bidirectionalViewport}
            variants={staggerContainer}
            className="card card-noborder"
            style={{
              background: 'rgba(255, 255, 255, 0.7)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.5)',
              padding: '56px 36px',
              borderRadius: 24,
              boxShadow: 'var(--shadow-lg)'
            }}
          >
            <motion.span variants={labelMotion} className="font-croissant-pink" style={{ fontSize: '1.2rem', display: 'block', marginBottom: 8 }}>
              Ready for Your Placement Journey?
            </motion.span>
            <motion.h2 variants={headingMotion} style={{ fontSize: '2.5rem', marginBottom: 16, color: 'var(--text-primary)' }}>
              Accelerate Your B.Tech Placement Readiness
            </motion.h2>
            <motion.p variants={bodyMotion} style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', maxWidth: 540, margin: '0 auto 28px', lineHeight: 1.6 }}>
              Join CareerGPT to build your dynamic competency graph, prepare with adaptive AI interviews, and follow a personalized roadmap to top tech placements.
            </motion.p>
            <motion.div variants={cardFadeUp} style={{ display: 'flex', justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
              <button
                onClick={() => setAuthModal('register')}
                className="btn btn-primary btn-xl"
              >
                Get Started Now <ArrowRight size={18} />
              </button>
              <button
                onClick={() => setAuthModal('login')}
                className="btn btn-secondary btn-xl"
              >
                Sign In to Account
              </button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Clean Footer */}
      <LandingFooter />

      {/* Auth Modals Overlay */}
      {authModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24
        }}>
          {authModal === 'login' ? (
            <LoginModal 
              onClose={handleCloseModal} 
              onSwitchToRegister={() => setAuthModal('register')} 
            />
          ) : (
            <RegisterModal 
              onClose={handleCloseModal} 
              onSwitchToLogin={() => setAuthModal('login')} 
            />
          )}
        </div>
      )}
    </div>
  );
}
