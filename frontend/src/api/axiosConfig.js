import axios from 'axios';
import { auth } from '../firebase';

const api = axios.create({
  baseURL: '',
});

// Module-level token cache — set immediately by login/register before
// auth.currentUser is populated, so the interceptor always has a valid token.
let _cachedToken = null;

export function setCachedToken(token) {
  _cachedToken = token;
}

api.interceptors.request.use(async (config) => {
  // 1. Try auth.currentUser (best: always fresh)
  const user = auth.currentUser;
  if (user) {
    try {
      const token = await user.getIdToken();
      config.headers.Authorization = `Bearer ${token}`;
      return config;
    } catch (error) {
      console.error('Error fetching Firebase ID token:', error);
    }
  }

  // 2. Fallback: use the cached token set by login/register
  if (_cachedToken) {
    config.headers.Authorization = `Bearer ${_cachedToken}`;
    return config;
  }

  // 3. Last resort: localStorage
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
}, (error) => {
  return Promise.reject(error);
});

export default api;
