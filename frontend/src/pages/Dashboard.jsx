// ===== src/pages/Dashboard.jsx — Ocean Glassmorphism =====

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import NotificationBell from '../components/NotificationBell';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import axios from 'axios';

// ── Helper: decode JWT to get email/role ──
function parseJwt(token) {
  try { return JSON.parse(atob(token.split('.')[1])); }
  catch { return {}; }
}

// ── Stat Card ──
function StatCard({ icon, count, label, glowColor, onClick, delay }) {
  return (
    <div
      style={{
        background: 'var(--glass-bg)',
        border: '1px solid var(--glass-border)',
        borderRadius: 20,
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        padding: '24px 20px',
        cursor: 'pointer',
        transition: 'all 0.25s ease',
        animation: `fadeUp 0.5s ${delay}s both`,
        position: 'relative', overflow: 'hidden',
      }}
      onClick={onClick}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.borderColor = glowColor;
        e.currentTarget.style.boxShadow = `0 8px 32px ${glowColor}44`;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.borderColor = 'var(--glass-border)';
        e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.3)';
      }}
    >
      {/* Top glow border */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 3,
        background: glowColor,
        borderRadius: '20px 20px 0 0',
        boxShadow: `0 0 12px ${glowColor}88`,
      }} />
      <div style={{
        width: 48, height: 48,
        background: `${glowColor}18`,
        borderRadius: 14,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 24, marginBottom: 14,
      }}>
        {icon}
      </div>
      <div style={{
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        fontSize: '2.4rem', fontWeight: 800,
        color: 'var(--text-primary)',
        lineHeight: 1, marginBottom: 4,
      }}>
        {count}
      </div>
      <div style={{
        fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500,
      }}>
        {label}
      </div>
    </div>
  );
}

// ── Quick Action Card ──
function QuickAction({ icon, label, desc, borderColor, onClick, delay }) {
  return (
    <div
      style={{
        background: 'var(--glass-bg)',
        border: '1px solid var(--glass-border)',
        borderLeft: `3px solid ${borderColor}`,
        borderRadius: 20,
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        padding: '18px 20px',
        cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 16,
        transition: 'all 0.2s ease',
        animation: `fadeUp 0.5s ${delay}s both`,
      }}
      onClick={onClick}
      onMouseEnter={e => {
        e.currentTarget.style.background = 'var(--glass-hover)';
        e.currentTarget.style.transform = 'translateX(4px)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'var(--glass-bg)';
        e.currentTarget.style.transform = 'translateX(0)';
      }}
    >
      <div style={{
        width: 44, height: 44,
        background: `${borderColor}18`,
        borderRadius: 12,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 20, flexShrink: 0,
      }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontWeight: 700, fontSize: '0.95rem',
          color: 'var(--text-primary)', marginBottom: 2,
        }}>
          {label}
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          {desc}
        </div>
      </div>
      <span style={{ color: borderColor, fontSize: 20, fontWeight: 'bold' }}>›</span>
    </div>
  );
}

