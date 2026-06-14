// ===== src/pages/Profile.jsx — Ocean Glassmorphism, Role-Aware =====

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function Profile() {
  const { email, role: ctxRole, year: savedYear, roomNumber: savedRoom, saveProfile, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  // Primary: localStorage (set by Login.jsx), fallback: AuthContext
  const userRole  = localStorage.getItem('userRole') || ctxRole || 'STUDENT';
  const userName  = localStorage.getItem('userName') || '';
  const userEmail = localStorage.getItem('userEmail') || email || '';
  const userPhone = localStorage.getItem('userPhone') || '';
  const isStudent = userRole === 'STUDENT';

  const [editMode, setEditMode]     = useState(false);
  const [year, setYear]             = useState(savedYear || '');
  const [roomNumber, setRoomNumber] = useState(savedRoom || '');
  const [error, setError]           = useState('');
  const [saved, setSaved]           = useState(false);

  const displayName = userName || (userEmail ? userEmail.split('@')[0] : 'User');
  const initials    = displayName.slice(0, 2).toUpperCase();

  const yearLabel = { '1':'1st Year', '2':'2nd Year', '3':'3rd Year', '4':'4th Year' }[savedYear] || 'Not set';

  const roleBadge = {
    ADMIN:   { bg: 'rgba(255,107,157,0.15)', border: 'rgba(255,107,157,0.3)', color: '#FF6B9D', icon: '🛡️' },
    WORKER:  { bg: 'rgba(167,139,250,0.15)', border: 'rgba(167,139,250,0.3)', color: '#A78BFA', icon: '👷' },
    STUDENT: { bg: 'rgba(0,212,255,0.15)',    border: 'rgba(0,212,255,0.3)',   color: '#00D4FF', icon: '🎓' },
  }[userRole] || { bg: 'rgba(0,212,255,0.15)', border: 'rgba(0,212,255,0.3)', color: '#00D4FF', icon: '🎓' };

  const handleSave = () => {
    setError('');
    if (!year) { setError('Please select your year of study'); return; }
    if (!roomNumber || roomNumber.length !== 3 || isNaN(roomNumber)) {
      setError('Room number must be exactly 3 digits (e.g. 108)'); return;
    }
    saveProfile(year, roomNumber);
    localStorage.setItem('profileComplete', 'true');
    setEditMode(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleLogout = () => { logout(); navigate('/login'); };

  const focus = e => { e.target.style.borderColor = 'var(--accent-cyan)'; e.target.style.boxShadow = '0 0 0 3px rgba(0,212,255,0.15)'; };
  const blur  = e => { e.target.style.borderColor = 'var(--glass-border)'; e.target.style.boxShadow = 'none'; };

  const inputStyle = {
    width: '100%', boxSizing: 'border-box',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid var(--glass-border)',
    borderRadius: 12, padding: '13px 16px',
    color: 'var(--text-primary)', fontSize: '0.95rem',
    fontFamily: "'Inter', sans-serif",
    outline: 'none', marginBottom: 14,
    transition: 'border-color 0.3s, box-shadow 0.3s',
  };

  const selectStyle = {
    ...inputStyle,
    background: 'rgba(13,13,43,0.85)', appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23A8B4D8' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat', backgroundPosition: 'right 16px center',
  };

  const labelStyle = {
    display: 'block', color: 'var(--text-secondary)', fontSize: '0.78rem',
    fontWeight: 600, fontFamily: "'Plus Jakarta Sans', sans-serif",
    marginBottom: 6, letterSpacing: '0.03em',
  };

  const glassCard = {
    background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
    borderRadius: 20, backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)', boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
    padding: '20px', marginBottom: 16,
  };

  const infoRow = (icon, label, value, valueColor = 'var(--text-primary)') => (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontFamily: "'Inter', sans-serif" }}>
          {icon} {label}
        </span>
        <span style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700,
          color: value ? valueColor : 'var(--text-muted)', fontSize: '0.9rem',
        }}>
          {value || 'Not set'}
        </span>
      </div>
      <div style={{ height: 1, background: 'var(--glass-border)', marginBottom: 14 }} />
    </>
  );

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg-gradient)',
      backgroundAttachment: 'fixed', paddingBottom: 100,
    }}>
      {/* ── Header ── */}
      <header style={{
        padding: '20px 20px 16px',
        background: 'var(--header-bg)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--glass-border)',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontWeight: 800, fontSize: '1.15rem', color: 'var(--text-primary)',
          }}>
            👤 My Profile
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={toggleTheme} style={{
              background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
              borderRadius: 20, padding: '6px 14px', cursor: 'pointer',
              color: 'var(--text-primary)', fontSize: 14,
              display: 'flex', alignItems: 'center', gap: 6,
              transition: 'all 0.2s', backdropFilter: 'blur(8px)',
            }}>{isDark ? '☀️' : '🌙'}</button>
          {isStudent && !editMode && (
            <button
              onClick={() => setEditMode(true)}
              style={{
                background: 'rgba(0,212,255,0.12)', border: '1px solid rgba(0,212,255,0.3)',
                color: '#00D4FF', padding: '8px 16px', borderRadius: 12,
                cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: 600, fontSize: '0.8rem',
              }}
            >
              ✏️ Edit
            </button>
          )}
          {isStudent && editMode && (
            <button
              onClick={() => { setEditMode(false); setYear(savedYear); setRoomNumber(savedRoom); setError(''); }}
              style={{
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
                color: '#EF4444', padding: '8px 16px', borderRadius: 12,
                cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: 600, fontSize: '0.8rem',
              }}
            >
              Cancel
            </button>
          )}
          </div>
        </div>
      </header>

      <div style={{ padding: '24px 20px' }}>

        {/* ── Avatar Card ── */}
        <div style={{ ...glassCard, textAlign: 'center', padding: '32px 20px' }}>
          {/* Avatar circle */}
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: 'linear-gradient(135deg, #FF6B9D, #A78BFA)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            fontSize: '1.8rem', fontWeight: 800,
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            color: 'white', boxShadow: '0 4px 24px rgba(255,107,157,0.4)',
          }}>
            {initials}
          </div>
          <div style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontWeight: 800, fontSize: '1.2rem',
            color: 'var(--text-primary)', marginBottom: 4,
          }}>
            {displayName}
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--accent-cyan)', fontFamily: "'Inter', sans-serif", marginBottom: 10 }}>
            {userEmail}
          </div>
          <span style={{
            background: roleBadge.bg, border: `1px solid ${roleBadge.border}`,
            color: roleBadge.color, borderRadius: 20, padding: '4px 14px',
            fontSize: '0.75rem', fontWeight: 700,
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}>
            {roleBadge.icon} {userRole}
          </span>
        </div>

        {/* ── Success toast ── */}
        {saved && (
          <div style={{
            background: 'rgba(0,245,160,0.12)', border: '1px solid rgba(0,245,160,0.3)',
            borderRadius: 14, padding: '12px 16px', marginBottom: 16,
            color: '#00F5A0', textAlign: 'center',
            fontFamily: "'Inter', sans-serif", fontSize: '0.88rem',
            animation: 'fadeUp 0.3s ease',
          }}>
            ✅ Profile saved successfully!
          </div>
        )}

        {/* ── Error ── */}
        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
            borderRadius: 14, padding: '12px 16px', marginBottom: 16,
            color: '#EF4444', fontFamily: "'Inter', sans-serif", fontSize: '0.85rem',
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* ── Hostel Info — STUDENTS ONLY ── */}
        {isStudent && (
          <div style={glassCard}>
            <div style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 700, fontSize: '0.95rem',
              color: 'var(--text-primary)', marginBottom: 16,
            }}>
              🏠 Hostel Info
            </div>

            {!editMode ? (
              // ── View mode ──
              <>
                {infoRow('🎓', 'Year of Study', yearLabel, 'var(--accent-cyan)')}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontFamily: "'Inter', sans-serif" }}>
                    🏠 Room Number
                  </span>
                  <span style={{
                    fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700,
                    color: savedRoom ? 'var(--accent-cyan)' : 'var(--text-muted)', fontSize: '0.9rem',
                  }}>
                    {savedRoom || 'Not set'}
                  </span>
                </div>
              </>
            ) : (
              // ── Edit mode ──
              <>
                <label style={labelStyle}>🎓 Year of Study</label>
                <select
                  style={selectStyle} value={year}
                  onChange={e => setYear(e.target.value)}
                  onFocus={focus} onBlur={blur}
                >
                  <option value="" disabled>Select your year</option>
                  <option value="1">🎓 1st Year</option>
                  <option value="2">🎓 2nd Year</option>
                  <option value="3">🎓 3rd Year</option>
                  <option value="4">🎓 4th Year</option>
                </select>

                <label style={labelStyle}>🏠 Room Number (3 digits)</label>
                <input
                  style={inputStyle} type="text" inputMode="numeric"
                  maxLength={3} placeholder="e.g. 108 or 207"
                  value={roomNumber}
                  onChange={e => { const v = e.target.value.replace(/\D/g, ''); if (v.length <= 3) setRoomNumber(v); }}
                  onKeyDown={e => e.key === 'Enter' && handleSave()}
                  onFocus={focus} onBlur={blur}
                />

                <button
                  onClick={handleSave}
                  style={{
                    width: '100%', padding: '14px',
                    background: 'linear-gradient(135deg, #FF6B9D, #A78BFA)',
                    border: 'none', borderRadius: 12,
                    color: 'white', cursor: 'pointer',
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontWeight: 700, fontSize: '0.95rem',
                    boxShadow: '0 4px 20px rgba(255,107,157,0.35)',
                    transition: 'opacity 0.2s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                >
                  💾 Save Changes
                </button>
              </>
            )}
          </div>
        )}

        {/* ── Worker Info — WORKERS ONLY ── */}
        {userRole === 'WORKER' && (() => {
          const workerTypesStr = localStorage.getItem('workerTypes') || '';
          const workerTypesList = workerTypesStr.split(',').filter(Boolean);
          const maxC = localStorage.getItem('maxComplaints') || '2';
          const EMOJI = {
            ELECTRICAL: '⚡', PLUMBING: '🔧', CLEANING: '🧹', AC_REPAIR: '❄️',
            CARPENTRY: '🪚', PAINTING: '🎨', GENERAL_MAINTENANCE: '🔨', PEST_CONTROL: '🐛',
          };
          const TYPE_COLOR = {
            ELECTRICAL: '#F97316', PLUMBING: '#3B82F6', CLEANING: '#00D4FF', AC_REPAIR: '#06B6D4',
            CARPENTRY: '#D97706', PAINTING: '#8B5CF6', GENERAL_MAINTENANCE: '#A78BFA', PEST_CONTROL: '#EF4444',
          };
          return (
            <div style={glassCard}>
              <div style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: 700, fontSize: '0.95rem',
                color: 'var(--text-primary)', marginBottom: 16,
              }}>
                👷 Worker Info
              </div>

              {infoRow('📞', 'Phone', userPhone || 'Not set', 'var(--accent-cyan)')}
              {infoRow('📋', 'Max Complaints', maxC, '#FBBF24')}

              <div style={{ marginTop: 12 }}>
                <div style={{
                  fontSize: '0.82rem', color: 'var(--text-secondary)',
                  fontFamily: "'Inter', sans-serif", marginBottom: 10,
                }}>
                  🔧 Work Specializations
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {workerTypesList.length > 0 ? workerTypesList.map(t => {
                    const color = TYPE_COLOR[t] || '#6B7280';
                    return (
                      <span key={t} style={{
                        padding: '5px 12px', borderRadius: 10,
                        background: `${color}18`, border: `1px solid ${color}44`,
                        color: color, fontSize: '0.78rem', fontWeight: 700,
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                      }}>
                        {EMOJI[t] || '📌'} {t.replace(/_/g, ' ')}
                      </span>
                    );
                  }) : (
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontFamily: "'Inter', sans-serif" }}>
                      No specializations set
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {/* ── Account Card ── */}
        <div style={glassCard}>
          <div style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontWeight: 700, fontSize: '0.95rem',
            color: 'var(--text-primary)', marginBottom: 16,
          }}>
            ⚙️ Account
          </div>
          {infoRow('📧', 'Email', userEmail, 'var(--accent-cyan)')}
          {infoRow('🎭', 'Role', userRole, roleBadge.color)}
          {userPhone && infoRow('📞', 'Phone', userPhone, 'var(--text-primary)')}

          <button
            onClick={handleLogout}
            style={{
              width: '100%', padding: '13px',
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: 12, color: '#EF4444',
              cursor: 'pointer',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 700, fontSize: '0.9rem',
              transition: 'background 0.2s', marginTop: 4,
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.15)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
          >
            🚪 Logout
          </button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
