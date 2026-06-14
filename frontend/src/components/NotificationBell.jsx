// ===== src/components/NotificationBell.jsx — Ocean Glassmorphism =====

import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';

export default function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  const token = localStorage.getItem('token');
  const email = localStorage.getItem('userEmail');
  const headers = {
    Authorization: `Bearer ${token}`,
    'X-User-Email': email,
  };

  // ── Fetch unread count every 30s ──
  const fetchCount = useCallback(async () => {
    try {
      if (!email || !token) return;
      const res = await axios.get(
        'http://localhost:8080/api/notifications/unread-count',
        { headers }
      );
      setUnreadCount(res.data?.count || 0);
    } catch {
      // silently fail — notification service might be down
    }
  }, [email, token]);

  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, [fetchCount]);

  // ── Close dropdown when clicking outside ──
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ── Fetch all notifications on bell click ──
  const handleBellClick = async () => {
    if (showDropdown) {
      setShowDropdown(false);
      return;
    }
    try {
      const res = await axios.get(
        'http://localhost:8080/api/notifications/my',
        { headers }
      );
      setNotifications(res.data || []);
      setShowDropdown(true);
    } catch {
      setNotifications([]);
      setShowDropdown(true);
    }
  };

  // ── Mark single notification as read ──
  const markAsRead = async (id) => {
    try {
      await axios.put(
        `http://localhost:8080/api/notifications/mark-read/${id}`,
        {},
        { headers }
      );
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (e) {
      console.error('Mark read failed:', e);
    }
  };

  // ── Mark all as read ──
  const markAllRead = async () => {
    try {
      await axios.put(
        'http://localhost:8080/api/notifications/mark-all-read',
        {},
        { headers }
      );
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (e) {
      console.error('Mark all read failed:', e);
    }
  };

  // ── Format time ago ──
  const timeAgo = (dateStr) => {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  // ── Type icon ──
  const typeIcon = (type) => {
    switch (type) {
      case 'COMPLAINT_CREATED': return '📋';
      case 'COMPLAINT_RESOLVED': return '✅';
      case 'MATCH_FOUND': return '🤖';
      default: return '🔔';
    }
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      {/* ── Bell Button ── */}
      <button
        onClick={handleBellClick}
        style={{
          position: 'relative',
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 12,
          padding: '8px 12px',
          cursor: 'pointer',
          color: 'white',
          fontSize: 20,
          transition: 'background 0.2s',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
        onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
      >
        🔔
        {/* Red badge */}
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: -5, right: -5,
            background: '#EF4444',
            color: 'white',
            borderRadius: '50%',
            width: 18, height: 18,
            fontSize: '0.65rem',
            fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: "'Inter', sans-serif",
            boxShadow: '0 2px 8px rgba(239,68,68,0.5)',
            animation: 'pulse 2s infinite',
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* ── Dropdown ── */}
      {showDropdown && (
        <div style={{
          position: 'absolute',
          top: 44, right: 0,
          width: 320,
          background: 'rgba(13,13,43,0.97)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 16,
          padding: 0,
          zIndex: 500,
          maxHeight: 420,
          overflowY: 'auto',
          boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
          animation: 'fadeUp 0.25s ease both',
        }}>
          {/* Header */}
          <div style={{
            padding: '14px 16px 10px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            position: 'sticky', top: 0,
            background: 'rgba(13,13,43,0.97)',
            borderRadius: '16px 16px 0 0',
            zIndex: 1,
          }}>
            <span style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 700, fontSize: '0.9rem', color: 'white',
            }}>
              🔔 Notifications
            </span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--accent-cyan)', fontSize: '0.72rem',
                  fontWeight: 600, fontFamily: "'Inter', sans-serif",
                  padding: '2px 6px', borderRadius: 6,
                  transition: 'background 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,212,255,0.1)'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Items */}
          <div style={{ padding: '8px 10px 10px' }}>
            {notifications.length === 0 ? (
              <div style={{
                textAlign: 'center', padding: '28px 16px',
                color: 'var(--text-muted)',
                fontFamily: "'Inter', sans-serif",
                fontSize: '0.85rem',
              }}>
                No notifications yet 🔕
              </div>
            ) : (
              notifications.map((n, i) => {
                const isUnread = !n.read;
                return (
                  <div
                    key={n.id || i}
                    onClick={() => isUnread && markAsRead(n.id)}
                    style={{
                      background: isUnread
                        ? 'rgba(0,212,255,0.06)'
                        : 'rgba(255,255,255,0.02)',
                      border: isUnread
                        ? '1px solid rgba(0,212,255,0.15)'
                        : '1px solid rgba(255,255,255,0.05)',
                      borderRadius: 12,
                      padding: '11px 13px',
                      marginBottom: 6,
                      cursor: isUnread ? 'pointer' : 'default',
                      transition: 'all 0.2s',
                      position: 'relative',
                    }}
                    onMouseEnter={e => {
                      if (isUnread) e.currentTarget.style.background = 'rgba(0,212,255,0.1)';
                    }}
                    onMouseLeave={e => {
                      if (isUnread) e.currentTarget.style.background = 'rgba(0,212,255,0.06)';
                    }}
                  >
                    {/* Unread dot */}
                    {isUnread && (
                      <div style={{
                        position: 'absolute', top: 13, right: 12,
                        width: 7, height: 7, borderRadius: '50%',
                        background: '#00D4FF',
                        boxShadow: '0 0 8px rgba(0,212,255,0.6)',
                      }} />
                    )}
                    <div style={{
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      fontWeight: 700, fontSize: '0.82rem',
                      color: isUnread ? 'white' : 'var(--text-primary)',
                      marginBottom: 3,
                      paddingRight: 16,
                    }}>
                      {typeIcon(n.type)} {n.title}
                    </div>
                    <div style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: '0.74rem',
                      color: 'var(--text-secondary)',
                      lineHeight: 1.4, marginBottom: 5,
                    }}>
                      {n.message}
                    </div>
                    <div style={{
                      fontSize: '0.68rem',
                      color: 'var(--text-muted)',
                      fontFamily: "'Inter', sans-serif",
                    }}>
                      {timeAgo(n.createdAt)}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
