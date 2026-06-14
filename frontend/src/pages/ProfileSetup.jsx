// ===== src/pages/ProfileSetup.jsx — Role-Aware, Ocean Glassmorphism =====

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const WORK_TYPES = [
  { key: 'ELECTRICAL',           icon: '⚡', label: 'Electrical' },
  { key: 'PLUMBING',             icon: '🚿', label: 'Plumbing' },
  { key: 'CLEANING',             icon: '🧹', label: 'Cleaning' },
  { key: 'AC_REPAIR',            icon: '❄️', label: 'AC Repair' },
  { key: 'CARPENTRY',            icon: '🪚', label: 'Carpentry' },
  { key: 'PAINTING',             icon: '🎨', label: 'Painting' },
  { key: 'GENERAL_MAINTENANCE',  icon: '🔧', label: 'General Maintenance' },
  { key: 'PEST_CONTROL',         icon: '🐛', label: 'Pest Control' },
];

export default function ProfileSetup() {
  const { email, saveProfile } = useAuth();
  const navigate = useNavigate();
  const role = localStorage.getItem('userRole') || 'STUDENT';
  const userEmail = localStorage.getItem('userEmail') || email || '';
  console.log('📋 Profile setup — role:', role, '| email:', userEmail);

  // ── Redirect ADMIN away immediately ──
  useEffect(() => {
    if (role === 'ADMIN') navigate('/admin', { replace: true });
  }, [role, navigate]);

  // ── Student state ──
  const [studentName, setStudentName] = useState(localStorage.getItem('userName') || '');
  const [studentType, setStudentType] = useState(localStorage.getItem('studentType') || 'HOSTEL');
  const [year, setYear] = useState('');
  const [roomNumber, setRoomNumber] = useState('');

  // ── Worker state ──
  const [workerName, setWorkerName] = useState(localStorage.getItem('userName') || '');
  const [workerPhone, setWorkerPhone] = useState('');
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [maxComplaints, setMaxComplaints] = useState('3');

  const [error, setError] = useState('');

  // ── Toggle work type checkbox ──
  const toggleType = (key) => {
    setSelectedTypes(prev =>
      prev.includes(key) ? prev.filter(t => t !== key) : [...prev, key]
    );
  };

  // ── Submit handlers ──
  const handleStudentSubmit = async () => {
    setError('');
    if (!studentName.trim()) { setError('Please enter your full name'); return; }
    if (!year) { setError('Please select your year of study'); return; }
    if (!roomNumber || roomNumber.length !== 3 || isNaN(roomNumber)) {
      setError('Room number must be exactly 3 digits'); return;
    }
    // Save ALL profile fields to backend permanently
    try {
      const token = localStorage.getItem('token');
      await axios.put('http://localhost:8080/api/auth/update-profile',
        {
          name: studentName.trim(),
          phoneNumber: localStorage.getItem('userPhone') || '',
          roomNumber: roomNumber,
          year: year,
          studentType: studentType
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (e) { console.error('Profile save failed (non-fatal):', e); }
    localStorage.setItem('userName', studentName.trim());
    localStorage.setItem('userRoom', roomNumber);
    localStorage.setItem('userYear', year);
    localStorage.setItem('studentType', studentType);
    saveProfile(year, roomNumber);
    localStorage.setItem('profileComplete', 'true');
    navigate('/dashboard');
  };

  const handleWorkerSubmit = async () => {
    setError('');
    if (!workerName.trim()) { setError('Please enter your name'); return; }
    if (!workerPhone.trim() || workerPhone.length < 10) { setError('Please enter a valid phone number'); return; }
    if (selectedTypes.length === 0) { setError('Please select at least one work type'); return; }

    // ── Save worker profile to DB so auto-assignment works ──
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        'http://localhost:8080/api/auth/worker-profile',
        {
          name: workerName.trim(),
          phoneNumber: workerPhone.trim(),
          workTypes: selectedTypes.join(','),
          maxComplaints: parseInt(maxComplaints),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log('✅ Worker profile saved to DB:', selectedTypes.join(','));
    } catch (error) {
      console.error('⚠️ Failed to save worker profile to DB:', error);
      // Non-fatal — still proceed with localStorage
    }

    localStorage.setItem('workerTypes', selectedTypes.join(','));
    localStorage.setItem('workerName', workerName.trim());
    localStorage.setItem('userPhone', workerPhone.trim());
    localStorage.setItem('userName', workerName.trim());
    localStorage.setItem('maxComplaints', maxComplaints);
    localStorage.setItem('profileComplete', 'true');
    navigate('/worker');
  };

  // ── Styles ──
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
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '24px', position: 'relative', overflow: 'hidden',
    },
    blob: (size, top, left, color, anim) => ({
      position: 'absolute', width: size, height: size,
      borderRadius: '50%', background: color,
      filter: 'blur(80px)', opacity: 0.35,
      top, left,
      animation: `${anim} 12s ease-in-out infinite`,
      pointerEvents: 'none',
    }),
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
    select: {
      width: '100%',
      background: 'rgba(13,13,43,0.8)',
      border: '1px solid var(--glass-border)',
      borderRadius: 14, padding: '14px 16px',
      color: 'var(--text-primary)',
      fontSize: '1rem',
      fontFamily: "'Inter', sans-serif",
      outline: 'none', marginBottom: 18,
      transition: 'border-color 0.3s, box-shadow 0.3s',
      appearance: 'none',
      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23A8B4D8' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'right 16px center',
    },
    input: {
      width: '100%', boxSizing: 'border-box',
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid var(--glass-border)',
      borderRadius: 14, padding: '14px 16px',
      color: 'var(--text-primary)',
      fontSize: '1rem',
      fontFamily: "'Inter', sans-serif",
      outline: 'none', marginBottom: 18,
      transition: 'border-color 0.3s, box-shadow 0.3s',
    },
    submitBtn: {
      width: '100%',
      background: 'linear-gradient(135deg, #FF6B9D, #A78BFA)',
      border: 'none', borderRadius: 14, padding: '16px',
      color: 'white',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      fontWeight: 700, fontSize: '1rem',
      cursor: 'pointer',
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
  };

  if (role === 'ADMIN') return null; // ADMIN never sees this

  return (
    <div style={s.page}>
      <div style={s.blob('300px', '10%', '-5%', 'rgba(167,139,250,0.3)', 'float1')} />
      <div style={s.blob('250px', '60%', '70%', 'rgba(0,212,255,0.25)', 'float2')} />
      <div style={s.blob('200px', '30%', '60%', 'rgba(255,107,157,0.25)', 'float3')} />

      <div style={{
        fontSize: 64, marginBottom: 8, textAlign: 'center',
        animation: 'pulseGlow 3s ease-in-out infinite',
        position: 'relative', zIndex: 2,
      }}>{role === 'WORKER' ? '👷' : '👤'}</div>

      <div style={s.card}>
        <div style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontWeight: 700, fontSize: '1.2rem',
          marginBottom: 8, color: 'var(--text-primary)',
        }}>
          {role === 'WORKER' ? 'Worker Profile Setup 👷' : 'Complete Your Profile 👤'}
        </div>
        <div style={{
          fontSize: '0.85rem', color: 'var(--text-secondary)',
          marginBottom: 24, fontFamily: "'Inter', sans-serif",
        }}>
          {role === 'WORKER'
            ? 'Set up your work preferences to start receiving complaints'
            : 'This helps auto-fill your forms'}
        </div>

        {/* Email display */}
        {userEmail && (
          <div style={{
            background: 'rgba(0,212,255,0.08)',
            border: '1px solid rgba(0,212,255,0.2)',
            borderRadius: 14, padding: '10px 16px',
            marginBottom: 18,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ fontSize: 16 }}>📧</span>
            <span style={{
              fontSize: '0.85rem', color: 'var(--accent-cyan)',
              fontFamily: "'Inter', sans-serif",
            }}>{userEmail}</span>
            <span style={{
              marginLeft: 'auto', background: role === 'WORKER'
                ? 'rgba(167,139,250,0.15)' : 'rgba(0,212,255,0.15)',
              border: `1px solid ${role === 'WORKER' ? 'rgba(167,139,250,0.3)' : 'rgba(0,212,255,0.3)'}`,
              color: role === 'WORKER' ? '#A78BFA' : '#00D4FF',
              borderRadius: 12, padding: '2px 10px', fontSize: '0.7rem', fontWeight: 700,
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}>{role}</span>
          </div>
        )}

        {error && <div style={s.error}>⚠️ {error}</div>}

        {/* ══════════════════════════════════════════════════════ */}
        {/*  STUDENT FORM                                         */}
        {/* ══════════════════════════════════════════════════════ */}
        {role === 'STUDENT' && (
          <>
            {/* ── Student Type Selector ── */}
            <div style={{ marginBottom: 20 }}>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 12, fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600, fontSize: '0.8rem' }}>
                🏫 I am a:
              </p>
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  type="button"
                  onClick={() => setStudentType('HOSTEL')}
                  style={{
                    flex: 1, padding: 16, borderRadius: 12,
                    border: studentType === 'HOSTEL' ? '2px solid #7c3aed' : '2px solid var(--glass-border)',
                    background: studentType === 'HOSTEL' ? 'rgba(124,58,237,0.2)' : 'var(--glass-bg)',
                    color: 'var(--text-primary)', cursor: 'pointer', fontSize: 16,
                    fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600,
                    transition: 'all 0.25s ease',
                  }}
                >
                  🏠 Hostel Student
                  <p style={{ fontSize: 11, margin: '4px 0 0', color: 'var(--text-secondary)', fontWeight: 400 }}>
                    Lost &amp; Found + Complaints
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setStudentType('COLLEGE')}
                  style={{
                    flex: 1, padding: 16, borderRadius: 12,
                    border: studentType === 'COLLEGE' ? '2px solid #06b6d4' : '2px solid var(--glass-border)',
                    background: studentType === 'COLLEGE' ? 'rgba(6,182,212,0.2)' : 'var(--glass-bg)',
                    color: 'var(--text-primary)', cursor: 'pointer', fontSize: 16,
                    fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600,
                    transition: 'all 0.25s ease',
                  }}
                >
                  🎓 College Student
                  <p style={{ fontSize: 11, margin: '4px 0 0', color: 'var(--text-secondary)', fontWeight: 400 }}>
                    Lost &amp; Found only
                  </p>
                </button>
              </div>
            </div>

            <label style={s.label}>👤 Full Name</label>
            <input
              style={s.input}
              type="text"
              placeholder="Enter your full name"
              value={studentName}
              onChange={e => setStudentName(e.target.value)}
              onFocus={focusHandler} onBlur={blurHandler}
            />

            <label style={s.label}>🎓 Year of Study</label>
            <select
              style={s.select}
              value={year}
              onChange={e => setYear(e.target.value)}
              onFocus={focusHandler} onBlur={blurHandler}
            >
              <option value="" disabled>Select your year</option>
              <option value="1">🎓 1st Year</option>
              <option value="2">🎓 2nd Year</option>
              <option value="3">🎓 3rd Year</option>
              <option value="4">🎓 4th Year</option>
            </select>

            <label style={s.label}>🏠 Room Number</label>
            <input
              style={s.input}
              type="text"
              inputMode="numeric"
              maxLength={3}
              placeholder="e.g. 108 or 207"
              value={roomNumber}
              onChange={e => {
                const v = e.target.value.replace(/\D/g, '');
                if (v.length <= 3) setRoomNumber(v);
              }}
              onKeyDown={e => e.key === 'Enter' && handleStudentSubmit()}
              onFocus={focusHandler} onBlur={blurHandler}
            />

            <button
              style={s.submitBtn}
              onClick={handleStudentSubmit}
              onMouseEnter={e => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 8px 32px rgba(255,107,157,0.5)';
              }}
              onMouseLeave={e => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 20px rgba(255,107,157,0.35)';
              }}
            >
              Save & Continue 🚀
            </button>
          </>
        )}

        {/* ══════════════════════════════════════════════════════ */}
        {/*  WORKER FORM                                          */}
        {/* ══════════════════════════════════════════════════════ */}
        {role === 'WORKER' && (
          <>
            <label style={s.label}>👤 Your Name</label>
            <input
              style={s.input}
              type="text"
              placeholder="Full name"
              value={workerName}
              onChange={e => setWorkerName(e.target.value)}
              onFocus={focusHandler} onBlur={blurHandler}
            />

            <label style={s.label}>📞 Phone Number</label>
            <input
              style={s.input}
              type="tel"
              inputMode="numeric"
              placeholder="e.g. 9876543210"
              value={workerPhone}
              onChange={e => {
                const v = e.target.value.replace(/\D/g, '');
                if (v.length <= 10) setWorkerPhone(v);
              }}
              onFocus={focusHandler} onBlur={blurHandler}
            />

            <label style={s.label}>🔧 Work Types (select all that apply)</label>
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 18,
            }}>
              {WORK_TYPES.map(wt => {
                const active = selectedTypes.includes(wt.key);
                return (
                  <div
                    key={wt.key}
                    onClick={() => toggleType(wt.key)}
                    style={{
                      padding: '10px 12px', borderRadius: 12, cursor: 'pointer',
                      background: active ? 'rgba(167,139,250,0.15)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${active ? 'rgba(167,139,250,0.4)' : 'var(--glass-border)'}`,
                      display: 'flex', alignItems: 'center', gap: 8,
                      transition: 'all 0.2s',
                    }}
                  >
                    <span style={{
                      width: 18, height: 18, borderRadius: 4,
                      border: `2px solid ${active ? '#A78BFA' : 'rgba(255,255,255,0.2)'}`,
                      background: active ? '#A78BFA' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, color: 'white', flexShrink: 0,
                      transition: 'all 0.2s',
                    }}>
                      {active ? '✓' : ''}
                    </span>
                    <span style={{
                      fontSize: '0.78rem', color: active ? '#A78BFA' : 'var(--text-secondary)',
                      fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600,
                    }}>
                      {wt.icon} {wt.label}
                    </span>
                  </div>
                );
              })}
            </div>

            <label style={s.label}>📊 Max Complaints at Once</label>
            <select
              style={s.select}
              value={maxComplaints}
              onChange={e => setMaxComplaints(e.target.value)}
              onFocus={focusHandler} onBlur={blurHandler}
            >
              {[1,2,3,4,5].map(n => (
                <option key={n} value={String(n)}>{n} complaint{n > 1 ? 's' : ''}</option>
              ))}
            </select>

            <button
              style={{
                ...s.submitBtn,
                background: 'linear-gradient(135deg, #A78BFA, #7C3AED)',
                boxShadow: '0 4px 20px rgba(167,139,250,0.35)',
              }}
              onClick={handleWorkerSubmit}
              onMouseEnter={e => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 8px 32px rgba(167,139,250,0.5)';
              }}
              onMouseLeave={e => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 20px rgba(167,139,250,0.35)';
              }}
            >
              Start Working 👷
            </button>
          </>
        )}
      </div>
    </div>
  );
}
