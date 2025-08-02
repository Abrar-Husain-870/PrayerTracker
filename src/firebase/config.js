import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// TODO: Replace with your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyD54H4pgkuXF2937WBPnKU1CkwgEBT0Zuk",
  authDomain: "prayertracker-bad18.firebaseapp.com",
  projectId: "prayertracker-bad18",
  storageBucket: "prayertracker-bad18.firebasestorage.app",
  messagingSenderId: "994167931425",
  appId: "1:994167931425:web:dd25010d56997f4fd95960",
  measurementId: "G-9LJSMEHN1G"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

export default app;
