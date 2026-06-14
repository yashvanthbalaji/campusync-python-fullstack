// ===== src/components/BottomNav.jsx — Role-Aware Ocean Glassmorphism =====

import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const STUDENT_NAV = [
  { path: '/dashboard', icon: '🏠', label: 'Home' },
  { path: '/complaints', icon: '📢', label: 'Complaints' },
  { path: '/lost-found', icon: '🔍', label: 'Lost & Found' },
  { path: '/profile',   icon: null, label: 'Profile' },
];

const WORKER_NAV = [
  { path: '/worker',  icon: '🏠', label: 'Home' },
  { path: '/profile', icon: null,  label: 'Profile' },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const role = localStorage.getItem('userRole') || 'STUDENT';

  // Read user name for profile tab avatar
  const userName = localStorage.getItem('userName') || 'User';
  const initial = userName.charAt(0).toUpperCase();

  // Choose nav items based on role
  const navItems = role === 'WORKER' ? WORKER_NAV : STUDENT_NAV;

  return (
    <nav style={{
      position: 'fixed',
      bottom: 0, left: 0, right: 0,
      background: 'var(--nav-bg)',
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
      borderTop: '1px solid rgba(255,255,255,0.08)',
      display: 'flex',
      justifyContent: 'space-around',
      alignItems: 'center',
      padding: '8px 0 16px',
      zIndex: 1000,
    }}>
      {navItems.map(({ path, icon, label }) => {
        const active = pathname === path;
        const isProfile = path === '/profile';
        const isComplaints = path === '/complaints';
        const studentType = localStorage.getItem('studentType');
        const isBlocked = isComplaints && role === 'STUDENT' && studentType === 'COLLEGE';

        return (
          <div
            key={path}
            onClick={() => { if (!isBlocked) navigate(path); }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              padding: '8px 22px',
              borderRadius: 16,
              cursor: isBlocked ? 'not-allowed' : 'pointer',
              transition: 'all 0.25s ease',
              opacity: isBlocked ? 0.3 : 1,
              background: active && !isBlocked
                ? 'linear-gradient(135deg, rgba(255,107,157,0.2), rgba(167,139,250,0.2))'
                : 'transparent',
              border: active && !isBlocked
                ? '1px solid rgba(255,107,157,0.3)'
                : '1px solid transparent',
            }}
          >
            {isProfile ? (
              // Profile tab: show initial avatar circle
              <div style={{
                width: 24, height: 24, borderRadius: '50%',
                background: active
                  ? 'linear-gradient(135deg, #FF6B9D, #A78BFA)'
                  : 'rgba(255,255,255,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 800, color: 'white',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                transition: 'all 0.25s ease',
                boxShadow: active ? '0 2px 8px rgba(255,107,157,0.3)' : 'none',
              }}>
                {initial}
              </div>
            ) : (
              <span style={{
                fontSize: 22,
                transition: 'transform 0.25s ease',
                transform: active ? 'scale(1.15)' : 'scale(1)',
              }}>
                {icon}
              </span>
            )}
            <span style={{
              fontSize: 11,
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 600,
              color: active && !isBlocked ? 'var(--accent-coral)' : 'var(--text-muted)',
              transition: 'color 0.25s',
            }}>
              {label}
            </span>
            {isBlocked && (
              <span style={{
                fontSize: 8, fontWeight: 700, color: '#ff6b6b',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}>
                Hostel only
              </span>
            )}
            {isProfile && (
              <div style={{
                fontSize: 8, fontWeight: 800, letterSpacing: '0.05em',
                color: role === 'ADMIN' ? '#ff4444' : role === 'WORKER' ? '#6B8AFF' : '#44ff44',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}>
                {role}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}