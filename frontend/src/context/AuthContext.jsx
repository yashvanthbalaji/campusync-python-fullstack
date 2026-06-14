// ===== src/context/AuthContext.jsx =====

import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth as firebaseAuth } from '../firebase';
import api from '../api/axiosConfig';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [authState, setAuthState] = useState({
    token: null,
    email: '',
    role: '',
    year: '',
    roomNumber: '',
    studentType: '',
    name: '',
    loading: true,
  });

  // ── Restore session on page refresh via onAuthStateChanged ──
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
      if (user) {
        try {
          const token = await user.getIdToken();
          // Sync profile with backend to get role/profile data
          const res = await api.post('/api/users/sync-profile');
          const profile = res.data;

          const state = {
            token,
            email: profile.email || user.email || '',
            role: profile.role || localStorage.getItem('userRole') || 'STUDENT',
            year: profile.year || localStorage.getItem('userYear') || '',
            roomNumber: profile.roomNumber || localStorage.getItem('userRoom') || '',
            studentType: profile.studentType || localStorage.getItem('studentType') || '',
            name: profile.name || localStorage.getItem('userName') || '',
            loading: false,
          };

          // Persist to localStorage for components that read directly
          localStorage.setItem('token', token);
          localStorage.setItem('userEmail', state.email);
          localStorage.setItem('userRole', state.role);
          localStorage.setItem('userName', state.name);
          localStorage.setItem('userYear', state.year);
          localStorage.setItem('userRoom', state.roomNumber);
          localStorage.setItem('studentType', state.studentType);

          setAuthState(state);
          console.log('🔐 AuthContext restored — role:', state.role, 'email:', state.email);
        } catch (err) {
          console.error('⚠️ Failed to restore session:', err);
          // Fallback: use localStorage values
          setAuthState({
            token: null,
            email: localStorage.getItem('userEmail') || '',
            role: localStorage.getItem('userRole') || '',
            year: localStorage.getItem('userYear') || '',
            roomNumber: localStorage.getItem('userRoom') || '',
            studentType: localStorage.getItem('studentType') || '',
            name: localStorage.getItem('userName') || '',
            loading: false,
          });
        }
      } else {
        setAuthState({
          token: null,
          email: '',
          role: '',
          year: '',
          roomNumber: '',
          studentType: '',
          name: '',
          loading: false,
        });
      }
    });

    return () => unsubscribe();
  }, []);

  // ── Register (Firebase + sync-profile) ──
  const register = async (email, password) => {
    const userCredential = await createUserWithEmailAndPassword(firebaseAuth, email, password);
    const token = await userCredential.user.getIdToken();

    // Sync profile with backend (interceptor auto-attaches token)
    const res = await api.post('/api/users/sync-profile');
    const profile = res.data;

    const state = {
      token,
      email: profile.email || email,
      role: profile.role || 'STUDENT',
      year: profile.year || '',
      roomNumber: profile.roomNumber || '',
      studentType: profile.studentType || '',
      name: profile.name || '',
      loading: false,
    };

    localStorage.setItem('token', token);
    localStorage.setItem('userEmail', state.email);
    localStorage.setItem('userRole', state.role);
    localStorage.setItem('userName', state.name);
    localStorage.setItem('userYear', state.year);
    localStorage.setItem('userRoom', state.roomNumber);
    localStorage.setItem('studentType', state.studentType);

    setAuthState(state);
    console.log('🔐 Registered + synced — role:', state.role);
    return profile;
  };

  // ── Login (Firebase + sync-profile) ──
  const login = async (email, password) => {
    const userCredential = await signInWithEmailAndPassword(firebaseAuth, email, password);
    const token = await userCredential.user.getIdToken();

    // Sync profile with backend (interceptor auto-attaches token)
    const res = await api.post('/api/users/sync-profile');
    const profile = res.data;

    const state = {
      token,
      email: profile.email || email,
      role: profile.role || 'STUDENT',
      year: profile.year || '',
      roomNumber: profile.roomNumber || '',
      studentType: profile.studentType || '',
      name: profile.name || '',
      loading: false,
    };

    localStorage.setItem('token', token);
    localStorage.setItem('userEmail', state.email);
    localStorage.setItem('userRole', state.role);
    localStorage.setItem('userName', state.name);
    localStorage.setItem('userYear', state.year);
    localStorage.setItem('userRoom', state.roomNumber);
    localStorage.setItem('studentType', state.studentType);

    setAuthState(state);
    console.log('🔐 Logged in + synced — role:', state.role);
    return profile;
  };

  // ── Logout ──
  const logout = async () => {
    await signOut(firebaseAuth);
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName');
    localStorage.removeItem('userPhone');
    localStorage.removeItem('workerTypes');
    localStorage.removeItem('maxComplaints');
    localStorage.removeItem('studentType');
    setAuthState({
      token: null,
      email: '',
      role: '',
      year: '',
      roomNumber: '',
      studentType: '',
      name: '',
      loading: false,
    });
  };

  const saveProfile = (year, roomNumber) => {
    localStorage.setItem('userYear', year);
    localStorage.setItem('userRoom', roomNumber);
    setAuthState((prev) => ({ ...prev, year, roomNumber }));
  };

  return (
    <AuthContext.Provider value={{ ...authState, login, register, logout, saveProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
