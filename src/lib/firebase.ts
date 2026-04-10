import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInAnonymously, signOut } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Try to load config if it exists
let firebaseConfig = null;
try {
  // We use a dynamic import or just check if the env vars are present
  // In AI Studio, the config is usually in firebase-applet-config.json
  // For now, we will rely on the user providing it later.
  const configStr = (import.meta as any).env.VITE_FIREBASE_CONFIG;
  if (configStr) {
    firebaseConfig = JSON.parse(configStr);
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
