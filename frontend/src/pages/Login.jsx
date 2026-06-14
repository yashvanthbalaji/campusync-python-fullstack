// ===== src/pages/Login.jsx — Ocean Glassmorphism =====

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  const handleLogin = async () => {
    if (!email || !password) { setError('Please fill in all fields'); return; }
    setLoading(true); setError('');
    try {
      const data = await login(email, password);
      console.log('🔐 Login response — role:', data.role, '| email:', data.email, '| name:', data.name);

      // Store extra fields that AuthContext doesn't persist
      localStorage.setItem('userPhone', data.phoneNumber || '');

      // Determine profile completion from DB data
      if (data.role === 'ADMIN') {
        localStorage.setItem('profileComplete', 'true');
        navigate('/admin');

      } else if (data.role === 'WORKER') {
        const hasProfile = data.workTypes && data.workTypes.trim().length > 0;
        localStorage.setItem('profileComplete', hasProfile ? 'true' : 'false');
        if (data.workTypes) {
          localStorage.setItem('workerTypes', data.workTypes);
          if (data.maxComplaints) localStorage.setItem('maxComplaints', String(data.maxComplaints));
        }
        navigate(hasProfile ? '/worker' : '/profile-setup');

      } else {
        // STUDENT — check if roomNumber exists in DB
        const hasProfile = data.roomNumber && data.roomNumber.trim().length > 0;
        localStorage.setItem('profileComplete', hasProfile ? 'true' : 'false');
        navigate(hasProfile ? '/dashboard' : '/profile-setup');
      }
    } catch (err) {
      setError(err.message || 'Login failed. Check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const focusHandler = (e) => {
    e.target.style.borderColor = 'var(--accent-cyan)';
    e.target.style.boxShadow = '0 0 0 3px rgba(0,212,255,0.15), 0 0 20px rgba(0,212,255,0.1)';
  };
  const blurHandler = (e) => {
    e.target.style.borderColor = 'var(--glass-border)';
    e.target.style.boxShadow = 'none';
  };

  const s = {
    page: {
      minHeight: '100vh',
      background: 'var(--bg-gradient)',
      backgroundAttachment: 'fixed',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      position: 'relative',
      overflow: 'hidden',
    },
    blob: (size, top, left, color, anim) => ({
      position: 'absolute', width: size, height: size,
      borderRadius: '50%', background: color,
      filter: 'blur(80px)', opacity: 0.35,
      top, left,
      animation: `${anim} 12s ease-in-out infinite`,
      pointerEvents: 'none',
    }),
    logoWrap: {
      fontSize: 72, marginBottom: 8, textAlign: 'center',
      animation: 'pulseGlow 3s ease-in-out infinite',
      position: 'relative', zIndex: 2,
    },
    appName: {
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      fontWeight: 800, fontSize: '2rem',
      color: 'var(--text-primary)',
      textAlign: 'center', marginBottom: 4,
      position: 'relative', zIndex: 2,
      animation: 'fadeUp 0.6s 0.1s both',
    },
    tagline: {
      color: 'var(--text-secondary)',
      textAlign: 'center', fontSize: '0.9rem',
      marginBottom: 36,
      fontFamily: "'Inter', sans-serif",
      position: 'relative', zIndex: 2,
      animation: 'fadeUp 0.6s 0.15s both',
    },
    card: {
      background: 'var(--glass-bg)',
      border: '1px solid var(--glass-border)',
      borderRadius: 20,
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
      padding: '32px 24px',
      width: '100%', maxWidth: 420,
      position: 'relative', zIndex: 2,
      animation: 'fadeUp 0.6s 0.2s both',
    },
    label: {
      display: 'block',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      fontWeight: 600, fontSize: '0.8rem',
      color: 'var(--text-secondary)',
      marginBottom: 8, letterSpacing: '0.03em',
    },
    input: {
      width: '100%',
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid var(--glass-border)',
      borderRadius: 14, padding: '14px 16px',
      color: 'var(--text-primary)',
      fontSize: '1rem',
      fontFamily: "'Inter', sans-serif",
      outline: 'none', marginBottom: 18,
      transition: 'border-color 0.3s, box-shadow 0.3s',
    },
    loginBtn: {
      width: '100%',
      background: 'linear-gradient(135deg, #FF6B9D, #A78BFA)',
      border: 'none', borderRadius: 14, padding: '16px',
      color: 'white',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      fontWeight: 700, fontSize: '1rem',
      cursor: loading ? 'not-allowed' : 'pointer',
      opacity: loading ? 0.7 : 1,
      boxShadow: '0 4px 20px rgba(255, 107, 157, 0.35)',
      transition: 'transform 0.2s, box-shadow 0.2s',
      marginTop: 8,
    },
    error: {
      background: 'rgba(239,68,68,0.08)',
      border: '1px solid rgba(239,68,68,0.25)',
      color: '#FF6B6B', borderRadius: 14,
      padding: '12px 16px', fontSize: '0.85rem',
      marginBottom: 18, textAlign: 'center',
      fontFamily: "'Inter', sans-serif",
    },
    footer: {
      textAlign: 'center', color: 'var(--text-muted)',
      fontSize: '0.78rem', marginTop: 24,
      paddingTop: 20,
      borderTop: '1px solid var(--glass-border)',
      fontFamily: "'Inter', sans-serif",
    },
  };

  return (
    <div style={s.page}>
      {/* Animated floating blobs */}
      <div style={s.blob('300px', '10%', '-5%', 'rgba(255,107,157,0.3)', 'float1')} />
      <div style={s.blob('250px', '60%', '70%', 'rgba(0,212,255,0.25)', 'float2')} />
      <div style={s.blob('200px', '30%', '60%', 'rgba(167,139,250,0.25)', 'float3')} />

      {/* Theme toggle — top right */}
      <div style={{ position: 'absolute', top: 20, right: 20, zIndex: 10 }}>
        <button onClick={toggleTheme} style={{
          background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
          borderRadius: 20, padding: '8px 16px', cursor: 'pointer',
          color: 'var(--text-primary)', fontSize: 14,
          display: 'flex', alignItems: 'center', gap: 6,
          backdropFilter: 'blur(8px)', transition: 'all 0.2s',
        }}>{isDark ? '☀️' : '🌙'}</button>
      </div>

      <div style={s.logoWrap}>⟁</div>
      <div style={s.appName}>CampuSync</div>
      <div style={s.tagline}>Living, Synchronized.</div>

      <div style={s.card}>
        <div style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontWeight: 700, fontSize: '1.2rem',
          marginBottom: 24, color: 'var(--text-primary)',
        }}>
          Welcome back 👋
        </div>

        {error && <div style={s.error}>⚠️ {error}</div>}

        <label style={s.label}>Email Address</label>
        <input
          style={s.input} type="email"
          placeholder="you@example.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onFocus={focusHandler} onBlur={blurHandler}
        />

        <label style={s.label}>Password</label>
        <input
          style={s.input} type="password"
          placeholder="••••••••"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
          onFocus={focusHandler} onBlur={blurHandler}
        />

        <button
          style={s.loginBtn}
          onClick={handleLogin}
          disabled={loading}
          onMouseEnter={e => {
            if (!loading) {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 8px 32px rgba(255,107,157,0.5)';
            }
          }}
          onMouseLeave={e => {
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = '0 4px 20px rgba(255,107,157,0.35)';
          }}
        >
          {loading ? '⏳ Logging in...' : '🚀 Login to CampuSync'}
        </button>

        <div
          style={{
            textAlign: 'center',
            marginTop: 16,
            fontSize: '0.85rem',
            color: '#FF6B9D',
            cursor: 'pointer',
            fontFamily: "'Inter', sans-serif",
            transition: 'opacity 0.2s',
          }}
          onClick={() => navigate('/register')}
          onMouseEnter={e => { e.target.style.opacity = '0.8'; }}
          onMouseLeave={e => { e.target.style.opacity = '1'; }}
        >
          New here? Create an account →
        </div>

        <div style={s.footer}>
          Saveetha Engineering College — Hostel Portal
        </div>
      </div>
    </div>
  );
}