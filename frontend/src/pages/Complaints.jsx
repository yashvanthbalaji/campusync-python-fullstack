// ===== src/pages/Complaints.jsx — Ocean Glassmorphism =====

import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { auth } from '../firebase';

const API = 'http://localhost:8082';
const CAT_COLOR = {
  ELECTRICAL:'#F97316', PLUMBING:'#3B82F6', CLEANING:'#00D4FF',
  AC_REPAIR:'#06B6D4', CARPENTRY:'#D97706', PAINTING:'#8B5CF6',
  GENERAL_MAINTENANCE:'#A78BFA', PEST_CONTROL:'#EF4444', OTHER:'#6B7280',
};
const WORK_TYPE_EMOJI = {
  ELECTRICAL:'⚡', PLUMBING:'🔧', CLEANING:'🧹', AC_REPAIR:'❄️',
  CARPENTRY:'🪚', PAINTING:'🎨', GENERAL_MAINTENANCE:'🔨', PEST_CONTROL:'🐛', OTHER:'📌',
};
const STATUS_CFG = {
  PENDING:     { bg:'rgba(239,68,68,0.15)', border:'rgba(239,68,68,0.4)', color:'#FF6B6B', label:'🔴 Pending' },
  OPEN:        { bg:'rgba(239,68,68,0.15)', border:'rgba(239,68,68,0.4)', color:'#FF6B6B', label:'🔴 Open' },
  IN_PROGRESS: { bg:'rgba(251,191,36,0.15)', border:'rgba(251,191,36,0.4)', color:'#FBBF24', label:'🟡 In Progress' },
  RESOLVED:    { bg:'rgba(16,185,129,0.15)', border:'rgba(16,185,129,0.4)', color:'#10B981', label:'🟢 Resolved ✅' },
};
const TOD_EMOJI = { MORNING:'🌅', AFTERNOON:'☀️', EVENING:'🌆', NIGHT:'🌙' };

function fmtDate(d) {
  if (!d) return '';
  const dt = new Date(d), t = new Date(), y = new Date();
  y.setDate(y.getDate() - 1);
  if (dt.toDateString() === t.toDateString()) return 'Today';
  if (dt.toDateString() === y.toDateString()) return 'Yesterday';
  return dt.toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'});
}
function fmtTime(d) {
  if (!d) return '';
  return new Date(d).toLocaleTimeString('en-IN',{hour:'numeric',minute:'2-digit',hour12:true});
}

