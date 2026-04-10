import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInAnonymously, signOut } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Try to load config if it exists
let firebaseConfig: any = null;
try {
  const configStr = (import.meta as any).env.VITE_FIREBASE_CONFIG;
  if (configStr) {
    firebaseConfig = JSON.parse(configStr);
  } else if ((import.meta as any).env.VITE_FIREBASE_PROJECT_ID) {
    firebaseConfig = {
      apiKey: (import.meta as any).env.VITE_FIREBASE_API_KEY,
      authDomain: (import.meta as any).env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: (import.meta as any).env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: (import.meta as any).env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: (import.meta as any).env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: (import.meta as any).env.VITE_FIREBASE_APP_ID
    };
  }
} catch (e) {
  console.warn('Firebase config not found or invalid.');
}

export const app = !getApps().length && firebaseConfig ? initializeApp(firebaseConfig) : (getApps().length ? getApp() : null);
export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;

export const googleProvider = new GoogleAuthProvider();

export const loginWithGoogle = async () => {
  if (!auth) throw new Error("Firebase not configured");
  return signInWithPopup(auth, googleProvider);
};

export const loginAnonymously = async () => {
  if (!auth) throw new Error("Firebase not configured");
  return signInAnonymously(auth);
};

export const logout = async () => {
  if (!auth) throw new Error("Firebase not configured");
  return signOut(auth);
};
