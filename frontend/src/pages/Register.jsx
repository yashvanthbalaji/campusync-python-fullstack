// ===== src/pages/Register.jsx — Ocean Glassmorphism =====

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { register } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  const handleRegister = async () => {
    setError('');
    setSuccess('');

    // ── Client-side validation ──
    if (!email) { setError('Email is required'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }

    setLoading(true);
    try {
      const data = await register(email, password);
      console.log('🔐 Registered + synced — role:', data.role);

      // Store phone number if provided
      if (phoneNumber) {
        localStorage.setItem('userPhone', phoneNumber);
      }

      setSuccess('Account created! Redirecting...');
      localStorage.setItem('profileComplete', 'false');
      setTimeout(() => navigate('/profile-setup'), 1500);
    } catch (err) {
      const message = err.message || 'Registration failed. Try again.';
      setError(message);
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
    registerBtn: {
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
    success: {
      background: 'rgba(0,245,160,0.08)',
      border: '1px solid rgba(0,245,160,0.25)',
      color: '#00F5A0', borderRadius: 14,
      padding: '12px 16px', fontSize: '0.85rem',
      marginBottom: 18, textAlign: 'center',
      fontFamily: "'Inter', sans-serif",
    },
    loginLink: {
      textAlign: 'center',
      marginTop: 16,
      fontSize: '0.85rem',
      color: '#FF6B9D',
      cursor: 'pointer',
      fontFamily: "'Inter', sans-serif",
      transition: 'opacity 0.2s',
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
      <div style={s.blob('300px', '10%', '-5%', 'rgba(167,139,250,0.3)', 'float1')} />
      <div style={s.blob('250px', '60%', '70%', 'rgba(0,212,255,0.25)', 'float2')} />
      <div style={s.blob('200px', '30%', '60%', 'rgba(255,107,157,0.25)', 'float3')} />

      {/* Theme toggle */}
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
          Join CampuSync 🎓
        </div>

        {error && <div style={s.error}>⚠️ {error}</div>}
        {success && <div style={s.success}>✅ {success}</div>}

        <label style={s.label}>Email Address</label>
        <input
          style={s.input} type="email"
          placeholder="your@email.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onFocus={focusHandler} onBlur={blurHandler}
        />

        <label style={s.label}>Password</label>
        <input
          style={s.input} type="password"
          placeholder="Min 6 characters"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onFocus={focusHandler} onBlur={blurHandler}
        />

        <label style={s.label}>Confirm Password</label>
        <input
          style={s.input} type="password"
          placeholder="Repeat password"
          value={confirmPassword}
          onChange={e => setConfirmPassword(e.target.value)}
          onFocus={focusHandler} onBlur={blurHandler}
        />

        <label style={s.label}>📞 Phone Number <span style={{color:'var(--text-muted)',fontWeight:400}}>(for Lost &amp; Found contact)</span></label>
        <input
          style={s.input} type="tel"
          placeholder="e.g. 9876543210"
          value={phoneNumber}
          onChange={e => setPhoneNumber(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleRegister()}
          onFocus={focusHandler} onBlur={blurHandler}
        />

        <button
          style={s.registerBtn}
          onClick={handleRegister}
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
          {loading ? '⏳ Creating account...' : '🎓 Create Account'}
        </button>

        <div
          style={s.loginLink}
          onClick={() => navigate('/login')}
          onMouseEnter={e => { e.target.style.opacity = '0.8'; }}
          onMouseLeave={e => { e.target.style.opacity = '1'; }}
        >
          Already have an account? Login →
        </div>

        <div style={s.footer}>
          Saveetha Engineering College — Hostel Portal
        </div>
      </div>
    </div>
  );
}
