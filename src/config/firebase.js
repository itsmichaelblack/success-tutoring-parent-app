import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// IMPORTANT: Replace these with your real Firebase config values
// Firebase Console → Project Settings → General → Your apps → Web app
const firebaseConfig = {
  apiKey: "AIzaSyDG1LOpFz05Ty9_J7IO6XQvKUJnLTXoriE",
  authDomain: "success-tutoring-test.firebaseapp.com",
  projectId: "success-tutoring-test",
  storageBucket: "success-tutoring-test.firebasestorage.app",
  messagingSenderId: "58527178263",
  appId: "1:58527178263:web:faa2bb480a5e7f930ec652",
  measurementId: "G-7S5N5Y4824"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

export { db };
export default app;
