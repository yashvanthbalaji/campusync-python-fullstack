// ===== src/pages/AdminDashboard.jsx — Ocean Glassmorphism Admin Panel =====

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import axios from 'axios';

const API = 'http://localhost:8080';

// ── Category colors ──
const CAT_COLOR = {
  MAINTENANCE: '#A78BFA',
  CLEANLINESS: '#00D4FF',
  FOOD: '#FBBF24',
  ELECTRICAL: '#F97316',
  PLUMBING: '#3B82F6',
  OTHER: '#6B7280',
};

// ── Status badge config ──
const STATUS_BADGE = {
  PENDING:     { bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.4)', color: '#FF6B6B', label: '🔴 Pending' },
  IN_PROGRESS: { bg: 'rgba(251,191,36,0.15)', border: 'rgba(251,191,36,0.4)', color: '#FBBF24', label: '🟡 In Progress' },
  RESOLVED:    { bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.4)', color: '#10B981', label: '🟢 Resolved' },
  OPEN:        { bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.4)', color: '#FF6B6B', label: '🔴 Open' },
};

// ── Time-of-day emoji ──
const TOD_EMOJI = { MORNING: '🌅', AFTERNOON: '☀️', EVENING: '🌆', NIGHT: '🌙' };

// ── Format date/time ──
function fmtDate(d) {
  if (!d) return '';
  const dt = new Date(d);
  return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
function fmtTime(d) {
  if (!d) return '';
  const dt = new Date(d);
  return dt.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
}
function fmtFull(d) { return d ? `${fmtDate(d)}, ${fmtTime(d)}` : ''; }

// ── Stat card (reused pattern) ──
function StatCard({ icon, count, label, glowColor, delay }) {
  return (
    <div
      style={{
        background: 'var(--glass-bg)',
        border: '1px solid var(--glass-border)',
        borderRadius: 20,
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        padding: '20px 16px',
        position: 'relative', overflow: 'hidden',
        animation: `fadeUp 0.5s ${delay}s both`,
        flex: '1 1 0', minWidth: 130,
      }}
    >
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 3,
        background: glowColor,
        borderRadius: '20px 20px 0 0',
        boxShadow: `0 0 12px ${glowColor}88`,
      }} />
      <div style={{
        width: 40, height: 40,
        background: `${glowColor}18`,
        borderRadius: 12,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 20, marginBottom: 10,
      }}>
        {icon}
      </div>
      <div style={{
        fontFamily: "'Plus Jakarta Sans',sans-serif",
        fontWeight: 800, fontSize: '1.6rem',
        color: 'var(--text-primary)',
      }}>{count}</div>
      <div style={{
        fontFamily: "'Inter',sans-serif",
        fontSize: '0.75rem', color: 'var(--text-secondary)',
        marginTop: 2,
      }}>{label}</div>
    </div>
  );
}

