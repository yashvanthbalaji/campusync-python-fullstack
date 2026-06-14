// ===== src/pages/WorkerDashboard.jsx — Ocean Glassmorphism Worker Panel =====

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import axios from 'axios';

const API = 'http://localhost:8080';

// ── Category colors ──
const CAT_COLOR = {
  ELECTRICAL: '#F97316', PLUMBING: '#3B82F6', CLEANING: '#00D4FF',
  AC_REPAIR: '#06B6D4', CARPENTRY: '#D97706', PAINTING: '#8B5CF6',
  GENERAL_MAINTENANCE: '#A78BFA', PEST_CONTROL: '#EF4444', OTHER: '#6B7280',
};
const WORK_TYPE_EMOJI = {
  ELECTRICAL: '⚡', PLUMBING: '🔧', CLEANING: '🧹', AC_REPAIR: '❄️',
  CARPENTRY: '🪚', PAINTING: '🎨', GENERAL_MAINTENANCE: '🔨', PEST_CONTROL: '🐛', OTHER: '📌',
};

// ── Time-of-day emoji ──
const TOD = { MORNING: '🌅', AFTERNOON: '☀️', EVENING: '🌆', NIGHT: '🌙' };

// ── Format helpers ──
function fmtDate(d) {
  if (!d) return '';
  const dt = new Date(d);
  const today = new Date();
  const yest = new Date(); yest.setDate(yest.getDate() - 1);
  if (dt.toDateString() === today.toDateString()) return 'Today';
  if (dt.toDateString() === yest.toDateString()) return 'Yesterday';
  return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
function fmtTime(d) {
  if (!d) return '';
  return new Date(d).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
}
function fmtFull(d) { return d ? `${fmtDate(d)}, ${fmtTime(d)}` : ''; }

// ── Stat card ──
function StatCard({ icon, count, label, glowColor, delay }) {
  return (
    <div style={{
      background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
      borderRadius: 20, backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.3)', padding: '20px 16px',
      position: 'relative', overflow: 'hidden', flex: '1 1 0', minWidth: 100,
      animation: `fadeUp 0.5s ${delay}s both`,
    }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 3,
        background: glowColor, borderRadius: '20px 20px 0 0',
        boxShadow: `0 0 12px ${glowColor}88`,
      }} />
      <div style={{
        width: 40, height: 40, background: `${glowColor}18`, borderRadius: 12,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 20, marginBottom: 10,
      }}>{icon}</div>
      <div style={{
        fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800,
        fontSize: '1.5rem', color: 'var(--text-primary)',
      }}>{count}</div>
      <div style={{
        fontFamily: "'Inter',sans-serif", fontSize: '0.72rem',
        color: 'var(--text-secondary)', marginTop: 2,
      }}>{label}</div>
    </div>
  );
}

