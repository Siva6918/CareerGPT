import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { profileAPI } from '../services/api';

export default function ProfileGate({ children }) {
  const [hasProfile, setHasProfile] = useState(null);
  const location = useLocation();

  useEffect(() => {
    profileAPI.getMe()
      .then(res => {
        setHasProfile(!!res.data.has_profile);
      })
      .catch(() => {
        setHasProfile(false);
      });
  }, [location.pathname]); // Re-check occasionally or just once

  if (hasProfile === null) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#fff' }}>Loading profile status...</div>;
  }

  if (!hasProfile && location.pathname !== '/profile/setup') {
    return <Navigate to="/profile/setup" replace />;
  }

  return children;
}
