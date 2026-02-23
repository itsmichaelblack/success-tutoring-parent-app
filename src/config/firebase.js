import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// IMPORTANT: Replace these with your real Firebase config values
// Firebase Console → Project Settings → General → Your apps → Web app
const firebaseConfig = {
  apiKey: "REPLACE_WITH_YOUR_API_KEY",
  authDomain: "success-tutoring-test.firebaseapp.com",
  projectId: "success-tutoring-test",
  storageBucket: "success-tutoring-test.firebasestorage.app",
  messagingSenderId: "REPLACE_WITH_YOUR_SENDER_ID",
  appId: "REPLACE_WITH_YOUR_APP_ID"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

export { db };
export default app;
