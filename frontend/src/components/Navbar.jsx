import { useNavigate } from 'react-router-dom';

function Navbar() {
  const navigate = useNavigate();
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName');
    localStorage.removeItem('userPhone');
    localStorage.removeItem('workerTypes');
    localStorage.removeItem('maxComplaints');
    navigate('/login');
  };
  return (
    <nav style={{background:'#1a73e8',padding:'12px 24px',
      display:'flex',justifyContent:'space-between',
      alignItems:'center',color:'white'}}>
      <h2 style={{margin:0}}>⟁ CampuSync</h2>
      <div style={{display:'flex',gap:'16px'}}>
        <button onClick={()=>navigate('/dashboard')}
          style={{background:'none',border:'none',
          color:'white',cursor:'pointer',fontSize:'16px'}}>
          Dashboard
        </button>
        <button onClick={()=>navigate('/complaints')}
          style={{background:'none',border:'none',
          color:'white',cursor:'pointer',fontSize:'16px'}}>
          Complaints
        </button>
        <button onClick={()=>navigate('/lostfound')}
          style={{background:'none',border:'none',
          color:'white',cursor:'pointer',fontSize:'16px'}}>
          Lost & Found
        </button>
        <button onClick={logout}
          style={{background:'#dc3545',border:'none',
          color:'white',cursor:'pointer',fontSize:'14px',
          padding:'6px 12px',borderRadius:'4px'}}>
          Logout
        </button>
      </div>
    </nav>
  );
}
export default Navbar;
