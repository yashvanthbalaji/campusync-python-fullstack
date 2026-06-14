// ===== src/pages/LostFound.jsx — Ocean Glassmorphism =====
import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import BottomNav from '../components/BottomNav';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { auth } from '../firebase';

// Inject pulse keyframe once
const styleEl = document.createElement('style');
styleEl.textContent = `@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.6}}`;
document.head.appendChild(styleEl);

const PRIORITY_CONFIG = {
  HIGH:   { color:'#EF4444', bg:'rgba(239,68,68,0.12)',  glow:'0 0 8px rgba(239,68,68,0.4)', icon:'🔴', order:1 },
  MEDIUM: { color:'#FFD93D', bg:'rgba(255,217,61,0.12)', glow:'none', icon:'🟡', order:2 },
  LOW:    { color:'#00F5A0', bg:'rgba(0,245,160,0.12)',  glow:'none', icon:'🟢', order:3 },
};
const MATCH_CONFIG = {
  UNMATCHED:       { color:'var(--text-muted)', bg:'rgba(107,122,153,0.12)', icon:'⬜' },
  POTENTIAL_MATCH: { color:'#00F5A0', bg:'rgba(0,245,160,0.15)', icon:'🔗' },
  CONFIRMED:       { color:'#00D4FF', bg:'rgba(0,212,255,0.15)', icon:'✅' },
};
const LOCATION_CATEGORIES = [
  { value:'WASHING_AREA', label:'🚿 Nearby Washing Area' },
  { value:'DRYING_AREA',  label:'👕 Dress Drying Place' },
  { value:'INSIDE_ROOM',  label:'🚪 Inside Room' },
  { value:'OUTSIDE_ROOM', label:'🏠 Outside Room' },
  { value:'STEPS',        label:'🪜 Steps / Staircase' },
  { value:'COMMON_HALL',  label:'🏛️ Common Hall' },
];
const FLOOR_OPTIONS = [
  { value:'GROUND',  label:'🏠 Ground Floor' },
  { value:'FIRST',   label:'1️⃣ First Floor' },
  { value:'SECOND',  label:'2️⃣ Second Floor' },
  { value:'THIRD',   label:'3️⃣ Third Floor' },
  { value:'FOURTH',  label:'4️⃣ Fourth Floor' },
  { value:'FIFTH',   label:'5️⃣ Fifth Floor' },
  { value:'SIXTH',   label:'6️⃣ Sixth Floor' },
  { value:'SEVENTH', label:'7️⃣ Seventh Floor' },
];