export default function AdminDashboard() {
  const { token, role: contextRole } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  // Use localStorage as primary role source (set by Login.jsx),
  // fallback to AuthContext (from JWT decode)
  const userRole = localStorage.getItem('userRole') || contextRole || '';
  const authToken = token || localStorage.getItem('token');
  const currentEmail = localStorage.getItem('userEmail') || '';
  const currentName = localStorage.getItem('userName') || currentEmail.split('@')[0];

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName');
    localStorage.removeItem('userPhone');
    localStorage.removeItem('workerTypes');
    localStorage.removeItem('maxComplaints');
    navigate('/login');
  };

  const [users, setUsers] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [tab, setTab] = useState('COMPLAINTS'); // COMPLAINTS | USERS
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);

  const headers = { Authorization: `Bearer ${authToken}` };

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Fetch all data ──
  const fetchData = useCallback(async () => {
    if (!authToken) return;
    setLoading(true);
    try {
      console.log('🛡️ Admin fetching data with token:', authToken?.substring(0, 20) + '...');
      const [usersRes, complaintsRes] = await Promise.all([
        axios.get(`${API}/api/auth/users`, { headers }).catch(err => {
          console.error('❌ Users fetch failed:', err.response?.status, err.response?.data);
          return { data: [] };
        }),
        axios.get(`${API}/api/complaints/all`, { headers }).catch(err => {
          console.error('❌ Complaints fetch failed:', err.response?.status, err.response?.data);
          return { data: [] };
        }),
      ]);
      console.log('✅ Users fetched:', usersRes.data?.length, '| Complaints:', complaintsRes.data?.length);
      setUsers(Array.isArray(usersRes.data) ? usersRes.data : []);
      setComplaints(Array.isArray(complaintsRes.data) ? complaintsRes.data : []);
    } catch (e) {
      console.error('Admin fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, [authToken]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Role change ──
  const handleRoleChange = async (email, newRole) => {
    try {
      await axios.put(`${API}/api/auth/assign-role`, { email, role: newRole }, { headers });
      showToast(`✅ ${email} is now ${newRole}`);
      fetchData();
    } catch (e) {
      showToast(e.response?.data?.error || 'Role update failed', false);
    }
  };

  // ── Stats ──
  const today = new Date().toDateString();
  const todayComplaints = complaints.filter(c => c.createdAt && new Date(c.createdAt).toDateString() === today);
  const pendingCount = complaints.filter(c => c.status === 'PENDING' || c.status === 'IN_PROGRESS' || c.status === 'OPEN').length;
  const resolvedCount = complaints.filter(c => c.status === 'RESOLVED').length;
  const workerCount = users.filter(u => u.role === 'WORKER').length;

  // ── Group complaints by date ──
  const groupedByDate = {};
  complaints.forEach(c => {
    const dateKey = c.createdAt ? fmtDate(c.createdAt) : 'Unknown';
    if (!groupedByDate[dateKey]) groupedByDate[dateKey] = [];
    groupedByDate[dateKey].push(c);
  });
  // Sort dates newest first
  const sortedDates = Object.keys(groupedByDate).sort((a, b) => {
    const da = new Date(groupedByDate[a][0]?.createdAt || 0);
    const db = new Date(groupedByDate[b][0]?.createdAt || 0);
    return db - da;
  });

  // ── Guard: redirect if not admin ──
  if (userRole !== 'ADMIN') {
    return (
      <div style={{
        minHeight: '100vh', background: 'var(--bg-gradient)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#FF6B6B', fontFamily: "'Plus Jakarta Sans',sans-serif",
        fontSize: '1.2rem', fontWeight: 700,
      }}>
        🚫 Admin access only
        <button
          onClick={() => navigate('/dashboard')}
          style={{
            marginLeft: 16, padding: '10px 20px',
            background: 'linear-gradient(135deg,#FF6B9D,#A78BFA)',
            border: 'none', borderRadius: 12, color: 'white',
            fontWeight: 700, cursor: 'pointer',
          }}
        >
          ← Go Home
        </button>
      </div>
    );
  }

  // ── Styles ──
  const s = {
    page: {
      minHeight: '100vh',
      background: 'var(--bg-gradient)',
      backgroundAttachment: 'fixed',
      padding: '0 0 40px',
    },
    header: {
      fontFamily: "'Plus Jakarta Sans',sans-serif",
      fontWeight: 800, fontSize: '1.4rem',
      color: 'var(--text-primary)',
      marginBottom: 4,
      animation: 'fadeUp 0.4s both',
    },
    subtitle: {
      fontFamily: "'Inter',sans-serif",
      fontSize: '0.82rem', color: 'var(--text-secondary)',
      marginBottom: 20,
      animation: 'fadeUp 0.4s 0.1s both',
    },
    tabRow: {
      display: 'flex', gap: 8, marginBottom: 20,
      animation: 'fadeUp 0.4s 0.15s both',
    },
    tabBtn: (active) => ({
      flex: 1, padding: '12px 16px',
      background: active ? 'linear-gradient(135deg,#FF6B9D,#A78BFA)' : 'var(--glass-bg)',
      border: `1px solid ${active ? 'transparent' : 'var(--glass-border)'}`,
      borderRadius: 14, color: 'white',
      fontFamily: "'Plus Jakarta Sans',sans-serif",
      fontWeight: 700, fontSize: '0.85rem',
      cursor: 'pointer',
      boxShadow: active ? '0 4px 16px rgba(255,107,157,0.3)' : 'none',
      transition: 'all 0.2s',
    }),
    glass: {
      background: 'var(--glass-bg)',
      border: '1px solid var(--glass-border)',
      borderRadius: 20,
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      padding: 20,
      marginBottom: 16,
    },
    sectionTitle: {
      fontFamily: "'Plus Jakarta Sans',sans-serif",
      fontWeight: 700, fontSize: '1rem',
      color: 'var(--text-primary)',
      marginBottom: 14,
    },
    table: {
      width: '100%', borderCollapse: 'separate', borderSpacing: '0 6px',
    },
    th: {
      fontFamily: "'Plus Jakarta Sans',sans-serif",
      fontWeight: 600, fontSize: '0.72rem',
      color: 'var(--text-muted)',
      textAlign: 'left', padding: '8px 10px',
      letterSpacing: '0.05em',
    },
    td: {
      fontFamily: "'Inter',sans-serif",
      fontSize: '0.82rem', color: 'var(--text-primary)',
      padding: '10px',
      background: 'rgba(255,255,255,0.03)',
      borderTop: '1px solid var(--glass-border)',
    },
    select: {
      background: 'rgba(255,255,255,0.06)',
      border: '1px solid var(--glass-border)',
      borderRadius: 10, padding: '7px 10px',
      color: 'var(--text-primary)',
      fontFamily: "'Inter',sans-serif",
      fontSize: '0.78rem',
      cursor: 'pointer', outline: 'none',
    },
    badge: (color) => ({
      display: 'inline-block',
      padding: '3px 10px',
      background: `${color}18`,
      border: `1px solid ${color}44`,
      borderRadius: 8,
      fontSize: '0.7rem', fontWeight: 700,
      color: color,
      fontFamily: "'Plus Jakarta Sans',sans-serif",
    }),
    card: {
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid var(--glass-border)',
      borderRadius: 16,
      padding: 16,
      marginBottom: 10,
      transition: 'border-color 0.2s',
    },
  };

  // ══════════════════════════════════════════════════════════════
  //  RENDER
  // ══════════════════════════════════════════════════════════════

  return (
    <div style={s.page}>
      {/* ══ ADMIN TOP NAV ══ */}
      <header style={{
        background: 'var(--header-bg)', backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--glass-border)',
        padding: '16px 20px', position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 24 }}>🛡️</span>
            <div>
              <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-primary)' }}>
                {currentName}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: "'Inter',sans-serif" }}>
                {currentEmail}
              </div>
            </div>
            <span style={{
              background: 'linear-gradient(135deg,#FF6B9D,#A78BFA)', color: 'white',
              padding: '2px 12px', borderRadius: 20, fontSize: '0.68rem', fontWeight: 700,
              fontFamily: "'Plus Jakarta Sans',sans-serif", marginLeft: 4,
            }}>ADMIN</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={toggleTheme} style={{
              background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
              borderRadius: 20, padding: '6px 14px', cursor: 'pointer',
              color: 'var(--text-primary)', fontSize: 14,
              display: 'flex', alignItems: 'center', gap: 6,
              transition: 'all 0.2s', backdropFilter: 'blur(8px)',
            }}>{isDark ? '☀️' : '🌙'}</button>
            <button onClick={handleLogout} style={{
              background: 'rgba(255,107,157,0.1)', border: '1px solid rgba(255,107,157,0.25)',
              color: '#FF6B9D', padding: '8px 16px', borderRadius: 12, cursor: 'pointer',
              fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 600, fontSize: '0.78rem',
            }}>🚪 Logout</button>
          </div>
        </div>
        {/* Admin nav tabs */}
        <div style={{ display: 'flex', gap: 6 }}>
          {[
            { key: 'COMPLAINTS', icon: '📋', label: 'Complaints' },
            { key: 'USERS', icon: '👥', label: 'Users & Roles' },
            { key: 'LOSTFOUND', icon: '🔍', label: 'Lost & Found' },
          ].map(n => (
            <button key={n.key} onClick={() => n.key === 'LOSTFOUND' ? navigate('/lost-found') : setTab(n.key)} style={{
              flex: 1, padding: '8px 6px', borderRadius: 10,
              background: tab === n.key ? 'linear-gradient(135deg,#FF6B9D,#A78BFA)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${tab === n.key ? 'transparent' : 'var(--glass-border)'}`,
              color: 'white', fontFamily: "'Plus Jakarta Sans',sans-serif",
              fontWeight: 600, fontSize: '0.72rem', cursor: 'pointer',
              transition: 'all 0.2s',
            }}>{n.icon} {n.label}</button>
          ))}
        </div>
      </header>

      <div style={{ padding: '16px 16px 0' }}>
      {/* Sub-header */}
      <div style={{ ...s.subtitle, marginTop: 4 }}>
        {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <StatCard icon="📋" count={todayComplaints.length} label="Today" glowColor="#00D4FF" delay={0.1} />
        <StatCard icon="🔴" count={pendingCount} label="Pending" glowColor="#FF6B9D" delay={0.15} />
        <StatCard icon="✅" count={resolvedCount} label="Resolved" glowColor="#10B981" delay={0.2} />
        <StatCard icon="👷" count={workerCount} label="Workers" glowColor="#A78BFA" delay={0.25} />
      </div>

      {/* Tab switcher */}
      <div style={s.tabRow}>
        <button style={s.tabBtn(tab === 'COMPLAINTS')} onClick={() => setTab('COMPLAINTS')}>
          📋 Complaints
        </button>
        <button style={s.tabBtn(tab === 'USERS')} onClick={() => setTab('USERS')}>
          👥 Role Management
        </button>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40, fontFamily: "'Inter',sans-serif" }}>
          ⏳ Loading...
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/*  USERS TAB                                                */}
      {/* ══════════════════════════════════════════════════════════ */}
      {!loading && tab === 'USERS' && (
        <div style={s.glass}>
          <div style={s.sectionTitle}>👥 All Users ({users.length})</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>NAME</th>
                  <th style={s.th}>EMAIL</th>
                  <th style={s.th}>ROLE</th>
                  <th style={s.th}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => (
                  <tr key={u.id || i}>
                    <td style={s.td}>
                      <span style={{ fontWeight: 600 }}>{u.name || '—'}</span>
                    </td>
                    <td style={{ ...s.td, color: '#00D4FF', fontSize: '0.78rem' }}>{u.email}</td>
                    <td style={s.td}>
                      <span style={s.badge(
                        u.role === 'ADMIN' ? '#FF6B9D' :
                        u.role === 'WORKER' ? '#A78BFA' : '#10B981'
                      )}>
                        {u.role === 'ADMIN' ? '🛡️' : u.role === 'WORKER' ? '👷' : '🎓'} {u.role}
                      </span>
                    </td>
                    <td style={s.td}>
                      {u.email === currentEmail ? (
                        <span style={{
                          display: 'inline-block', padding: '4px 12px',
                          background: 'rgba(255,255,255,0.06)',
                          border: '1px solid var(--glass-border)',
                          borderRadius: 8, fontSize: '0.72rem', fontWeight: 600,
                          color: 'var(--text-muted)',
                          fontFamily: "'Plus Jakarta Sans',sans-serif",
                        }}>You (Current Admin)</span>
                      ) : (
                        <select
                          style={s.select}
                          value=""
                          onChange={e => {
                            if (e.target.value) handleRoleChange(u.email, e.target.value);
                          }}
                        >
                          <option value="">Change role...</option>
                          {u.role !== 'STUDENT' && <option value="STUDENT">Make Student</option>}
                          {u.role !== 'WORKER' && <option value="WORKER">Make Worker</option>}
                          {u.role !== 'ADMIN' && <option value="ADMIN">Make Admin</option>}
                        </select>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {users.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 30, fontFamily: "'Inter',sans-serif" }}>
              No users found.
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/*  COMPLAINTS TAB                                           */}
      {/* ══════════════════════════════════════════════════════════ */}
      {!loading && tab === 'COMPLAINTS' && (
        <div>
          {sortedDates.length === 0 && (
            <div style={{
              ...s.glass, textAlign: 'center', color: 'var(--text-muted)',
              fontFamily: "'Inter',sans-serif", padding: 40,
            }}>
              No complaints yet.
            </div>
          )}

          {sortedDates.map(dateKey => {
            const dayComplaints = groupedByDate[dateKey];

            // Group by time of day
            const byTod = {};
            dayComplaints.forEach(c => {
              const tod = c.timeOfDay || 'OTHER';
              if (!byTod[tod]) byTod[tod] = [];
              byTod[tod].push(c);
            });
            const todOrder = ['MORNING', 'AFTERNOON', 'EVENING', 'NIGHT', 'OTHER'];
            const activeTods = todOrder.filter(t => byTod[t]?.length);

            return (
              <div key={dateKey} style={{ marginBottom: 20 }}>
                {/* Date header */}
                <div style={{
                  fontFamily: "'Plus Jakarta Sans',sans-serif",
                  fontWeight: 700, fontSize: '0.9rem',
                  color: 'var(--text-primary)',
                  marginBottom: 12,
                  padding: '8px 14px',
                  background: 'rgba(255,255,255,0.04)',
                  borderRadius: 12,
                  border: '1px solid var(--glass-border)',
                  display: 'inline-block',
                }}>
                  📅 {dateKey} — {dayComplaints.length} complaint{dayComplaints.length > 1 ? 's' : ''}
                </div>

                {activeTods.map(tod => (
                  <div key={tod} style={{ marginBottom: 14 }}>
                    {/* Time-of-day sub-header */}
                    <div style={{
                      fontFamily: "'Plus Jakarta Sans',sans-serif",
                      fontWeight: 600, fontSize: '0.78rem',
                      color: 'var(--text-secondary)',
                      marginBottom: 8, marginLeft: 4,
                      letterSpacing: '0.04em',
                    }}>
                      {TOD_EMOJI[tod] || '⏰'} {tod === 'OTHER' ? 'Unspecified' : tod.charAt(0) + tod.slice(1).toLowerCase()}
                      {' '}({byTod[tod].length})
                    </div>

                    {byTod[tod].map(c => {
                      const sb = STATUS_BADGE[c.status] || STATUS_BADGE.PENDING;
                      const catColor = CAT_COLOR[c.category] || CAT_COLOR.OTHER;

                      return (
                        <div
                          key={c.id}
                          style={s.card}
                          onMouseEnter={e => e.currentTarget.style.borderColor = catColor + '88'}
                          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--glass-border)'}
                        >
                          {/* Top row: student + status */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                            <div>
                              <div style={{
                                fontFamily: "'Plus Jakarta Sans',sans-serif",
                                fontWeight: 700, fontSize: '0.88rem',
                                color: 'var(--text-primary)',
                              }}>
                                {c.studentName || c.studentEmail?.split('@')[0] || 'Student'}
                              </div>
                              <div style={{
                                fontFamily: "'Inter',sans-serif",
                                fontSize: '0.72rem', color: 'var(--text-muted)',
                                marginTop: 2,
                              }}>
                                {c.roomNumber ? `🚪 Room ${c.roomNumber}` : ''}{' '}
                                {c.studentEmail && <span style={{ color: '#00D4FF' }}>• {c.studentEmail}</span>}
                              </div>
                            </div>
                            <div style={{
                              padding: '4px 10px',
                              background: sb.bg, border: `1px solid ${sb.border}`,
                              borderRadius: 10, color: sb.color,
                              fontFamily: "'Plus Jakarta Sans',sans-serif",
                              fontWeight: 700, fontSize: '0.68rem',
                              whiteSpace: 'nowrap',
                            }}>
                              {sb.label}
                            </div>
                          </div>

                          {/* Category + Title */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                            <span style={s.badge(catColor)}>{c.category || 'OTHER'}</span>
                            <span style={{
                              fontFamily: "'Plus Jakarta Sans',sans-serif",
                              fontWeight: 600, fontSize: '0.85rem',
                              color: 'var(--text-primary)',
                            }}>
                              {c.title}
                            </span>
                          </div>

                          {/* Description */}
                          {c.description && (
                            <div style={{
                              fontFamily: "'Inter',sans-serif",
                              fontSize: '0.8rem', color: 'var(--text-secondary)',
                              marginBottom: 8, lineHeight: 1.5,
                            }}>
                              {c.description.length > 150 ? c.description.slice(0, 150) + '…' : c.description}
                            </div>
                          )}

                          {/* Image */}
                          {c.imagePath && (
                            <div style={{
                              width: '100%', height: 160,
                              borderRadius: 10, overflow: 'hidden',
                              background: '#1a1a2e', marginBottom: 8,
                            }}>
                              <img
                                src={`${API}/api/complaints/images/${c.imagePath}`}
                                alt="complaint"
                                onError={e => { e.target.onerror = null; e.target.parentElement.style.display = 'none'; }}
                                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                              />
                            </div>
                          )}

                          {/* Footer: time + resolved info */}
                          <div style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            marginTop: 6,
                          }}>
                            <div style={{
                              fontFamily: "'Inter',sans-serif",
                              fontSize: '0.7rem', color: 'var(--text-muted)',
                            }}>
                              🕐 {fmtFull(c.createdAt)}
                            </div>
                            {c.status === 'RESOLVED' && c.resolvedByWorker && (
                              <div style={{
                                fontFamily: "'Inter',sans-serif",
                                fontSize: '0.7rem', color: '#10B981',
                              }}>
                                ✅ {c.resolvedByWorker} {c.workerNote ? `— "${c.workerNote}"` : ''}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      </div>{/* end padding wrapper */}

      {/* ── Toast ── */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 30, left: '50%', transform: 'translateX(-50%)',
          background: toast.ok ? 'rgba(16,185,129,0.95)' : 'rgba(239,68,68,0.95)',
          color: 'white', padding: '12px 24px', borderRadius: 20,
          fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700,
          fontSize: '0.88rem', boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          zIndex: 999, backdropFilter: 'blur(12px)',
          animation: 'fadeUp 0.3s ease both',
          whiteSpace: 'nowrap',
        }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