// ── Main Dashboard ──
export default function Dashboard() {
  const navigate = useNavigate();
  const { email, role, year, roomNumber, logout: ctxLogout } = useAuth();

  // FIX 6: Redirect non-students to their own dashboard
  const userRole = localStorage.getItem('userRole') || role || 'STUDENT';
  useEffect(() => {
    if (userRole === 'ADMIN') { navigate('/admin', { replace: true }); }
    else if (userRole === 'WORKER') { navigate('/worker', { replace: true }); }
  }, [userRole, navigate]);

  const [complaints, setComplaints] = useState(0);
  const [lostItems, setLostItems] = useState(0);
  const [greeting, setGreeting] = useState('');
  const [loading, setLoading] = useState(true);

  const { isDark, toggleTheme } = useTheme();

  const token = localStorage.getItem('token');
  const userName = localStorage.getItem('userName') || '';
  const firstName = userName || (email || 'Student').split('@')[0];

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 17) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');
  }, []);

  useEffect(() => {
    const headers = { Authorization: `Bearer ${token}` };
    Promise.allSettled([
      axios.get('http://localhost:8080/api/complaints/my', { headers }),
      axios.get('http://localhost:8080/api/lost-found/all', { headers }),
    ]).then(([c, l]) => {
      if (c.status === 'fulfilled') setComplaints(c.value.data?.length ?? 0);
      if (l.status === 'fulfilled') setLostItems(l.value.data?.length ?? 0);
      setLoading(false);
    });
  }, [token]);

  const handleLogout = () => {
    ctxLogout();
    navigate('/login');
  };

  const sectionLabel = {
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontWeight: 700, fontSize: '0.75rem',
    color: 'var(--accent-cyan)',
    letterSpacing: '0.12em', textTransform: 'uppercase',
    marginBottom: 14, marginTop: 28,
    textShadow: '0 0 12px rgba(0,212,255,0.4)',
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', background: 'var(--bg-gradient)',
        backgroundAttachment: 'fixed',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontSize: 56, marginBottom: 16,
            animation: 'pulseGlow 2s infinite',
          }}>⟁</div>
          <div style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            color: 'var(--text-secondary)',
          }}>
            Loading CampuSync...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-gradient)',
      backgroundAttachment: 'fixed',
      paddingBottom: 100,
    }}>
      {/* ── STICKY GLASS HEADER ── */}
      <header style={{
        background: 'var(--header-bg)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--glass-border)',
        padding: '18px 20px 20px',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', marginBottom: 16,
        }}>
          <div style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontWeight: 800, fontSize: '1.3rem',
            color: 'white',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            ⟁ <span>CampuSync</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={toggleTheme}
              style={{
                background: 'var(--glass-bg)',
                border: '1px solid var(--glass-border)',
                borderRadius: 20,
                padding: '6px 14px',
                cursor: 'pointer',
                color: 'var(--text-primary)',
                fontSize: 14,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                transition: 'all 0.2s',
                backdropFilter: 'blur(8px)',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--glass-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--glass-bg)'}
            >
              {isDark ? '☀️' : '🌙'}
            </button>
            <NotificationBell />
            <button
              style={{
                background: 'rgba(255,107,157,0.1)',
                border: '1px solid rgba(255,107,157,0.25)',
                color: 'var(--accent-coral)',
                padding: '8px 16px', borderRadius: 12,
                cursor: 'pointer',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: 600, fontSize: '0.8rem',
                transition: 'all 0.2s',
              }}
              onClick={handleLogout}
            >
              Logout ↗
            </button>
          </div>
        </div>

        {/* Greeting Card */}
        <div style={{
          background: 'var(--glass-bg)',
          border: '1px solid var(--glass-border)',
          borderRadius: 16,
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          padding: '16px 18px',
          animation: 'fadeUp 0.4s ease both',
        }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: "'Inter', sans-serif", marginBottom: 4 }}>
            Logged in as
          </div>
          <div style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontWeight: 700, fontSize: '1.1rem',
            color: 'var(--text-primary)', marginBottom: 6,
          }}>
            {greeting}, {firstName}! 👋
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              {email}
            </span>
            <span style={{
              display: 'inline-block',
              background: '#44ff44', color: '#000',
              padding: '2px 10px',
              borderRadius: 12, fontSize: '0.68rem',
              fontWeight: 800,
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}>
              STUDENT
            </span>
          </div>
          {roomNumber && (
            <div style={{
              fontSize: '0.78rem', color: 'var(--text-secondary)',
              fontFamily: "'Inter', sans-serif",
              marginTop: 6,
            }}>
              🏠 Room: {roomNumber}  |  📚 {year ? `${year}${year === '1' ? 'st' : year === '2' ? 'nd' : year === '3' ? 'rd' : 'th'} Year` : ''}
            </div>
          )}
        </div>
      </header>

      {/* ── BODY ── */}
      <div style={{ padding: '4px 20px 20px' }}>

        {/* Admin Banner */}
        {role === 'ADMIN' && (
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(167,139,250,0.12), rgba(0,212,255,0.12))',
              border: '1px solid rgba(167,139,250,0.25)',
              borderRadius: 20, padding: '16px 20px',
              marginTop: 20,
              display: 'flex', alignItems: 'center', gap: 12,
              animation: 'fadeUp 0.5s 0.1s both',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onClick={() => navigate('/admin')}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'rgba(167,139,250,0.5)';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(167,139,250,0.2)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'rgba(167,139,250,0.25)';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <span style={{ fontSize: 28 }}>🛡️</span>
            <div style={{ flex: 1 }}>
              <div style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: 700, fontSize: '0.95rem',
              }}>
                Admin Control Center
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Manage users, roles, and all complaints
              </div>
            </div>
            <span style={{ color: '#A78BFA', fontSize: 20, fontWeight: 'bold' }}>›</span>
          </div>
        )}
        {/* Worker Banner */}
        {(role === 'WORKER' || role === 'ADMIN') && (
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(0,212,255,0.12))',
              border: '1px solid rgba(16,185,129,0.25)',
              borderRadius: 20, padding: '16px 20px',
              marginTop: role === 'ADMIN' ? 10 : 20,
              display: 'flex', alignItems: 'center', gap: 12,
              animation: 'fadeUp 0.5s 0.15s both',
              cursor: 'pointer', transition: 'all 0.2s',
            }}
            onClick={() => navigate('/worker')}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'rgba(16,185,129,0.5)';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(16,185,129,0.2)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'rgba(16,185,129,0.25)';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <span style={{ fontSize: 28 }}>👷</span>
            <div style={{ flex: 1 }}>
              <div style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: 700, fontSize: '0.95rem',
              }}>
                Worker Dashboard
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                View pending complaints & resolve issues
              </div>
            </div>
            <span style={{ color: '#10B981', fontSize: 20, fontWeight: 'bold' }}>›</span>
          </div>
        )}

        {/* Stats Section */}
        <div style={sectionLabel}>📊 OVERVIEW</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <StatCard
            icon="📢" count={complaints}
            label="My Complaints"
            glowColor="var(--accent-coral)"
            onClick={() => navigate('/complaints')}
            delay={0.1}
          />
          <StatCard
            icon="🔍" count={lostItems}
            label="Lost & Found"
            glowColor="var(--accent-cyan)"
            onClick={() => navigate('/lost-found')}
            delay={0.2}
          />
        </div>

        {/* Quick Actions */}
        <div style={sectionLabel}>⚡ QUICK ACTIONS</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <QuickAction
            icon="📝" label="Raise a Complaint"
            desc="Report issues in your room or hostel"
            borderColor="var(--accent-coral)"
            onClick={() => navigate('/complaints')}
            delay={0.3}
          />
          <QuickAction
            icon="🔎" label="Report Lost Item"
            desc="Lost something? Tell us about it"
            borderColor="var(--accent-cyan)"
            onClick={() => navigate('/lost-found')}
            delay={0.35}
          />
          <QuickAction
            icon="📦" label="Report Found Item"
            desc="Found something? Help return it"
            borderColor="var(--accent-green)"
            onClick={() => navigate('/lost-found')}
            delay={0.4}
          />
        </div>

        {/* Today Card */}
        <div style={sectionLabel}>📅 TODAY</div>
        <div style={{
          background: 'var(--glass-bg)',
          border: '1px solid var(--glass-border)',
          borderRadius: 20,
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          padding: '20px',
          animation: 'fadeUp 0.5s 0.45s both',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <div style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 700, fontSize: '1.4rem',
              color: 'var(--text-primary)',
            }}>
              {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })}
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric' })}
            </div>
          </div>
          <div style={{ fontSize: 42 }}>
            {new Date().getHours() < 17 ? '☀️' : '🌙'}
          </div>
        </div>
      </div>

      {/* ── BOTTOM NAV ── */}
      <BottomNav />
    </div>
  );
}