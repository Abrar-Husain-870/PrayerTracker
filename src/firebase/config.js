import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase configuration using environment variables (Vercel) with fallbacks (local dev)
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyD54H4pgkuXF2937WBPnKU1CkwgEBT0Zuk",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "prayertracker-bad18.firebaseapp.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "prayertracker-bad18",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "prayertracker-bad18.firebasestorage.app",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "994167931425",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:994167931425:web:dd25010d56997f4fd95960",
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID || "G-9LJSMEHN1G"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

export default app;
