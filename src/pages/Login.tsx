import { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Activity, User as UserIcon, Shield } from 'lucide-react';
import { loginWithGoogle, loginAnonymously, db } from '../lib/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

export default function Login() {
  const setUser = useAppStore(state => state.setUser);
  const [loading, setLoading] = useState(false);

  const handleMockLogin = (role: 'coach' | 'athlete') => {
    setUser({
      uid: role === 'coach' ? 'coach1' : 'athlete1',
      email: `${role}@test.com`,
      displayName: role === 'coach' ? 'Entrenador Prueba' : 'Atleta Prueba',
      role,
      photoURL: null
    });
  };

  const handleFirebaseLogin = async (role: 'coach' | 'athlete', method: 'google' | 'anon') => {
    try {
      setLoading(true);
      let result;
      if (method === 'google') {
        result = await loginWithGoogle();
      } else {
        result = await loginAnonymously();
      }
      
      const userObj = {
        uid: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName || 'Usuario Anónimo',
        role,
        photoURL: result.user.photoURL
      };

      if (db) {
        const userRef = doc(db, 'users', result.user.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          await setDoc(userRef, userObj);
        } else {
          // Use existing role if they already signed up
          userObj.role = userSnap.data().role;
        }
      }

      setUser(userObj);
    } catch (error: any) {
      if (error.message === "Firebase not configured") {
        // Silently fallback to mock login
        handleMockLogin(role);
      } else {
        console.error(error);
        alert("Error al iniciar sesión: " + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-neutral-950">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center mb-6">
            <Activity className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">ProTraining</h1>
          <p className="text-neutral-400 mt-2">Plataforma de entrenamiento deportivo</p>
        </div>

        <div className="space-y-4 mt-12">
          <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-medium text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-500" />
              Soy Entrenador
            </h2>
            <button
              onClick={() => handleFirebaseLogin('coach', 'google')}
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-3.5 px-4 rounded-xl transition-colors active:scale-[0.98]"
            >
              Entrar como Entrenador
            </button>
          </div>

          <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-medium text-white flex items-center gap-2">
              <UserIcon className="w-5 h-5 text-blue-500" />
              Soy Alumno / Padre
            </h2>
            <button
              onClick={() => handleFirebaseLogin('athlete', 'anon')}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-3.5 px-4 rounded-xl transition-colors active:scale-[0.98]"
            >
              Entrar como Alumno
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
