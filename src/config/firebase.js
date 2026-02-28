import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { initializeAuth, getAuth, getReactNativePersistence } from 'firebase/auth';
import { getFunctions } from 'firebase/functions';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyDG1LOpFz05Ty9_J7IO6XQvKUJnLTXoriE",
  authDomain: "success-tutoring-test.firebaseapp.com",
  projectId: "success-tutoring-test",
  storageBucket: "success-tutoring-test.firebasestorage.app",
  messagingSenderId: "58527178263",
  appId: "1:58527178263:web:faa2bb480a5e7f930ec652",
  measurementId: "G-7S5N5Y4824"
};

let app;
let auth;

if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage),
  });
} else {
  app = getApp();
  auth = getAuth(app);
}

const db = getFirestore(app);
const functions = getFunctions(app);

export { db, auth, functions };
export default app;