export default function Complaints() {
  const { roomNumber } = useAuth();
  const navigate = useNavigate();
  const autoRoom = roomNumber || localStorage.getItem('userRoom') || '';

  // ── College students cannot use complaints ──
  const role = localStorage.getItem('userRole');
  const studentType = localStorage.getItem('studentType');
  if (role === 'STUDENT' && studentType === 'COLLEGE') {
    return (
      <div style={{
        minHeight: '100vh', background: 'var(--bg-gradient)', backgroundAttachment: 'fixed',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: 24, textAlign: 'center',
      }}>
        <span style={{ fontSize: 60 }}>🔒</span>
        <h2 style={{
          color: 'var(--text-primary)', margin: '16px 0 8px',
          fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700,
        }}>Hostel Students Only</h2>
        <p style={{
          color: 'var(--text-secondary)', marginBottom: 24,
          fontFamily: "'Inter', sans-serif", fontSize: '0.88rem', maxWidth: 340,
        }}>
          Complaint service is only available for hostel students.
          As a college student you can use Lost &amp; Found.
        </p>
        <button
          onClick={() => navigate('/lost-found')}
          style={{
            background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
            color: 'white', padding: '12px 24px', borderRadius: 14,
            border: 'none', cursor: 'pointer', fontSize: '1rem',
            fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700,
            boxShadow: '0 4px 16px rgba(124,58,237,0.3)',
          }}
        >🔍 Go to Lost &amp; Found</button>
      </div>
    );
  }

  // ── Workers cannot post complaints ──
  if (role === 'WORKER') {
    return (
      <div style={{
        minHeight: '100vh', background: 'var(--bg-gradient)', backgroundAttachment: 'fixed',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 16, padding: 40,
      }}>
        <div style={{ fontSize: 56 }}>🚫</div>
        <div style={{
          fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700,
          fontSize: '1.1rem', color: 'var(--text-primary)', textAlign: 'center',
        }}>Workers cannot post complaints</div>
        <div style={{
          fontFamily: "'Inter',sans-serif", fontSize: '0.88rem',
          color: 'var(--text-secondary)', textAlign: 'center',
        }}>Go to your dashboard to manage assigned complaints.</div>
        <button onClick={() => navigate('/worker')} style={{
          background: 'linear-gradient(135deg,#FF6B9D,#A78BFA)', border: 'none',
          borderRadius: 14, padding: '12px 28px', color: 'white', cursor: 'pointer',
          fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700, fontSize: '0.9rem',
          boxShadow: '0 4px 16px rgba(255,107,157,0.3)',
        }}>👷 Go to Worker Dashboard</button>
      </div>
    );
  }

  const { isDark, toggleTheme } = useTheme();
  const [complaints, setComplaints] = useState([]);
  const [pendingAll, setPendingAll] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title:'', description:'', category:'ELECTRICAL' });

  // Auto-calculate timeOfDay based on current hour
  // Before 12:00 PM → MORNING (worker handles same day morning)
  // After 12:00 PM → AFTERNOON (worker handles next day morning)
  const getTimeOfDay = () => new Date().getHours() < 12 ? 'MORNING' : 'AFTERNOON';
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [toast, setToast] = useState(null);

  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);

  const getAuthHeaders = async () => {
    const currentUser = auth.currentUser;
    const token = currentUser ? await currentUser.getIdToken() : null;
    return { Authorization: `Bearer ${token}` };
  };

  const showToast = (msg, ok=true) => { setToast({msg,ok}); setTimeout(()=>setToast(null),3000); };

  const fetchData = useCallback(async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setTimeout(() => fetchData(), 1000);
      return;
    }
    setFetching(true);
    try {
      const authHeaders = await getAuthHeaders();
      const [myR, pR] = await Promise.all([
        axios.get(`${API}/api/complaints/my`, { headers: authHeaders }).catch(()=>({data:[]})),
        axios.get(`${API}/api/complaints/pending`).catch(()=>({data:[]})),
      ]);
      setComplaints(Array.isArray(myR.data)?myR.data:[]);
      setPendingAll(Array.isArray(pR.data)?pR.data:[]);
    } catch {} finally { setFetching(false); }
  }, []);

  useEffect(()=>{ fetchData(); },[fetchData]);

  const handleImageChange = e => {
    const file = e.target.files[0]; if(!file) return;
    setSelectedImage(file);
    const r = new FileReader(); r.onload=()=>setImagePreview(r.result); r.readAsDataURL(file);
  };
  const removeImage = () => { setSelectedImage(null); setImagePreview(null); if(fileInputRef.current) fileInputRef.current.value=''; };

  const submitComplaint = async () => {
    if (!form.title||!form.description) { showToast('Please fill title and description',false); return; }
    setLoading(true);
    try {
      const authHeaders = await getAuthHeaders();
      const fd = new FormData();
      fd.append('title', form.title);
      fd.append('description', form.description);
      fd.append('category', form.category);
      fd.append('workType', form.category); // backend needs workType field
      fd.append('timeOfDay', getTimeOfDay());
      fd.append('roomNumber', autoRoom);
      fd.append('studentEmail', localStorage.getItem('userEmail') || '');
      if (selectedImage) fd.append('image', selectedImage);

      console.log('📤 Submitting complaint:', {
        url: `${API}/api/complaints/raise`,
        token: authHeaders.Authorization ? 'exists' : 'MISSING',
        workType: form.category,
        title: form.title,
        room: autoRoom,
      });

      await axios.post(`${API}/api/complaints/raise`, fd, {
        headers: { ...authHeaders, 'Content-Type':'multipart/form-data' },
        timeout: 30000,
      });
      showToast('Complaint submitted! Your complaint will be routed to the right worker 📋');
      setShowForm(false);
      setForm({ title:'', description:'', category:'ELECTRICAL' });
      removeImage();
      fetchData();
    } catch (error) {
      console.error('❌ Submit error:', error);
      if (error.code === 'ECONNABORTED') {
        showToast('Request timed out. Please try again.', false);
      } else if (error.response) {
        showToast(`Error ${error.response.status}: ${JSON.stringify(error.response.data)}`, false);
      } else {
        showToast('Network error: ' + error.message, false);
      }
    } finally { setLoading(false); }
  };

  // Group by date then timeOfDay
  const grouped = {};
  complaints.forEach(c => {
    const dk = c.createdAt ? fmtDate(c.createdAt) : 'Unknown';
    if (!grouped[dk]) grouped[dk] = {};
    const tod = c.timeOfDay || 'OTHER';
    if (!grouped[dk][tod]) grouped[dk][tod] = [];
    grouped[dk][tod].push(c);
  });
  const sortedDates = Object.keys(grouped).sort((a,b) => {
    if (a==='Today') return -1; if (b==='Today') return 1;
    if (a==='Yesterday') return -1; if (b==='Yesterday') return 1;
    const ga = grouped[a], gb = grouped[b];
    const da = new Date(Object.values(ga)[0]?.[0]?.createdAt||0);
    const db = new Date(Object.values(gb)[0]?.[0]?.createdAt||0);
    return db - da;
  });
  const todOrder = ['MORNING','AFTERNOON','EVENING','NIGHT','OTHER'];

  // Styles
  const inputStyle = {
    width:'100%', boxSizing:'border-box', background:'rgba(255,255,255,0.04)',
    border:'1px solid var(--glass-border)', borderRadius:12, padding:'13px 16px',
    color:'var(--text-primary)', fontSize:'0.95rem', fontFamily:"'Inter',sans-serif",
    outline:'none', marginBottom:14, transition:'border-color 0.3s',
  };
  const selectStyle = {
    ...inputStyle, background:'rgba(13,13,43,0.85)', appearance:'none',
    backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23A8B4D8' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
    backgroundRepeat:'no-repeat', backgroundPosition:'right 16px center',
  };
  const labelStyle = {
    display:'block', color:'var(--text-secondary)', fontSize:'0.78rem', fontWeight:600,
    fontFamily:"'Plus Jakarta Sans',sans-serif", marginBottom:6, letterSpacing:'0.03em',
  };
  const focus = e => { e.target.style.borderColor='var(--accent-cyan)'; };
  const blur = e => { e.target.style.borderColor='var(--glass-border)'; };

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg-gradient)', backgroundAttachment:'fixed', paddingBottom:100 }}>

      {/* HEADER */}
      <header style={{
        background:'var(--header-bg)', backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)',
        borderBottom:'1px solid var(--glass-border)', padding:20,
        display:'flex', alignItems:'center', justifyContent:'space-between',
        position:'sticky', top:0, zIndex:100,
      }}>
        <div style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:800, fontSize:'1.2rem', color:'var(--text-primary)' }}>
          📢 My Complaints
        </div>
        <button onClick={()=>setShowForm(true)} style={{
          background:'linear-gradient(135deg,#FF6B9D,#A78BFA)', border:'none', borderRadius:14,
          padding:'10px 20px', color:'white', fontFamily:"'Plus Jakarta Sans',sans-serif",
          fontWeight:700, cursor:'pointer', fontSize:'0.85rem',
          boxShadow:'0 4px 16px rgba(255,107,157,0.3)',
        }}>+ New</button>
        <button onClick={toggleTheme} style={{
          background:'var(--glass-bg)', border:'1px solid var(--glass-border)',
          borderRadius:20, padding:'6px 14px', cursor:'pointer',
          color:'var(--text-primary)', fontSize:14, marginLeft:8,
          display:'flex', alignItems:'center', backdropFilter:'blur(8px)',
        }}>{isDark ? '☀️' : '🌙'}</button>
      </header>

      {/* COMPLAINTS LIST grouped by date → timeOfDay */}
      <div style={{ padding:20 }}>
        {fetching ? (
          <div style={{ textAlign:'center', padding:40, color:'var(--text-secondary)' }}>⏳ Loading...</div>
        ) : complaints.length === 0 ? (
          <div style={{ textAlign:'center', padding:'60px 20px', color:'var(--text-secondary)' }}>
            <div style={{ fontSize:56, marginBottom:16 }}>📭</div>
            <div style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:700, color:'var(--text-primary)', marginBottom:8 }}>No complaints yet</div>
            <div style={{ fontSize:'0.9rem' }}>Tap "+ New" to raise your first complaint</div>
          </div>
        ) : (
          sortedDates.map(dateKey => {
            const todGroups = grouped[dateKey];
            const activeTods = todOrder.filter(t => todGroups[t]?.length);
            return (
              <div key={dateKey} style={{ marginBottom:20 }}>
                <div style={{
                  fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:700, fontSize:'0.88rem',
                  color: dateKey==='Today' ? '#00D4FF' : 'var(--text-primary)',
                  marginBottom:12, padding:'8px 14px',
                  background:'rgba(255,255,255,0.04)', borderRadius:12,
                  border:'1px solid var(--glass-border)', display:'inline-block',
                }}>📅 {dateKey}</div>

                {activeTods.map(tod => (
                  <div key={tod} style={{ marginBottom:10 }}>
                    <div style={{
                      fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:600, fontSize:'0.75rem',
                      color:'var(--text-secondary)', marginBottom:8, marginLeft:4, letterSpacing:'0.04em',
                    }}>
                      {TOD_EMOJI[tod]||'⏰'} {tod==='OTHER'?'Unspecified':tod.charAt(0)+tod.slice(1).toLowerCase()} ({todGroups[tod].length})
                    </div>

                    {todGroups[tod].map((c,i) => {
                      const sb = STATUS_CFG[c.status] || STATUS_CFG.PENDING;
                      const catColor = CAT_COLOR[c.category] || CAT_COLOR.OTHER;
                      return (
                        <div key={c.id||i} style={{
                          background:'var(--glass-bg)', border:'1px solid var(--glass-border)',
                          borderRadius:20, backdropFilter:'blur(16px)', boxShadow:'0 8px 32px rgba(0,0,0,0.3)',
                          padding:18, marginBottom:12, transition:'border-color 0.2s',
                        }}
                          onMouseEnter={e=>e.currentTarget.style.borderColor=catColor+'66'}
                          onMouseLeave={e=>e.currentTarget.style.borderColor='var(--glass-border)'}
                        >
                          {/* Title + workType badge */}
                          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6, flexWrap:'wrap' }}>
                            <span style={{
                              padding:'3px 10px', background:`${catColor}18`, border:`1px solid ${catColor}44`,
                              borderRadius:8, fontSize:'0.7rem', fontWeight:700, color:catColor,
                              fontFamily:"'Plus Jakarta Sans',sans-serif",
                            }}>{WORK_TYPE_EMOJI[c.workType||c.category]||'📌'} {c.workType||c.category||'OTHER'}</span>
                            <span style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:700, fontSize:'0.92rem', color:'var(--text-primary)' }}>
                              {c.title}
                            </span>
                          </div>

                          {/* Assigned worker */}
                          {c.assignedWorkerName && (
                            <div style={{
                              fontSize:'0.75rem', color:'#A78BFA', marginBottom:6,
                              fontFamily:"'Inter',sans-serif", fontWeight:600,
                            }}>
                              👷 Assigned to: {c.assignedWorkerName}
                            </div>
                          )}

                          {/* Description */}
                          <div style={{ color:'var(--text-secondary)', fontSize:'0.84rem', marginBottom:10, lineHeight:1.5, fontFamily:"'Inter',sans-serif" }}>
                            {c.description?.length > 160 ? c.description.slice(0,160)+'…' : c.description}
                          </div>

                          {/* Image */}
                          {c.imagePath && (
                            <div style={{ width:'100%', height:180, borderRadius:10, overflow:'hidden', background:'#1a1a2e', marginBottom:10 }}>
                              <img src={`http://localhost:8082/api/complaints/images/${c.imagePath}`} alt="proof"
                                onError={e=>{e.target.onerror=null;e.target.parentElement.style.display='none';}}
                                style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
                            </div>
                          )}

                          {/* Room + time + status row */}
                          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:6 }}>
                            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                              {c.roomNumber && (
                                <span style={{ fontSize:'0.72rem', color:'var(--text-muted)', fontFamily:"'Inter',sans-serif" }}>
                                  🏠 Room {c.roomNumber}
                                </span>
                              )}
                              <span style={{ fontSize:'0.72rem', color:'var(--text-muted)', fontFamily:"'Inter',sans-serif" }}>
                                🕐 {fmtTime(c.createdAt)}
                              </span>
                            </div>
                            <span style={{
                              padding:'4px 10px', borderRadius:10,
                              background:sb.bg, border:`1px solid ${sb.border}`, color:sb.color,
                              fontSize:'0.68rem', fontWeight:700, fontFamily:"'Plus Jakarta Sans',sans-serif",
                            }}>{sb.label}</span>
                          </div>

                          {/* Resolved info */}
                          {c.status === 'RESOLVED' && (
                            <div style={{
                              background:'rgba(16,185,129,0.08)', border:'1px solid rgba(16,185,129,0.2)',
                              borderRadius:10, padding:'8px 12px', marginTop:10,
                            }}>
                              <div style={{ fontSize:'0.72rem', color:'#10B981', fontFamily:"'Inter',sans-serif" }}>
                                ✅ Resolved by {c.resolvedByWorker||'Worker'} • {fmtDate(c.resolvedAt)} {fmtTime(c.resolvedAt)}
                              </div>
                              {c.workerNote && (
                                <div style={{ fontSize:'0.78rem', color:'var(--text-secondary)', marginTop:4, fontStyle:'italic', fontFamily:"'Inter',sans-serif" }}>
                                  📝 "{c.workerNote}"
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            );
          })
        )}

        {/* OTHER PENDING COMPLAINTS */}
        {!fetching && pendingAll.length > 0 && (
          <div style={{
            background:'var(--glass-bg)', border:'1px solid var(--glass-border)',
            borderRadius:20, backdropFilter:'blur(16px)', padding:18, marginTop:10,
          }}>
            <div style={{
              fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:700, fontSize:'0.88rem',
              color:'var(--text-primary)', marginBottom:10,
            }}>⟁ Other Pending Complaints in Campus</div>
            <div style={{
              fontFamily:"'Inter',sans-serif", fontSize:'0.82rem',
              color:'#FBBF24', marginBottom:12, fontWeight:600,
            }}>🔴 {pendingAll.length} complaint{pendingAll.length>1?'s':''} pending resolution</div>

            {pendingAll.slice(0,8).map((c,i) => {
              const catC = CAT_COLOR[c.category]||CAT_COLOR.OTHER;
              return (
                <div key={c.id||i} style={{
                  display:'flex', alignItems:'center', justifyContent:'space-between',
                  padding:'8px 0', borderBottom: i < Math.min(pendingAll.length,8)-1 ? '1px solid var(--glass-border)' : 'none',
                }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{
                      padding:'2px 8px', background:`${catC}18`, border:`1px solid ${catC}44`,
                      borderRadius:6, fontSize:'0.65rem', fontWeight:700, color:catC,
                      fontFamily:"'Plus Jakarta Sans',sans-serif",
                    }}>{c.category||'OTHER'}</span>
                    <span style={{ fontSize:'0.75rem', color:'var(--text-muted)', fontFamily:"'Inter',sans-serif" }}>
                      {fmtDate(c.createdAt)}
                    </span>
                  </div>
                  <span style={{
                    fontSize:'0.65rem', fontWeight:700, color:'#FF6B6B',
                    fontFamily:"'Plus Jakarta Sans',sans-serif",
                  }}>{c.status}</span>
                </div>
              );
            })}
            {pendingAll.length > 8 && (
              <div style={{ fontSize:'0.75rem', color:'var(--text-muted)', textAlign:'center', marginTop:8, fontFamily:"'Inter',sans-serif" }}>
                + {pendingAll.length - 8} more...
              </div>
            )}
          </div>
        )}
      </div>

      {/* ══ RAISE COMPLAINT MODAL ══ */}
      {showForm && (
        <div onClick={()=>setShowForm(false)} style={{
          position:'fixed', inset:0, background:'rgba(0,0,0,0.65)',
          backdropFilter:'blur(8px)', zIndex:200, display:'flex', alignItems:'flex-end',
        }}>
          <div onClick={e=>e.stopPropagation()} style={{
            width:'100%', maxHeight:'88vh', overflowY:'auto',
            background:'rgba(13,13,43,0.97)', border:'1px solid var(--glass-border)',
            borderRadius:'24px 24px 0 0', backdropFilter:'blur(24px)',
            animation:'slideUp 0.35s ease both', paddingBottom:100,
          }}>
            <div style={{ padding:'24px 22px 0' }}>
              <div style={{ width:40, height:4, borderRadius:4, background:'rgba(255,255,255,0.2)', margin:'0 auto 20px' }} />
              <div style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:800, fontSize:'1.15rem', marginBottom:22, color:'var(--text-primary)' }}>
                📝 Raise a Complaint
              </div>

              {/* Title */}
              <label style={labelStyle}>Title</label>
              <input style={inputStyle} placeholder="Short summary of the issue"
                value={form.title} onChange={e=>setForm({...form,title:e.target.value})}
                onFocus={focus} onBlur={blur} />

              {/* Work Type */}
              <label style={labelStyle}>Work Type</label>
              <select style={selectStyle} value={form.category} onChange={e=>setForm({...form,category:e.target.value})} onFocus={focus} onBlur={blur}>
                <option value="ELECTRICAL">⚡ Electrical</option>
                <option value="PLUMBING">🔧 Plumbing</option>
                <option value="CLEANING">🧹 Cleaning</option>
                <option value="AC_REPAIR">❄️ AC Repair</option>
                <option value="CARPENTRY">🪚 Carpentry</option>
                <option value="PAINTING">🎨 Painting</option>
                <option value="GENERAL_MAINTENANCE">🔨 General Maintenance</option>
                <option value="PEST_CONTROL">🐛 Pest Control</option>
              </select>
              <div style={{
                background:'rgba(0,212,255,0.06)', border:'1px solid rgba(0,212,255,0.15)',
                borderRadius:10, padding:'8px 12px', marginBottom:14, marginTop:-8,
                fontSize:'0.75rem', color:'var(--accent-cyan)', fontFamily:"'Inter',sans-serif",
              }}>
                🔀 Your complaint will be automatically routed to the responsible worker for this category.
              </div>

              {/* Description */}
              <label style={labelStyle}>Description</label>
              <textarea style={{...inputStyle, minHeight:90, resize:'vertical'}} placeholder="Describe the issue in detail..."
                value={form.description} onChange={e=>setForm({...form,description:e.target.value})}
                onFocus={focus} onBlur={blur} />

              {/* Time of Day — auto-calculated, shown as info */}
              <div style={{
                background:'rgba(255,255,255,0.03)', border:'1px solid var(--glass-border)',
                borderRadius:12, padding:'10px 14px', marginBottom:14,
                display:'flex', alignItems:'center', gap:8,
              }}>
                <span style={{fontSize:16}}>{getTimeOfDay() === 'MORNING' ? '🌅' : '🌆'}</span>
                <span style={{fontSize:'0.82rem', color:'var(--text-secondary)', fontFamily:"'Inter',sans-serif"}}>
                  {getTimeOfDay() === 'MORNING' ? 'Morning shift — worker handles today' : 'Afternoon — worker handles next morning'}
                </span>
              </div>

              {/* Room - auto-filled */}
              <label style={labelStyle}>Your Room (auto-filled)</label>
              <input style={{...inputStyle, opacity:0.7, cursor:'default', background:'rgba(255,255,255,0.03)'}}
                value={autoRoom ? `🏠 Room ${autoRoom}` : 'Complete profile first'} readOnly />

              {/* Photo upload */}
              <label style={labelStyle}>📸 Add Photo (optional)</label>
              <input type="file" accept="image/*" style={{display:'none'}} ref={fileInputRef} onChange={handleImageChange} />
              {!imagePreview ? (
                <div onClick={()=>fileInputRef.current?.click()} style={{
                  border:'2px dashed rgba(255,255,255,0.15)', borderRadius:12,
                  padding:'24px 20px', textAlign:'center', cursor:'pointer', marginBottom:14,
                  transition:'border-color 0.3s',
                }}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(0,212,255,0.4)';}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(255,255,255,0.15)';}}
                >
                  <div style={{fontSize:28,marginBottom:6}}>📷</div>
                  <div style={{color:'var(--text-muted)',fontSize:'0.82rem',fontFamily:"'Inter',sans-serif"}}>Tap to upload photo proof</div>
                </div>
              ) : (
                <div style={{marginBottom:14}}>
                  <img src={imagePreview} alt="Preview" style={{width:'100%',maxHeight:160,objectFit:'cover',borderRadius:12,border:'1px solid rgba(255,255,255,0.12)'}} />
                  <button onClick={removeImage} style={{
                    display:'block', margin:'8px auto 0', background:'none', border:'none',
                    color:'#FF6B9D', fontSize:'0.8rem', fontFamily:"'Plus Jakarta Sans',sans-serif",
                    fontWeight:600, cursor:'pointer',
                  }}>✕ Remove photo</button>
                </div>
              )}
            </div>

            {/* Buttons */}
            <div style={{ display:'flex', gap:12, padding:'16px 22px 0' }}>
              <button onClick={()=>setShowForm(false)} style={{
                flex:1, padding:15, borderRadius:12,
                border:'1px solid rgba(255,255,255,0.12)', background:'rgba(255,255,255,0.06)',
                color:'white', cursor:'pointer', fontFamily:"'Plus Jakarta Sans',sans-serif",
                fontWeight:700, fontSize:'0.9rem',
              }}>Cancel</button>
              <button onClick={submitComplaint} disabled={loading} style={{
                flex:2, padding:15, borderRadius:12, border:'none',
                background: loading ? 'rgba(255,107,157,0.35)' : 'linear-gradient(135deg,#FF6B9D,#A78BFA)',
                color:'white', cursor: loading?'not-allowed':'pointer',
                fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:700, fontSize:'0.95rem',
                boxShadow: loading?'none':'0 4px 20px rgba(255,107,157,0.4)',
              }}>{loading ? '⏳ Submitting...' : '🚀 Submit Complaint'}</button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />

      {/* Toast */}
      {toast && (
        <div style={{
          position:'fixed', bottom:90, left:'50%', transform:'translateX(-50%)',
          background: toast.ok?'rgba(16,185,129,0.95)':'rgba(239,68,68,0.95)',
          color:'white', padding:'12px 24px', borderRadius:20,
          fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:700, fontSize:'0.88rem',
          boxShadow:'0 8px 32px rgba(0,0,0,0.4)', zIndex:999, backdropFilter:'blur(12px)',
          animation:'fadeUp 0.3s ease both', whiteSpace:'nowrap',
        }}>{toast.msg}</div>
      )}
    </div>
  );
}