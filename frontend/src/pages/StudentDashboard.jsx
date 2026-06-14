import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../api/axiosConfig';

function StudentDashboard() {
  const [complaints, setComplaints] = useState([]);
  const [lostItems, setLostItems] = useState([]);
  const navigate = useNavigate();
  const email = localStorage.getItem('email');

  useEffect(() => {
    api.get('/api/complaints/my')
      .then(r=>setComplaints(r.data)).catch(()=>{});
    api.get('/api/lostfound/my')
      .then(r=>setLostItems(r.data)).catch(()=>{});
  },[]);

  const cardStyle = {
    background:'white',padding:'24px',
    borderRadius:'8px',
    boxShadow:'0 2px 8px rgba(0,0,0,0.1)',
    textAlign:'center',cursor:'pointer'
  };

  return (
    <div style={{background:'#f5f5f5',minHeight:'100vh'}}>
      <Navbar/>
      <div style={{padding:'32px'}}>
        <h2>Welcome back, {email}! 👋</h2>
        <p style={{color:'#666'}}>
          Role: {localStorage.getItem('role')}
        </p>
        <div style={{display:'grid',
          gridTemplateColumns:'repeat(3,1fr)',
          gap:'24px',marginTop:'24px'}}>
          <div style={{...cardStyle,
            borderTop:'4px solid #1a73e8'}}
            onClick={()=>navigate('/complaints')}>
            <h1 style={{color:'#1a73e8',
              fontSize:'48px',margin:'0'}}>
              {complaints.length}
            </h1>
            <p style={{fontSize:'18px'}}>My Complaints</p>
            <p style={{color:'#666',fontSize:'14px'}}>
              Click to manage
            </p>
          </div>
          <div style={{...cardStyle,
            borderTop:'4px solid #28a745'}}
            onClick={()=>navigate('/lostfound')}>
            <h1 style={{color:'#28a745',
              fontSize:'48px',margin:'0'}}>
              {lostItems.length}
            </h1>
            <p style={{fontSize:'18px'}}>
              Lost & Found Items
            </p>
            <p style={{color:'#666',fontSize:'14px'}}>
              Click to view
            </p>
          </div>
          <div style={{...cardStyle,
            borderTop:'4px solid #dc3545',
            display:'flex',flexDirection:'column',
            justifyContent:'center'}}>
            <p style={{fontSize:'18px',
              fontWeight:'bold'}}>
              🚨 Report Issue
            </p>
            <button onClick={()=>navigate('/complaints')}
              style={{padding:'10px 20px',
              background:'#dc3545',color:'white',
              border:'none',borderRadius:'4px',
              cursor:'pointer',fontSize:'16px',
              marginTop:'8px'}}>
              Raise Complaint
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
export default StudentDashboard;