export default function LostFound() {
  const { roomNumber, email: currentUserEmail } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [items, setItems]       = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter]     = useState('ALL');
  const [form, setForm]         = useState({
    itemName:'', description:'', type:'LOST',
    priority:'MEDIUM', locationCategory:'WASHING_AREA', locationFloor:'GROUND',
  });
  const [loading, setLoading]   = useState(false);
  const [fetching, setFetching] = useState(true);
  const [matchDetails, setMatchDetails] = useState(null);
  const [showMatchModal, setShowMatchModal] = useState(false);

  // ── Toast state ──
  const [toast, setToast] = useState(null);
  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Detail modal state ──
  const [selectedItem, setSelectedItem]   = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // ── AI Search state ──
  const [searchTerm, setSearchTerm]       = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching]         = useState(false);
  const [searchDone, setSearchDone]       = useState(false);

  const handleCardClick = (item) => {
    setSelectedItem(item);
    setShowDetailModal(true);
  };

  // ── Photo upload state ──
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview]   = useState(null);
  const fileInputRef = useRef(null);

  const API_BASE = 'http://localhost:8083/api/lost-found';
  const getAuthHeaders = async () => {
    const currentUser = auth.currentUser;
    const token = currentUser ? await currentUser.getIdToken() : null;
    return { Authorization: `Bearer ${token}` };
  };

  // ── Fetch ──────────────────────────────────────────────────────
  const fetchItems = useCallback(async () => {
    setFetching(true);
    try {
      const headers = await getAuthHeaders();
      if (!headers.Authorization || headers.Authorization === 'Bearer null') {
        // Auth not ready yet — wait and retry once
        setTimeout(() => fetchItems(), 1000);
        return;
      }
      const r = await axios.get(`${API_BASE}/all`, { headers });
      const sorted = [...r.data].sort((a,b) =>
        (PRIORITY_CONFIG[a.priority]?.order||99) - (PRIORITY_CONFIG[b.priority]?.order||99));
      setItems(sorted);
    } catch {
      setItems([]);
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  // ── Image handlers ─────────────────────────────────────────────
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSelectedImage(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };
  const removeImage = () => {
    setSelectedImage(null); setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Submit new item (multipart/form-data) ──────────────────────
  const submitItem = async () => {
    if (!form.itemName) { alert('Please enter the item name'); return; }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('itemName', form.itemName);
      formData.append('description', form.description);
      formData.append('type', form.type);
      formData.append('priority', form.priority);
      formData.append('locationCategory', form.locationCategory);
      formData.append('locationFloor', form.locationFloor);
      if (selectedImage) formData.append('image', selectedImage);

      await axios.post(`${API_BASE}`, formData, {
        headers: { ...(await getAuthHeaders()), 'Content-Type': 'multipart/form-data' },
      });
      setShowForm(false);
      setForm({ itemName:'', description:'', type:'LOST', priority:'MEDIUM',
                locationCategory:'WASHING_AREA', locationFloor:'GROUND' });
      setSelectedImage(null); setImagePreview(null);
      fetchItems();
    } catch { alert('Failed to submit. Please try again.'); }
    finally { setLoading(false); }
  };

  // ── Confirm returned ───────────────────────────────────────────
  const handleConfirmReturned = async (itemId) => {
    try {
      await axios.put(`${API_BASE}/${itemId}/resolve`, {}, { headers: await getAuthHeaders() });
      showToast('Item marked as returned! ✅');
      fetchItems();
    } catch { alert('Failed to confirm. Try again.'); }
  };

  // ── Mark as Returned (for reporter's own items) ────────────────────
  const handleMarkReturned = async (itemId) => {
    try {
      await axios.put(`${API_BASE}/${itemId}/resolve`, {}, { headers: await getAuthHeaders() });
      showToast('Item marked as returned! ✅');
      fetchItems();
    } catch { showToast('Failed to update. Try again.', false); }
  };

  // ── AI Image Search ────────────────────────────────────────────
  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    setSearching(true);
    setSearchDone(false);
    try {
      const res = await axios.get(
        `${API_BASE}/search?query=${encodeURIComponent(searchTerm.trim())}`,
        { headers: await getAuthHeaders() }
      );
      setSearchResults(res.data || []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
      setSearchDone(true);
    }
  };

  // ── Fetch match details ────────────────────────────────────────
  const fetchMatchDetails = async (itemId) => {
    try {
      const res = await axios.get(
        `${API_BASE}/${itemId}/match-details`,
        { headers: await getAuthHeaders() }
      );
      setMatchDetails(res.data);
      setShowMatchModal(true);
    } catch {
      alert('Could not load match details');
    }
  };

  // ── Filter logic ──
  const filtered = (() => {
    if (filter === 'ALL')      return items;
    if (filter === 'LOST')     return items.filter(i => i.type === 'LOST');
    if (filter === 'FOUND')    return items.filter(i => i.type === 'FOUND');
    if (filter === 'MATCHED')  return searchResults;
    if (filter === 'SETTLED')  return items.filter(
      i => i.itemStatus === 'RESOLVED' || i.matchStatus === 'CONFIRMED'
    );
    return items;
  })();

  const formatLocation = (cat, floor) => {
    const c = LOCATION_CATEGORIES.find(l => l.value===cat)?.label || cat;
    const f = FLOOR_OPTIONS.find(o => o.value===floor)?.label || floor;
    return `${c} · ${f}`;
  };

  // ── Styles ─────────────────────────────────────────────────────
  const glassCard = {
    background:'var(--glass-bg)', border:'1px solid var(--glass-border)',
    borderRadius:20, backdropFilter:'blur(16px)',
    WebkitBackdropFilter:'blur(16px)', boxShadow:'0 8px 32px rgba(0,0,0,0.3)',
  };
  const inputStyle = {
    width:'100%', boxSizing:'border-box',
    background:'rgba(255,255,255,0.04)', border:'1px solid var(--glass-border)',
    borderRadius:12, padding:'13px 16px', color:'var(--text-primary)',
    fontSize:'0.95rem', fontFamily:"'Inter',sans-serif",
    outline:'none', marginBottom:14, transition:'border-color 0.3s,box-shadow 0.3s',
  };
  const selectStyle = {
    ...inputStyle,
    background:'rgba(13,13,43,0.85)', appearance:'none',
    backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23A8B4D8' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
    backgroundRepeat:'no-repeat', backgroundPosition:'right 16px center',
  };
  const labelStyle = {
    display:'block', color:'var(--text-secondary)', fontSize:'0.78rem',
    fontWeight:600, fontFamily:"'Plus Jakarta Sans',sans-serif",
    marginBottom:6, letterSpacing:'0.03em',
  };
  const focus = e => { e.target.style.borderColor='var(--accent-cyan)'; e.target.style.boxShadow='0 0 0 3px rgba(0,212,255,0.15)'; };
  const blur  = e => { e.target.style.borderColor='var(--glass-border)'; e.target.style.boxShadow='none'; };

  // ── Filter tab config ──────────────────────────────────────────
  const TABS = [
    { key:'ALL',     label:'🗂️ All',       activeGrad:'linear-gradient(135deg,rgba(255,107,157,0.2),rgba(0,212,255,0.2))' },
    { key:'LOST',    label:'❌ Lost',       activeGrad:'linear-gradient(135deg,rgba(255,107,157,0.25),rgba(239,68,68,0.25))' },
    { key:'FOUND',   label:'✅ Found',      activeGrad:'linear-gradient(135deg,rgba(0,245,160,0.25),rgba(16,185,129,0.25))' },
    { key:'MATCHED', label:'🤖 Matched',   activeGrad:'linear-gradient(135deg,#00F5A0,#3B82F6)' },
    { key:'SETTLED', label:'🏠 Settled',   activeGrad:'linear-gradient(135deg,rgba(16,185,129,0.3),rgba(5,150,105,0.3))' },
  ];

  // ── ItemStatus badge ───────────────────────────────────────────
  const ItemStatusBadge = ({ status }) => {
    if (!status || status === 'OPEN') return null;
    const cfg = status === 'PENDING_HANDOVER'
      ? { label:'⏳ Pending',  bg:'rgba(245,158,11,0.15)',  color:'#F59E0B', border:'rgba(245,158,11,0.3)' }
      : { label:'✅ Returned!', bg:'rgba(16,185,129,0.15)', color:'#10B981', border:'rgba(16,185,129,0.3)' };
    return (
      <span style={{
        padding:'3px 10px', borderRadius:20, fontSize:'0.7rem', fontWeight:700,
        background:cfg.bg, color:cfg.color, border:`1px solid ${cfg.border}`,
        fontFamily:"'Plus Jakarta Sans',sans-serif",
      }}>
        {cfg.label}
      </span>
    );
  };

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg-gradient)', backgroundAttachment:'fixed', paddingBottom:100 }}>

      {/* ── TOAST ── */}
      {toast && (
        <div style={{
          position:'fixed', top:20, left:'50%', transform:'translateX(-50%)',
          zIndex:999, padding:'12px 24px', borderRadius:14,
          background: toast.ok ? 'rgba(16,185,129,0.9)' : 'rgba(239,68,68,0.9)',
          color:'white', fontFamily:"'Plus Jakarta Sans',sans-serif",
          fontWeight:700, fontSize:'0.88rem',
          boxShadow:'0 8px 32px rgba(0,0,0,0.3)',
          backdropFilter:'blur(12px)',
        }}>
          {toast.msg}
        </div>
      )}

      {/* ── HEADER ── */}
      <header style={{
        background:'var(--header-bg)', backdropFilter:'blur(20px)',
        WebkitBackdropFilter:'blur(20px)', borderBottom:'1px solid var(--glass-border)',
        padding:'20px', position:'sticky', top:0, zIndex:100,
      }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
          <div style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:800, fontSize:'1.2rem', color:'var(--text-primary)' }}>
            🔍 Lost & Found
          </div>
          <button onClick={() => setShowForm(true)} style={{
            background:'linear-gradient(135deg,#3B82F6,#60A5FA)', border:'none',
            borderRadius:14, padding:'10px 20px', color:'white',
            fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:700,
            cursor:'pointer', fontSize:'0.85rem', boxShadow:'0 4px 16px rgba(59,130,246,0.35)',
          }}>
            + Report
          </button>
          <button onClick={toggleTheme} style={{
            background:'var(--glass-bg)', border:'1px solid var(--glass-border)',
            borderRadius:20, padding:'6px 14px', cursor:'pointer',
            color:'var(--text-primary)', fontSize:14,
            display:'flex', alignItems:'center', backdropFilter:'blur(8px)',
          }}>{isDark ? '☀️' : '🌙'}</button>
        </div>

        {/* Filter tabs */}
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          {TABS.map(({ key, label, activeGrad }) => {
            const active = filter === key;
            return (
              <button key={key} onClick={() => setFilter(key)} style={{
                padding:'8px 16px', borderRadius:20, cursor:'pointer',
                fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight: active ? 700 : 600,
                fontSize:'0.8rem', transition:'all 0.25s',
                border: active ? '1px solid transparent' : '1px solid var(--glass-border)',
                background: active ? activeGrad : 'var(--glass-bg)',
                color: active ? 'white' : 'var(--text-muted)',
              }}>
                {label}
              </button>
            );
          })}
        </div>

        {/* Sort indicator */}
        <div style={{
          fontSize: '0.75rem', color: 'var(--text-muted)',
          marginTop: 8, textAlign: 'center',
          fontFamily: "'Inter', sans-serif",
        }}>
          📊 Sorted by priority: High → Medium → Low
        </div>

        {/* ── AI Search Bar — only on MATCHED tab ── */}
        {filter === 'MATCHED' && (
          <div style={{
            display:'flex', gap:8, marginTop:12,
            alignItems:'center',
          }}>
            <input
              type="text"
              placeholder="Search by item name (e.g. mouse, bottle, wallet)"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              onFocus={focus}
              onBlur={blur}
              style={{
                flex:1, boxSizing:'border-box',
                background:'rgba(255,255,255,0.04)',
                border:'1px solid var(--glass-border)',
                borderRadius:12, padding:'11px 14px',
                color:'var(--text-primary)', fontSize:'0.88rem',
                fontFamily:"'Inter',sans-serif", outline:'none',
                transition:'border-color 0.3s,box-shadow 0.3s',
                marginBottom:0,
              }}
            />
            <button
              onClick={handleSearch}
              disabled={searching || !searchTerm.trim()}
              style={{
                padding:'11px 18px', borderRadius:12, border:'none',
                background: searching ? 'rgba(168,139,250,0.3)' : 'linear-gradient(135deg,#A78BFA,#7C3AED)',
                color:'white', cursor: searching ? 'not-allowed' : 'pointer',
                fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:700,
                fontSize:'0.82rem', whiteSpace:'nowrap',
                boxShadow: searching ? 'none' : '0 4px 14px rgba(124,58,237,0.35)',
                transition:'all 0.25s',
              }}
            >
              {searching ? '⏳' : '🔍'} Search
            </button>
          </div>
        )}
      </header>

      {/* ── ITEMS LIST ── */}
      <div style={{ padding:'20px' }}>
        {fetching ? (
          <div style={{ textAlign:'center', padding:40, color:'var(--text-secondary)' }}>Loading...</div>
        ) : filter === 'MATCHED' && !searchDone ? (
          <div style={{ textAlign:'center', padding:'60px 20px', color:'var(--text-secondary)' }}>
            <div style={{ fontSize:56, marginBottom:16 }}>🔍</div>
            <div style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:700, color:'var(--text-primary)', marginBottom:8 }}>
              AI Image Search
            </div>
            <div style={{ fontSize:'0.9rem' }}>Type an item name above to search using AI</div>
          </div>
        ) : filter === 'MATCHED' && searching ? (
          <div style={{ textAlign:'center', padding:40, color:'var(--text-secondary)' }}>
            <div style={{ fontSize:40, marginBottom:10, animation:'pulse 1.5s infinite' }}>🤖</div>
            <div style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:700, color:'var(--text-primary)' }}>AI is analyzing images...</div>
          </div>
        ) : filter === 'MATCHED' && searchDone && filtered.length === 0 ? (
          <div style={{ textAlign:'center', padding:'60px 20px', color:'var(--text-secondary)' }}>
            <div style={{ fontSize:56, marginBottom:16 }}>🔍</div>
            <div style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:700, color:'var(--text-primary)', marginBottom:8 }}>
              No AI matches found for '{searchTerm}'
            </div>
            <div style={{ fontSize:'0.9rem' }}>Try a different search term</div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign:'center', padding:'60px 20px', color:'var(--text-secondary)' }}>
            <div style={{ fontSize:56, marginBottom:16 }}>🔍</div>
            <div style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:700, color:'var(--text-primary)', marginBottom:8 }}>
              Nothing here yet
            </div>
            <div style={{ fontSize:'0.9rem' }}>Tap "+ Report" to add an item</div>
          </div>
        ) : (
          filtered.map((item, i) => {
            const isMatch = item.matchStatus === 'POTENTIAL_MATCH';
            return (
              <div key={item.id||i} style={{
                ...glassCard, padding:'18px', marginBottom:12,
                animation:`fadeUp 0.4s ${i*0.05}s both`,
                position:'relative', overflow:'hidden', cursor:'pointer',
                borderLeft: item.priority === 'HIGH' ? '3px solid #EF4444' :
                            item.priority === 'MEDIUM' ? '3px solid #F59E0B' :
                            '3px solid #10B981',
                ...(isMatch ? { border:'1px solid rgba(0,245,160,0.35)', borderLeft: item.priority === 'HIGH' ? '3px solid #EF4444' : item.priority === 'MEDIUM' ? '3px solid #F59E0B' : '3px solid #10B981', boxShadow:'0 8px 32px rgba(0,245,160,0.15)' } : {}),
              }}
              onClick={() => handleCardClick(item)}
              >
                {/* ── AI Match Banner ── */}
                {isMatch && (
                  <div style={{
                    background:'rgba(0,245,160,0.12)', border:'1px solid #00F5A0',
                    borderRadius:8, padding:'8px 12px', fontSize:'0.78rem',
                    color:'#00F5A0', marginBottom:10,
                    animation:'pulse 2s infinite',
                    fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:600,
                  }}>
                    🤖 AI Match Found! Item likely located!
                  </div>
                )}

                {/* Type badge — top right */}
                <div style={{
                  position:'absolute', top:0, right:0, padding:'5px 14px',
                  background: (item.itemStatus === 'RESOLVED' || item.matchStatus === 'CONFIRMED')
                    ? 'linear-gradient(135deg,#10B981,#059669)'
                    : item.type==='LOST'
                    ? 'linear-gradient(135deg,#FF6B9D,#EF4444)'
                    : 'linear-gradient(135deg,#00F5A0,#10B981)',
                  color:'white', fontSize:'0.68rem', fontWeight:700,
                  fontFamily:"'Plus Jakarta Sans',sans-serif", borderRadius:'0 20px 0 14px',
                }}>
                  {(item.itemStatus === 'RESOLVED' || item.matchStatus === 'CONFIRMED')
                    ? 'SETTLED ✅'
                    : item.type}
                </div>

                {/* Item name */}
                <div style={{
                  fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:700,
                  fontSize:'0.95rem', marginBottom:6, paddingRight:60, color:'var(--text-primary)',
                }}>
                  {item.itemName}
                </div>

                {/* Description */}
                <div style={{ color:'var(--text-secondary)', fontSize:'0.85rem', marginBottom:12, lineHeight:1.5 }}>
                  {item.description}
                </div>

                {/* Image */}
                {item.imageUrl && (
                  <div style={{
                    width:'100%', height: 180,
                    borderRadius: 10, overflow:'hidden',
                    background:'#12122a',
                    marginBottom: 10,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    border:'1px solid rgba(255,255,255,0.06)',
                  }}>
                    <img
                      src={`http://localhost:8083/api/lost-found/images/${item.imageUrl}`}
                      alt={item.itemName}
                      onClick={e => { e.stopPropagation(); handleCardClick(item); }}
                      onError={e => { e.target.onerror=null; e.target.parentElement.style.display='none'; }}
                      style={{
                        maxWidth:'100%', maxHeight:'100%',
                        objectFit:'contain', cursor:'pointer',
                        display:'block',
                      }}
                    />
                  </div>
                )}

                {/* Badges row */}
                <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom: isMatch ? 10 : 0 }}>
                  <span style={{
                    display:'inline-flex', alignItems:'center', gap:4,
                    padding:'3px 10px', borderRadius:20,
                    background:PRIORITY_CONFIG[item.priority]?.bg||'rgba(255,255,255,0.08)',
                    color:PRIORITY_CONFIG[item.priority]?.color||'white',
                    boxShadow:PRIORITY_CONFIG[item.priority]?.glow||'none',
                    fontSize:'0.7rem', fontWeight:700,
                    fontFamily:"'Plus Jakarta Sans',sans-serif",
                  }}>
                    {PRIORITY_CONFIG[item.priority]?.icon} {item.priority}
                  </span>

                  <ItemStatusBadge status={item.itemStatus} />

                  {item.matchStatus && item.matchStatus !== 'UNMATCHED' && (
                    <span className={isMatch ? 'match-badge' : ''} style={{
                      display:'inline-flex', alignItems:'center', gap:4,
                      padding:'3px 10px', borderRadius:20,
                      background:MATCH_CONFIG[item.matchStatus]?.bg||'transparent',
                      color:MATCH_CONFIG[item.matchStatus]?.color||'white',
                      fontSize:'0.7rem', fontWeight:700,
                      fontFamily:"'Plus Jakarta Sans',sans-serif",
                    }}>
                      {MATCH_CONFIG[item.matchStatus]?.icon} {item.matchStatus.replace('_',' ')}
                    </span>
                  )}

                  {(item.locationCategory||item.locationFloor) && (
                    <span style={{ fontSize:'0.73rem', color:'var(--text-muted)', fontFamily:"'Inter',sans-serif" }}>
                      📍 {formatLocation(item.locationCategory, item.locationFloor)}
                    </span>
                  )}
                </div>

                {/* View Match Details */}
                {isMatch && (
                  <button
                    onClick={e => { e.stopPropagation(); fetchMatchDetails(item.id); }}
                    style={{
                      width:'100%', marginTop:8,
                      background:'rgba(0,212,255,0.1)',
                      border:'1px solid rgba(0,212,255,0.3)',
                      borderRadius:10, padding:'8px 12px',
                      color:'#00D4FF',
                      fontFamily:"'Plus Jakarta Sans',sans-serif",
                      fontWeight:600, fontSize:'0.82rem',
                      cursor:'pointer', transition:'background 0.2s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background='rgba(0,212,255,0.18)'}
                    onMouseLeave={e => e.currentTarget.style.background='rgba(0,212,255,0.1)'}
                  >
                    👁️ View Match Details
                  </button>
                )}

                {/* Mark as Returned — reporter's own items */}
                {currentUserEmail && item.reporterEmail === currentUserEmail &&
                  item.itemStatus !== 'RESOLVED' && item.matchStatus !== 'CONFIRMED' && (
                  <button
                    onClick={e => { e.stopPropagation(); handleMarkReturned(item.id); }}
                    style={{
                      width:'100%', marginTop:8,
                      background:'rgba(16,185,129,0.12)',
                      border:'1px solid rgba(16,185,129,0.35)',
                      borderRadius:10, padding:'8px 12px',
                      color:'#10B981',
                      fontFamily:"'Plus Jakarta Sans',sans-serif",
                      fontWeight:600, fontSize:'0.82rem',
                      cursor:'pointer', transition:'background 0.2s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background='rgba(16,185,129,0.22)'}
                    onMouseLeave={e => e.currentTarget.style.background='rgba(16,185,129,0.12)'}
                  >
                    🏠 Mark as Returned
                  </button>
                )}

                {/* Confirm Returned — matched items */}
                {isMatch && (
                  <button
                    onClick={e => { e.stopPropagation(); handleConfirmReturned(item.id); }}
                    style={{
                      width:'100%', marginTop:10,
                      background:'linear-gradient(135deg,#00F5A0,#3B82F6)',
                      border:'none', borderRadius:10, padding:'10px',
                      color:'white', fontFamily:"'Plus Jakarta Sans',sans-serif",
                      fontWeight:700, fontSize:'0.85rem', cursor:'pointer',
                      boxShadow:'0 4px 16px rgba(0,245,160,0.3)',
                      transition:'opacity 0.2s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.opacity='0.85'}
                    onMouseLeave={e => e.currentTarget.style.opacity='1'}
                  >
                    ✅ Confirm Item Returned
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ══════════════════════════════════════
          REPORT MODAL
      ══════════════════════════════════════ */}
      {showForm && (
        <div
          onClick={() => setShowForm(false)}
          style={{
            position:'fixed', inset:0, background:'rgba(0,0,0,0.65)',
            backdropFilter:'blur(8px)', WebkitBackdropFilter:'blur(8px)',
            zIndex:200, display:'flex', alignItems:'flex-end',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width:'100%', maxHeight:'88vh', overflowY:'auto',
              background:'rgba(13,13,43,0.97)', border:'1px solid var(--glass-border)',
              borderRadius:'24px 24px 0 0', backdropFilter:'blur(24px)',
              WebkitBackdropFilter:'blur(24px)', animation:'slideUp 0.35s ease both',
              paddingBottom:100,
            }}
          >
            <div style={{ padding:'24px 22px 0' }}>
              <div style={{ width:40, height:4, borderRadius:4, background:'rgba(255,255,255,0.2)', margin:'0 auto 20px' }} />

              <div style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:800, fontSize:'1.15rem', marginBottom:22, color:'var(--text-primary)' }}>
                📦 Report Item
              </div>

              <label style={labelStyle}>Type</label>
              <div style={{ display:'flex', gap:10, marginBottom:14 }}>
                {['LOST','FOUND'].map(t => (
                  <button key={t} onClick={() => setForm({...form,type:t})} style={{
                    flex:1, padding:'12px', borderRadius:12, cursor:'pointer',
                    border: form.type===t ? 'none' : '1px solid var(--glass-border)',
                    background: form.type===t
                      ? (t==='LOST' ? 'linear-gradient(135deg,#FF6B9D,#EF4444)' : 'linear-gradient(135deg,#00F5A0,#10B981)')
                      : 'var(--glass-bg)',
                    color: form.type===t ? 'white' : 'var(--text-secondary)',
                    fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:700, fontSize:'0.85rem',
                    boxShadow: form.type===t
                      ? (t==='LOST' ? '0 4px 16px rgba(255,107,157,0.3)' : '0 4px 16px rgba(0,245,160,0.3)') : 'none',
                  }}>
                    {t==='LOST' ? '❌ I Lost It' : '✅ I Found It'}
                  </button>
                ))}
              </div>

              <label style={labelStyle}>Priority</label>
              <select style={selectStyle} value={form.priority} onChange={e => setForm({...form,priority:e.target.value})} onFocus={focus} onBlur={blur}>
                <option value="HIGH">🔴 High (Valuable item)</option>
                <option value="MEDIUM">🟡 Medium</option>
                <option value="LOW">🟢 Low</option>
              </select>

              <label style={labelStyle}>Item Name</label>
              <input style={inputStyle} placeholder="e.g. Blue water bottle"
                value={form.itemName} onChange={e => setForm({...form,itemName:e.target.value})} onFocus={focus} onBlur={blur} />

              <label style={labelStyle}>Description</label>
              <textarea style={{...inputStyle,minHeight:70,resize:'vertical'}} placeholder="Describe the item..."
                value={form.description} onChange={e => setForm({...form,description:e.target.value})} onFocus={focus} onBlur={blur} />

              <label style={labelStyle}>📍 Location Category</label>
              <select style={selectStyle} value={form.locationCategory} onChange={e => setForm({...form,locationCategory:e.target.value})} onFocus={focus} onBlur={blur}>
                {LOCATION_CATEGORIES.map(lc => <option key={lc.value} value={lc.value}>{lc.label}</option>)}
              </select>

              <label style={labelStyle}>🏢 Floor Number</label>
              <select style={selectStyle} value={form.locationFloor} onChange={e => setForm({...form,locationFloor:e.target.value})} onFocus={focus} onBlur={blur}>
                {FLOOR_OPTIONS.map(fl => <option key={fl.value} value={fl.value}>{fl.label}</option>)}
              </select>

              <label style={labelStyle}>Your Room (auto-filled)</label>
              <input style={{...inputStyle,opacity:0.7,cursor:'default',background:'rgba(255,255,255,0.03)'}}
                value={roomNumber ? `🏠 Room ${roomNumber}` : 'Complete profile first'} readOnly />

              <label style={labelStyle}>📷 Photo (optional)</label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display:'none' }}
                onChange={handleImageChange}
              />

              {!imagePreview ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: '2px dashed rgba(0,212,255,0.35)',
                    borderRadius: 12, padding: '18px',
                    textAlign: 'center', cursor: 'pointer',
                    background: 'rgba(0,212,255,0.04)',
                    marginBottom: 14, transition: 'background 0.2s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,212,255,0.09)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,212,255,0.04)'}
                >
                  <div style={{ fontSize: 28, marginBottom: 4 }}>📸</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)', fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight: 600 }}>
                    Tap to add a photo
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
                    Helps AI match your item faster
                  </div>
                </div>
              ) : (
                <div style={{ position: 'relative', marginBottom: 14 }}>
                  <img
                    src={imagePreview}
                    alt="preview"
                    style={{ width: '100%', maxHeight: 180, objectFit: 'cover', borderRadius: 12 }}
                  />
                  <button
                    onClick={removeImage}
                    style={{
                      position: 'absolute', top: 8, right: 8,
                      background: 'rgba(239,68,68,0.85)', border: 'none',
                      borderRadius: '50%', width: 28, height: 28,
                      color: 'white', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1rem', fontWeight: 700,
                    }}
                  >✕</button>
                </div>
              )}
            </div>

            <div style={{ display:'flex', gap:12, padding:'16px 22px 0' }}>
              <button onClick={() => setShowForm(false)} style={{
                flex:1, padding:'15px', borderRadius:12,
                border:'1px solid rgba(255,255,255,0.12)', background:'rgba(255,255,255,0.06)',
                color:'white', cursor:'pointer', fontFamily:"'Plus Jakarta Sans',sans-serif",
                fontWeight:700, fontSize:'0.9rem',
              }}>
                Cancel
              </button>
              <button onClick={submitItem} disabled={loading} style={{
                flex:2, padding:'15px', borderRadius:12, border:'none',
                background: loading ? 'rgba(59,130,246,0.35)' : 'linear-gradient(135deg,#3B82F6,#60A5FA)',
                color:'white', cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:700, fontSize:'0.95rem',
                boxShadow: loading ? 'none' : '0 4px 20px rgba(59,130,246,0.4)',
              }}>
                {loading ? '⏳ Submitting...' : '🚀 Submit Report'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════
          MATCH DETAILS MODAL
      ══════════════════════════════════════ */}
      {showMatchModal && matchDetails && (
        <div
          onClick={() => setShowMatchModal(false)}
          style={{
            position:'fixed', inset:0, background:'rgba(0,0,0,0.65)',
            backdropFilter:'blur(8px)', WebkitBackdropFilter:'blur(8px)',
            zIndex:200, display:'flex', alignItems:'flex-end',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width:'100%', maxHeight:'88vh', overflowY:'auto',
              background:'rgba(13,13,43,0.97)', border:'1px solid var(--glass-border)',
              borderRadius:'24px 24px 0 0', backdropFilter:'blur(24px)',
              WebkitBackdropFilter:'blur(24px)', animation:'slideUp 0.35s ease both',
              padding:'24px 22px 32px',
            }}
          >
            <div style={{ width:40, height:4, borderRadius:4, background:'rgba(255,255,255,0.2)', margin:'0 auto 20px' }} />

            <div style={{
              fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:800,
              fontSize:'1.15rem', color:'var(--accent-coral)', marginBottom:4,
            }}>
              🤖 AI Match Details
            </div>
            <div style={{
              fontFamily:"'Inter',sans-serif", fontSize:'0.82rem',
              color:'var(--text-secondary)', marginBottom:20,
            }}>
              Gemini AI found a potential match!
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div style={{
                background:'var(--glass-bg)', border:'1px solid var(--glass-border)',
                borderRadius:14, padding:14, backdropFilter:'blur(12px)',
              }}>
                <div style={{
                  fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:700,
                  fontSize:'0.75rem', color:'var(--accent-cyan)', marginBottom:8,
                  textTransform:'uppercase', letterSpacing:'0.05em',
                }}>
                  📦 Your Item
                </div>
                <div style={{
                  fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:700,
                  fontSize:'0.9rem', color:'var(--text-primary)', marginBottom:6,
                }}>
                  {matchDetails.item?.itemName}
                </div>
                <div style={{ fontSize:'0.8rem', color:'var(--text-secondary)', lineHeight:1.5, marginBottom:8 }}>
                  {matchDetails.item?.description}
                </div>
                <div style={{ fontSize:'0.73rem', color:'var(--text-muted)' }}>
                  📍 {formatLocation(matchDetails.item?.locationCategory, matchDetails.item?.locationFloor)}
                </div>
              </div>

              <div style={{
                background:'var(--glass-bg)', border:'1px solid rgba(0,245,160,0.3)',
                borderRadius:14, padding:14, backdropFilter:'blur(12px)',
              }}>
                <div style={{
                  fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:700,
                  fontSize:'0.75rem', color:'#00F5A0', marginBottom:8,
                  textTransform:'uppercase', letterSpacing:'0.05em',
                }}>
                  🔍 Matched Item
                </div>
                <div style={{
                  fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:700,
                  fontSize:'0.9rem', color:'var(--text-primary)', marginBottom:6,
                }}>
                  {matchDetails.matchedWith?.itemName}
                </div>
                <div style={{ fontSize:'0.8rem', color:'var(--text-secondary)', lineHeight:1.5, marginBottom:8 }}>
                  {matchDetails.matchedWith?.description}
                </div>
                <div style={{ fontSize:'0.73rem', color:'var(--text-muted)', marginBottom:6 }}>
                  📍 {formatLocation(matchDetails.matchedWith?.locationCategory, matchDetails.matchedWith?.locationFloor)}
                </div>
                <div style={{
                  fontSize:'0.75rem', color:'#A78BFA',
                  fontFamily:"'Inter',sans-serif", fontWeight:600,
                }}>
                  👤 Reported by: {matchDetails.matchedWith?.reporterEmail || 'Unknown'}
                </div>
              </div>
            </div>

            <div style={{
              fontSize:'0.8rem', color:'var(--text-secondary)',
              textAlign:'center', margin:'16px 0',
              fontFamily:"'Inter',sans-serif", lineHeight:1.6,
            }}>
              📍 Both items were found at the same location.<br />
              AI verified they are likely the same object.
            </div>

            <button
              onClick={() => setShowMatchModal(false)}
              style={{
                width:'100%', padding:'14px',
                borderRadius:12, border:'1px solid rgba(255,255,255,0.12)',
                background:'rgba(255,255,255,0.06)',
                color:'white', cursor:'pointer',
                fontFamily:"'Plus Jakarta Sans',sans-serif",
                fontWeight:700, fontSize:'0.9rem',
                transition:'background 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.1)'}
              onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,0.06)'}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════
          DETAIL MODAL
      ══════════════════════════════════════ */}
      {showDetailModal && selectedItem && (
        <div
          onClick={() => setShowDetailModal(false)}
          style={{
            position:'fixed', inset:0, background:'rgba(0,0,0,0.7)',
            backdropFilter:'blur(10px)', WebkitBackdropFilter:'blur(10px)',
            zIndex:300, display:'flex', alignItems:'flex-end',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width:'100%', maxHeight:'92vh', overflowY:'auto',
              background:'rgba(10,10,35,0.98)',
              border:'1px solid var(--glass-border)',
              borderRadius:'24px 24px 0 0',
              backdropFilter:'blur(28px)', WebkitBackdropFilter:'blur(28px)',
              animation:'slideUp 0.35s ease both',
              padding:'24px 20px 40px',
            }}
          >
            <div style={{ width:40, height:4, borderRadius:4, background:'rgba(255,255,255,0.18)', margin:'0 auto 20px' }} />

            {(selectedItem.matchStatus==='POTENTIAL_MATCH'||selectedItem.matchStatus==='CONFIRMED') && (
              <div style={{
                background:'rgba(0,245,160,0.12)', border:'1px solid #00F5A0',
                borderRadius:10, padding:'10px 14px', marginBottom:16,
                color:'#00F5A0', fontSize:'0.82rem', fontWeight:700,
                fontFamily:"'Plus Jakarta Sans',sans-serif",
                animation:'pulse 2s infinite',
              }}>
                🤖 AI Match Found! This item has been matched.
              </div>
            )}

            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
              <div style={{
                fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:800,
                fontSize:'1.15rem', color:'var(--text-primary)', flex:1, paddingRight:12,
              }}>
                {selectedItem.itemName}
              </div>
              <span style={{
                padding:'4px 12px', borderRadius:20, fontSize:'0.72rem', fontWeight:700,
                background: selectedItem.type==='LOST'
                  ? 'linear-gradient(135deg,#FF6B9D,#EF4444)'
                  : 'linear-gradient(135deg,#00F5A0,#10B981)',
                color:'white', fontFamily:"'Plus Jakarta Sans',sans-serif",
                whiteSpace:'nowrap',
              }}>
                {selectedItem.type}
              </span>
            </div>

            {selectedItem.imageUrl ? (
              <div style={{
                width:'100%', height: 220, borderRadius:12, marginBottom:16,
                overflow:'hidden', background:'#12122a',
                display:'flex', alignItems:'center', justifyContent:'center',
                border:'1px solid rgba(255,255,255,0.08)',
              }}>
                <img
                  src={`http://localhost:8083/api/lost-found/images/${selectedItem.imageUrl}`}
                  alt={selectedItem.itemName}
                  onError={e => { e.target.onerror=null; e.target.parentElement.style.display='none'; }}
                  style={{ maxWidth:'100%', maxHeight:'100%', objectFit:'contain', display:'block' }}
                />
              </div>
            ) : (
              <div style={{
                width:'100%', height:120, borderRadius:12, marginBottom:16,
                background:'rgba(255,255,255,0.04)', border:'1px solid var(--glass-border)',
                display:'flex', alignItems:'center', justifyContent:'center',
                color:'var(--text-muted)', fontSize:'0.85rem', fontFamily:"'Inter',sans-serif",
              }}>No Image</div>
            )}

            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:'0.72rem', color:'var(--text-muted)', fontWeight:600, marginBottom:4, fontFamily:"'Plus Jakarta Sans',sans-serif", letterSpacing:'0.04em' }}>📝 DESCRIPTION</div>
              <div style={{ fontSize:'0.88rem', color:'var(--text-primary)', lineHeight:1.6, fontFamily:"'Inter',sans-serif" }}>
                {selectedItem.description || 'No description provided.'}
              </div>
            </div>

            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:'0.72rem', color:'var(--text-muted)', fontWeight:600, marginBottom:4, fontFamily:"'Plus Jakarta Sans',sans-serif", letterSpacing:'0.04em' }}>📍 LOCATION</div>
              <div style={{ fontSize:'0.88rem', color:'var(--text-primary)', fontFamily:"'Inter',sans-serif" }}>
                {formatLocation(selectedItem.locationCategory, selectedItem.locationFloor)}
              </div>
            </div>

            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:'0.72rem', color:'var(--text-muted)', fontWeight:600, marginBottom:4, fontFamily:"'Plus Jakarta Sans',sans-serif", letterSpacing:'0.04em' }}>👤 REPORTED BY</div>
              <div style={{ fontSize:'0.88rem', color:'var(--text-primary)', fontFamily:"'Inter',sans-serif" }}>
                {selectedItem.reporterEmail || 'Unknown'}
              </div>
            </div>

            <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:20 }}>
              <span style={{
                padding:'4px 12px', borderRadius:20, fontSize:'0.75rem', fontWeight:700,
                background: PRIORITY_CONFIG[selectedItem.priority]?.bg || 'rgba(255,255,255,0.08)',
                color: PRIORITY_CONFIG[selectedItem.priority]?.color || 'white',
                fontFamily:"'Plus Jakarta Sans',sans-serif",
              }}>
                {PRIORITY_CONFIG[selectedItem.priority]?.icon} {selectedItem.priority} Priority
              </span>
              <ItemStatusBadge status={selectedItem.itemStatus} />
            </div>

            <button
              onClick={() => setShowDetailModal(false)}
              style={{
                width:'100%', padding:'14px',
                borderRadius:12, border:'1px solid rgba(255,255,255,0.12)',
                background:'rgba(255,255,255,0.06)',
                color:'white', cursor:'pointer',
                fontFamily:"'Plus Jakarta Sans',sans-serif",
                fontWeight:700, fontSize:'0.9rem',
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}