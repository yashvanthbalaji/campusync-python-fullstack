// ===== src/context/AuthContext.jsx =====

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth as firebaseAuth } from '../firebase';
import api, { setCachedToken } from '../api/axiosConfig';

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
    gender: '',
    loading: true,
  });

  // Flag to skip the onAuthStateChanged sync-profile call when
  // login() or register() already handled it.
  const skipNextAuthChange = useRef(false);

  // ── Restore session on page refresh via onAuthStateChanged ──
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
      // If login/register already synced, skip this duplicate call
      if (skipNextAuthChange.current) {
        skipNextAuthChange.current = false;
        return;
      }

      if (user) {
        try {
          const token = await user.getIdToken();
          setCachedToken(token);
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
            gender: profile.gender || localStorage.getItem('userGender') || '',
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
          localStorage.setItem('userGender', state.gender);

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
            gender: localStorage.getItem('userGender') || '',
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
    // Step 1: Create Firebase user — if this throws, we bubble it up (e.g. email-already-in-use)
    const userCredential = await createUserWithEmailAndPassword(firebaseAuth, email, password);
    const token = await userCredential.user.getIdToken();

    // Cache the token so the interceptor can use it immediately
    setCachedToken(token);
    localStorage.setItem('token', token);

    // Prevent onAuthStateChanged from making a duplicate sync-profile call
    skipNextAuthChange.current = true;

    // Step 2: Sync profile — non-fatal. If it fails, onAuthStateChanged will retry.
    let profile = {};
    try {
      const res = await api.post('/api/users/sync-profile');
      profile = res.data;
    } catch (syncErr) {
      console.warn('⚠️ sync-profile failed after register (non-fatal, will retry on auth change):', syncErr?.response?.status, syncErr?.message);
      // Allow onAuthStateChanged to handle it — reset the skip flag so it WILL fire
      skipNextAuthChange.current = false;
    }

    const state = {
      token,
      email: profile.email || email,
      role: profile.role || 'STUDENT',
      year: profile.year || '',
      roomNumber: profile.roomNumber || '',
      studentType: profile.studentType || '',
      name: profile.name || '',
      gender: profile.gender || '',
      loading: false,
    };

    localStorage.setItem('userEmail', state.email);
    localStorage.setItem('userRole', state.role);
    localStorage.setItem('userName', state.name);
    localStorage.setItem('userYear', state.year);
    localStorage.setItem('userRoom', state.roomNumber);
    localStorage.setItem('studentType', state.studentType);
    localStorage.setItem('userGender', state.gender);

    setAuthState(state);
    console.log('🔐 Registered + synced — role:', state.role);
    return profile;
  };

  // ── Login (Firebase + sync-profile) ──
  const login = async (email, password) => {
    const userCredential = await signInWithEmailAndPassword(firebaseAuth, email, password);
    const token = await userCredential.user.getIdToken();

    // Cache the token so the interceptor can use it immediately
    setCachedToken(token);
    localStorage.setItem('token', token);

    // Prevent onAuthStateChanged from making a duplicate sync-profile call
    skipNextAuthChange.current = true;

    // Sync profile with backend
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
      gender: profile.gender || '',
      loading: false,
    };

    localStorage.setItem('userEmail', state.email);
    localStorage.setItem('userRole', state.role);
    localStorage.setItem('userName', state.name);
    localStorage.setItem('userYear', state.year);
    localStorage.setItem('userRoom', state.roomNumber);
    localStorage.setItem('studentType', state.studentType);
    localStorage.setItem('userGender', state.gender);

    setAuthState(state);
    console.log('🔐 Logged in + synced — role:', state.role);
    return profile;
  };

  // ── Logout ──
  const logout = async () => {
    await signOut(firebaseAuth);
    setCachedToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName');
    localStorage.removeItem('userPhone');
    localStorage.removeItem('workerTypes');
    localStorage.removeItem('maxComplaints');
    localStorage.removeItem('studentType');
    localStorage.removeItem('userGender');
    localStorage.removeItem('userYear');
    localStorage.removeItem('userRoom');
    localStorage.removeItem('profileComplete');
    setAuthState({
      token: null,
      email: '',
      role: '',
      year: '',
      roomNumber: '',
      studentType: '',
      name: '',
      gender: '',
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