export default function WorkerDashboard() {
  const { token, role: contextRole, email: contextEmail } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  // Use localStorage as primary source (set by Login.jsx), fallback to AuthContext
  const userRole = localStorage.getItem('userRole') || contextRole || '';
  const authToken = token || localStorage.getItem('token');
  const workerEmail = localStorage.getItem('userEmail') || contextEmail || '';
  const workerName = localStorage.getItem('userName') || workerEmail.split('@')[0];
  const workerTypes = (localStorage.getItem('workerTypes') || '').split(',').filter(Boolean);

  const [pending, setPending] = useState([]);
  const [myComplaints, setMyComplaints] = useState([]);
  const [tab, setTab] = useState('PENDING');
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);

  // Resolve modal state
  const [resolveId, setResolveId] = useState(null);
  const [workerNote, setWorkerNote] = useState('');
  const [resolving, setResolving] = useState(false);

  // Image zoom
  const [zoomImg, setZoomImg] = useState(null);

  const headers = { Authorization: `Bearer ${authToken}`, 'X-User-Email': workerEmail };

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Fetch data — use /my-assigned for worker's own complaints ──
  const fetchData = useCallback(async () => {
    if (!authToken) return;
    setLoading(true);
    try {
      const [assignedRes] = await Promise.all([
        axios.get(`${API}/api/complaints/my-assigned`, { headers }).catch(() => ({ data: [] })),
      ]);
      const assigned = Array.isArray(assignedRes.data) ? assignedRes.data : [];
      setMyComplaints(assigned);
      setPending(assigned.filter(c => c.status === 'PENDING' || c.status === 'IN_PROGRESS' || c.status === 'OPEN'));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [authToken]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Resolve ──
  const handleResolve = async () => {
    if (!resolveId) return;
    setResolving(true);
    try {
      await axios.put(`${API}/api/complaints/${resolveId}/resolve`,
        { workerNote: workerNote || '' }, { headers });
      showToast('Complaint marked as resolved! ✅');
      setResolveId(null);
      setWorkerNote('');
      fetchData();
    } catch (e) {
      showToast(e.response?.data?.error || 'Failed to resolve', false);
    } finally { setResolving(false); }
  };

  // ── Stats ──
  const today = new Date().toDateString();
  const resolved = myComplaints.filter(c => c.status === 'RESOLVED');
  const resolvedToday = resolved.filter(c => c.resolvedAt && new Date(c.resolvedAt).toDateString() === today);

  // ── Group by date ──
  const groupByDate = (items) => {
    const groups = {};
    items.forEach(c => {
      const key = c.createdAt ? fmtDate(c.createdAt) : 'Unknown';
      if (!groups[key]) groups[key] = [];
      groups[key].push(c);
    });
    // Sort keys: Today first, Yesterday second, then by date desc
    const sorted = Object.keys(groups).sort((a, b) => {
      if (a === 'Today') return -1;
      if (b === 'Today') return 1;
      if (a === 'Yesterday') return -1;
      if (b === 'Yesterday') return 1;
      return new Date(groups[b][0]?.createdAt || 0) - new Date(groups[a][0]?.createdAt || 0);
    });
    return sorted.map(key => ({ date: key, items: groups[key] }));
  };

  const displayList = tab === 'PENDING' ? pending : resolved;
  const grouped = groupByDate(displayList);

  // ── Guard ──
  if (userRole !== 'WORKER' && userRole !== 'ADMIN') {
    return (
      <div style={{
        minHeight: '100vh', background: 'var(--bg-gradient)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: 16,
        color: '#FF6B6B', fontFamily: "'Plus Jakarta Sans',sans-serif",
        fontSize: '1.1rem', fontWeight: 700,
      }}>
        🚫 Worker/Admin access only
        <button onClick={() => navigate('/dashboard')} style={{
          padding: '10px 24px', background: 'linear-gradient(135deg,#FF6B9D,#A78BFA)',
          border: 'none', borderRadius: 12, color: 'white', fontWeight: 700, cursor: 'pointer',
        }}>← Go Home</button>
      </div>
    );
  }

  // ── Complaint card ──
  const renderCard = (c) => {
    const catColor = CAT_COLOR[c.category] || CAT_COLOR.OTHER;
    const isPending = c.status === 'PENDING' || c.status === 'IN_PROGRESS' || c.status === 'OPEN';

    return (
      <div
        key={c.id}
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid var(--glass-border)',
          borderRadius: 16, padding: 16, marginBottom: 10,
          transition: 'border-color 0.2s',
        }}
        onMouseEnter={e => e.currentTarget.style.borderColor = catColor + '66'}
        onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--glass-border)'}
      >
        {/* Top: room + status */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <div>
            <div style={{
              fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700,
              fontSize: '0.88rem', color: 'var(--text-primary)',
            }}>
              {c.roomNumber ? `🏠 Room ${c.roomNumber}` : '🏠 —'}
            </div>
            <div style={{
              fontFamily: "'Inter',sans-serif", fontSize: '0.75rem',
              color: 'var(--text-muted)', marginTop: 2,
            }}>
              👤 {c.studentName || c.studentEmail?.split('@')[0] || 'Student'}
              {c.studentEmail && <span style={{ color: '#00D4FF' }}> • {c.studentEmail}</span>}
            </div>
          </div>
          <div style={{
            padding: '4px 10px', borderRadius: 10,
            fontFamily: "'Plus Jakarta Sans',sans-serif",
            fontWeight: 700, fontSize: '0.68rem', whiteSpace: 'nowrap',
            background: isPending ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)',
            border: `1px solid ${isPending ? 'rgba(239,68,68,0.4)' : 'rgba(16,185,129,0.4)'}`,
            color: isPending ? '#FF6B6B' : '#10B981',
          }}>
            {isPending ? '🔴 ' + c.status : '🟢 RESOLVED'}
          </div>
        </div>

        {/* Category + title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span style={{
            display: 'inline-block', padding: '3px 10px',
            background: `${catColor}18`, border: `1px solid ${catColor}44`,
            borderRadius: 8, fontSize: '0.7rem', fontWeight: 700,
            color: catColor, fontFamily: "'Plus Jakarta Sans',sans-serif",
          }}>{c.category || 'OTHER'}</span>
          <span style={{
            fontFamily: "'Plus Jakarta Sans',sans-serif",
            fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary)',
          }}>{c.title}</span>
        </div>

        {/* Description */}
        {c.description && (
          <div style={{
            fontFamily: "'Inter',sans-serif", fontSize: '0.8rem',
            color: 'var(--text-secondary)', marginBottom: 8, lineHeight: 1.5,
          }}>
            {c.description.length > 180 ? c.description.slice(0, 180) + '…' : c.description}
          </div>
        )}

        {/* Image */}
        {c.imagePath && (
          <div
            style={{
              width: '100%', height: 160, borderRadius: 10,
              overflow: 'hidden', background: '#1a1a2e', marginBottom: 8,
              cursor: 'pointer',
            }}
            onClick={() => setZoomImg(`${API}/api/complaints/images/${c.imagePath}`)}
          >
            <img
              src={`${API}/api/complaints/images/${c.imagePath}`}
              alt="complaint"
              onError={e => { e.target.onerror = null; e.target.parentElement.style.display = 'none'; }}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          </div>
        )}

        {/* Time info */}
        <div style={{
          fontFamily: "'Inter',sans-serif", fontSize: '0.72rem',
          color: 'var(--text-muted)', marginBottom: 8,
        }}>
          {TOD[c.timeOfDay] || '⏰'} {c.timeOfDay ? c.timeOfDay.charAt(0) + c.timeOfDay.slice(1).toLowerCase() : ''} • 🕐 {fmtFull(c.createdAt)}
        </div>

        {/* Resolved info */}
        {c.status === 'RESOLVED' && (
          <div style={{
            background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)',
            borderRadius: 10, padding: '8px 12px', marginBottom: 8,
          }}>
            <div style={{
              fontFamily: "'Inter',sans-serif", fontSize: '0.72rem', color: '#10B981',
            }}>
              ✅ Resolved by {c.resolvedByWorker || 'Worker'} • {fmtFull(c.resolvedAt)}
            </div>
            {c.workerNote && (
              <div style={{
                fontFamily: "'Inter',sans-serif", fontSize: '0.78rem',
                color: 'var(--text-secondary)', marginTop: 4, fontStyle: 'italic',
              }}>
                📝 "{c.workerNote}"
              </div>
            )}
          </div>
        )}

        {/* Resolve button — only on pending tab */}
        {isPending && tab === 'PENDING' && (
          <button
            onClick={() => { setResolveId(c.id); setWorkerNote(''); }}
            style={{
              width: '100%', padding: '11px',
              background: 'linear-gradient(135deg,#10B981,#059669)',
              border: 'none', borderRadius: 12, color: 'white',
              fontFamily: "'Plus Jakarta Sans',sans-serif",
              fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(16,185,129,0.3)',
              transition: 'opacity 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            ✅ Mark Resolved
          </button>
        )}
      </div>
    );
  };

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg-gradient)',
      backgroundAttachment: 'fixed', padding: '16px 16px 100px',
    }}>
      {/* Theme Toggle */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
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
      </div>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        marginBottom: 4, animation: 'fadeUp 0.4s both',
      }}>
        <span style={{
          fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800,
          fontSize: '1.4rem', color: 'var(--text-primary)',
        }}>
          👷 {workerName}'s Dashboard
        </span>
        <span style={{
          background: '#3b82f6', color: 'white',
          padding: '3px 10px', borderRadius: 12,
          fontSize: '0.72rem', fontWeight: 800,
          fontFamily: "'Plus Jakarta Sans',sans-serif",
        }}>
          WORKER
        </span>
      </div>
      <div style={{
        fontFamily: "'Inter',sans-serif", fontSize: '0.82rem',
        color: 'var(--text-secondary)', marginBottom: 12,
        animation: 'fadeUp 0.4s 0.1s both',
      }}>
        {workerEmail} • {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
      </div>

      {/* Work type badges */}
      {workerTypes.length > 0 && (
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20,
          animation: 'fadeUp 0.4s 0.15s both',
        }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: "'Inter',sans-serif", alignSelf: 'center' }}>
            Your specializations:
          </span>
          {workerTypes.map(t => {
            const color = CAT_COLOR[t] || '#6B7280';
            return (
              <span key={t} style={{
                padding: '3px 10px', borderRadius: 8,
                background: `${color}18`, border: `1px solid ${color}44`,
                color: color, fontSize: '0.72rem', fontWeight: 700,
                fontFamily: "'Plus Jakarta Sans',sans-serif",
              }}>
                {WORK_TYPE_EMOJI[t] || '📌'} {t.replace(/_/g, ' ')}
              </span>
            );
          })}
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <StatCard icon="🔴" count={pending.length} label="My Pending" glowColor="#FF6B9D" delay={0.1} />
        <StatCard icon="✅" count={resolvedToday.length} label="Resolved Today" glowColor="#10B981" delay={0.15} />
        <StatCard icon="📊" count={myComplaints.length} label="Total Assigned" glowColor="#A78BFA" delay={0.2} />
      </div>

      {/* Tab switcher */}
      <div style={{
        display: 'flex', gap: 8, marginBottom: 20,
        animation: 'fadeUp 0.4s 0.2s both',
      }}>
        {[
          { key: 'PENDING', label: '🔴 Pending', count: pending.length },
          { key: 'RESOLVED', label: '✅ Resolved', count: resolved.length },
        ].map(t => (
          <button
            key={t.key}
            style={{
              flex: 1, padding: '12px 16px',
              background: tab === t.key
                ? (t.key === 'PENDING'
                  ? 'linear-gradient(135deg,#FF6B9D,#EF4444)'
                  : 'linear-gradient(135deg,#10B981,#059669)')
                : 'var(--glass-bg)',
              border: `1px solid ${tab === t.key ? 'transparent' : 'var(--glass-border)'}`,
              borderRadius: 14, color: 'white',
              fontFamily: "'Plus Jakarta Sans',sans-serif",
              fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
              boxShadow: tab === t.key ? '0 4px 16px rgba(0,0,0,0.2)' : 'none',
              transition: 'all 0.2s',
            }}
            onClick={() => setTab(t.key)}
          >
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div style={{
          textAlign: 'center', color: 'var(--text-muted)',
          padding: 40, fontFamily: "'Inter',sans-serif",
        }}>⏳ Loading complaints...</div>
      )}

      {/* Empty state */}
      {!loading && displayList.length === 0 && (
        <div style={{
          background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
          borderRadius: 20, backdropFilter: 'blur(16px)',
          padding: '40px 20px', textAlign: 'center',
          fontFamily: "'Inter',sans-serif", color: 'var(--text-muted)',
        }}>
          {tab === 'PENDING' ? '✅ No pending complaints for your work types!' : '📋 No resolved complaints yet.'}
        </div>
      )}

      {/* Grouped complaints */}
      {!loading && grouped.map(group => (
        <div key={group.date} style={{ marginBottom: 20 }}>
          {/* Date header */}
          <div style={{
            fontFamily: "'Plus Jakarta Sans',sans-serif",
            fontWeight: 700, fontSize: '0.88rem',
            color: group.date === 'Today' ? '#00D4FF' : 'var(--text-primary)',
            marginBottom: 12, padding: '8px 14px',
            background: 'rgba(255,255,255,0.04)',
            borderRadius: 12, border: '1px solid var(--glass-border)',
            display: 'inline-block',
          }}>
            📅 {group.date} — {group.items.length} complaint{group.items.length > 1 ? 's' : ''}
          </div>

          {group.items.map(c => renderCard(c))}
        </div>
      ))}

      {/* ══ Resolve Modal ══ */}
      {resolveId && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(8px)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: 20,
          }}
          onClick={() => { setResolveId(null); setWorkerNote(''); }}
        >
          <div
            style={{
              background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
              borderRadius: 24, backdropFilter: 'blur(20px)',
              padding: '28px 24px', width: '100%', maxWidth: 400,
              boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
              animation: 'fadeUp 0.3s ease both',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{
              fontFamily: "'Plus Jakarta Sans',sans-serif",
              fontWeight: 700, fontSize: '1.1rem',
              color: 'var(--text-primary)', marginBottom: 16,
            }}>
              ✅ Resolve Complaint #{resolveId}
            </div>

            <label style={{
              display: 'block', fontFamily: "'Plus Jakarta Sans',sans-serif",
              fontWeight: 600, fontSize: '0.78rem',
              color: 'var(--text-secondary)', marginBottom: 8,
              letterSpacing: '0.03em',
            }}>
              📝 Add Note (optional)
            </label>
            <textarea
              value={workerNote}
              onChange={e => setWorkerNote(e.target.value)}
              placeholder="e.g. Fixed the leaking tap, replaced washer"
              rows={3}
              style={{
                width: '100%', background: 'rgba(255,255,255,0.04)',
                border: '1px solid var(--glass-border)',
                borderRadius: 14, padding: '12px 14px',
                color: 'var(--text-primary)', fontSize: '0.9rem',
                fontFamily: "'Inter',sans-serif", outline: 'none',
                resize: 'vertical', marginBottom: 16,
                transition: 'border-color 0.3s',
              }}
              onFocus={e => e.target.style.borderColor = '#10B981'}
              onBlur={e => e.target.style.borderColor = 'var(--glass-border)'}
            />

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => { setResolveId(null); setWorkerNote(''); }}
                style={{
                  flex: 1, padding: '12px',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: 14, color: 'var(--text-secondary)',
                  fontFamily: "'Plus Jakarta Sans',sans-serif",
                  fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer',
                }}
              >Cancel</button>
              <button
                onClick={handleResolve}
                disabled={resolving}
                style={{
                  flex: 1, padding: '12px',
                  background: 'linear-gradient(135deg,#10B981,#059669)',
                  border: 'none', borderRadius: 14, color: 'white',
                  fontFamily: "'Plus Jakarta Sans',sans-serif",
                  fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer',
                  opacity: resolving ? 0.6 : 1,
                  boxShadow: '0 4px 16px rgba(16,185,129,0.3)',
                }}
              >
                {resolving ? '⏳ Resolving...' : '✅ Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ Image Zoom Modal ══ */}
      {zoomImg && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1001, cursor: 'pointer',
          }}
          onClick={() => setZoomImg(null)}
        >
          <img
            src={zoomImg}
            alt="zoomed"
            style={{
              maxWidth: '90%', maxHeight: '85vh',
              borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
            }}
          />
        </div>
      )}

      <BottomNav />

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 90, left: '50%', transform: 'translateX(-50%)',
          background: toast.ok ? 'rgba(16,185,129,0.95)' : 'rgba(239,68,68,0.95)',
          color: 'white', padding: '12px 24px', borderRadius: 20,
          fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700,
          fontSize: '0.88rem', boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          zIndex: 999, backdropFilter: 'blur(12px)',
          animation: 'fadeUp 0.3s ease both', whiteSpace: 'nowrap',
        }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
