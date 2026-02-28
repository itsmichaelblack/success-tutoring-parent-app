import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getFunctions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: "AIzaSyDG1LOpFz05Ty9_J7IO6XQvKUJnLTXoriE",
  authDomain: "success-tutoring-test.firebaseapp.com",
  projectId: "success-tutoring-test",
  storageBucket: "success-tutoring-test.firebasestorage.app",
  messagingSenderId: "58527178263",
  appId: "1:58527178263:web:faa2bb480a5e7f930ec652",
  measurementId: "G-7S5N5Y4824"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);
const functions = getFunctions(app);

export { db, auth, functions };
export default app;
