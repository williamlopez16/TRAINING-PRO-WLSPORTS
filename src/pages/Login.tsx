import { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Activity, User, Shield } from 'lucide-react';
import { loginWithGoogle, loginAnonymously } from '../lib/firebase';

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
      
      // In a real app, we would fetch the user's role from Firestore here.
      // For this demo, we'll just set it based on the button they clicked.
      setUser({
        uid: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName || 'Usuario Anónimo',
        role,
        photoURL: result.user.photoURL
      });
    } catch (error: any) {
      console.error(error);
      if (error.message === "Firebase not configured") {
        // Silently fallback to mock login
        handleMockLogin(role);
      } else {
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
              <User className="w-5 h-5 text-blue-500" />
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
