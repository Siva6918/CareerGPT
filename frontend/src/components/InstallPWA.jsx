import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Only check if already running in standalone mode (installed)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    if (isStandalone) return;

    // Detect iOS
    const isIosDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    
    if (isIosDevice && !isStandalone) {
      setIsIOS(true);
      setTimeout(() => setShowPrompt(true), 500); // Fast visibility
    }

    // Listen for Chrome/Android install prompt
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setTimeout(() => setShowPrompt(true), 500); // Fast visibility
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
      }
      setDeferredPrompt(null);
    }
    closePrompt();
  };

  const closePrompt = () => {
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        style={{
          position: 'fixed',
          bottom: 24,
          left: 0,
          right: 0,
          margin: '0 auto',
          width: '92%',
          maxWidth: 400,
          background: '#ffffff',
          borderRadius: 16,
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
          zIndex: 9999,
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          border: '1px solid #e2e8f0'
        }}
      >
        <button
          onClick={closePrompt}
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#64748b'
          }}
        >
          <X size={18} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <img 
            src="/pwa-192x192.png" 
            alt="CareerGPT App" 
            style={{ width: 48, height: 48, borderRadius: 12 }} 
          />
          <div>
            <h4 style={{ margin: 0, fontSize: '1rem', color: '#0f172a', fontWeight: 700 }}>Install CareerGPT</h4>
            <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>
              Add to your home screen for a faster, app-like experience.
            </p>
          </div>
        </div>

        {isIOS ? (
          <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: 8, fontSize: '0.8rem', color: '#475569' }}>
            To install: Tap the <strong>Share</strong> button below and select <strong>"Add to Home Screen"</strong>.
          </div>
        ) : (
          <button
            onClick={handleInstallClick}
            style={{
              background: '#f97316',
              color: '#fff',
              border: 'none',
              padding: '10px',
              borderRadius: 8,
              fontWeight: 600,
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              cursor: 'pointer'
            }}
          >
            <Download size={18} />
            Install App
          </button>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
