import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyC2rZnAvSXKSFNUUb5oRA6giuwl52uhlPA",
  authDomain: "hostelhub-d3e4a.firebaseapp.com",
  projectId: "hostelhub-d3e4a",
  storageBucket: "hostelhub-d3e4a.firebasestorage.app",
  messagingSenderId: "160365010550",
  appId: "1:160365010550:web:adf19ef6a71a4326a6c957",
  measurementId: "G-GY5366057E"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
