// ===== src/App.jsx =====

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import ProfileSetup from './pages/ProfileSetup';
import Dashboard from './pages/Dashboard';
import Complaints from './pages/Complaints';
import LostFound from './pages/LostFound';
import Profile from './pages/Profile';
import AdminDashboard from './pages/AdminDashboard';
import WorkerDashboard from './pages/WorkerDashboard';
import './index.css';

// ── Auth helpers ──
const isLoggedIn = () => !!localStorage.getItem('token');
const getRole = () => localStorage.getItem('userRole') || 'STUDENT';
const isProfileComplete = () => {
  const token = localStorage.getItem('token');
  if (!token) return false; // Not logged in
  const role = getRole();
  if (role === 'ADMIN') return true; // Admin always complete
  return localStorage.getItem('profileComplete') === 'true';
};

// ── Route guards ──
const PrivateRoute = ({ children }) =>
  isLoggedIn() ? children : <Navigate to="/login" />;

// Students must complete profile before accessing app pages
const StudentRoute = ({ children }) => {
  if (!isLoggedIn()) return <Navigate to="/login" />;
  const role = getRole();
  if (role === 'ADMIN') return <Navigate to="/admin" replace />;
  if (role === 'WORKER') return <Navigate to="/worker" replace />;
  if (!isProfileComplete()) return <Navigate to="/profile-setup" replace />;
  return children;
};

const AdminRoute = ({ children }) => {
  if (!isLoggedIn()) return <Navigate to="/login" />;
  if (getRole() !== 'ADMIN') return <Navigate to="/dashboard" />;
  return children;
};

const WorkerRoute = ({ children }) => {
  if (!isLoggedIn()) return <Navigate to="/login" />;
  const r = getRole();
  if (r !== 'WORKER' && r !== 'ADMIN') return <Navigate to="/dashboard" />;
  // Workers also need profile completion
  if (r === 'WORKER' && !isProfileComplete()) return <Navigate to="/profile-setup" replace />;
  return children;
};

// ── Smart redirect after login based on role ──
const SmartRedirect = () => {
  if (!isLoggedIn()) return <Navigate to="/login" />;
  const role = getRole();
  // ADMIN always skips profile setup
  if (role === 'ADMIN') return <Navigate to="/admin" />;
  // WORKER needs profile check
  if (role === 'WORKER') {
    if (!isProfileComplete()) return <Navigate to="/profile-setup" />;
    return <Navigate to="/worker" />;
  }
  // STUDENT needs profile first
  if (!isProfileComplete()) return <Navigate to="/profile-setup" />;
  return <Navigate to="/dashboard" />;
};

// ── Worker setup check — redirects based on profileComplete ──
const WorkerSetupCheck = () => {
  if (!isLoggedIn()) return <Navigate to="/login" />;
  const role = getRole();
  if (role !== 'WORKER') return <Navigate to="/dashboard" />;
  if (localStorage.getItem('profileComplete') === 'true') return <Navigate to="/worker" replace />;
  return <Navigate to="/profile-setup" replace />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<SmartRedirect />} />
          <Route path="/profile-setup" element={
            <PrivateRoute><ProfileSetup /></PrivateRoute>
          } />
          <Route path="/dashboard" element={
            <StudentRoute><Dashboard /></StudentRoute>
          } />
          <Route path="/complaints" element={
            <StudentRoute><Complaints /></StudentRoute>
          } />
          <Route path="/lost-found" element={
            <PrivateRoute><LostFound /></PrivateRoute>
          } />
          <Route path="/profile" element={
            <PrivateRoute><Profile /></PrivateRoute>
          } />
          <Route path="/admin" element={
            <AdminRoute><AdminDashboard /></AdminRoute>
          } />
          <Route path="/worker-setup-check" element={<WorkerSetupCheck />} />
          <Route path="/worker" element={
            <WorkerRoute><WorkerDashboard /></WorkerRoute>
          } />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;