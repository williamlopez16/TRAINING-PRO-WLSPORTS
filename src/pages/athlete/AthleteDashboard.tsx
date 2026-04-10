import { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Trophy, Target, Calendar, LogOut, PlayCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { logout } from '../../lib/firebase';
import { useNavigate } from 'react-router-dom';

export default function AthleteDashboard() {
  const { user, challenges, tournaments } = useAppStore();
  const [activeTab, setActiveTab] = useState<'retos' | 'torneos' | 'sesiones'>('retos');
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (e) {
      // Ignore if not configured
    }
    useAppStore.getState().setUser(null);
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-neutral-950 pb-20">
      {/* Header */}
      <header className="bg-neutral-900 border-b border-neutral-800 p-4 sticky top-0 z-10">
        <div className="max-w-md mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-white">ProTraining</h1>
            <p className="text-sm text-neutral-400">{user?.displayName || 'Atleta'}</p>
          </div>
          <button onClick={handleLogout} className="p-2 text-neutral-400 hover:text-white">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="p-4 max-w-md mx-auto mt-4 space-y-6">
        {/* Tabs */}
        <div className="flex p-1 bg-neutral-900 rounded-xl">
          <button
            onClick={() => setActiveTab('retos')}
            className={cn(
              "flex-1 py-2.5 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2",
              activeTab === 'retos' ? "bg-neutral-800 text-white shadow-sm" : "text-neutral-400 hover:text-neutral-200"
            )}
          >
            <Target className="w-4 h-4" /> Retos
          </button>
          <button
            onClick={() => setActiveTab('torneos')}
            className={cn(
              "flex-1 py-2.5 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2",
              activeTab === 'torneos' ? "bg-neutral-800 text-white shadow-sm" : "text-neutral-400 hover:text-neutral-200"
            )}
          >
            <Trophy className="w-4 h-4" /> Torneos
          </button>
          <button
            onClick={() => setActiveTab('sesiones')}
            className={cn(
              "flex-1 py-2.5 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2",
              activeTab === 'sesiones' ? "bg-neutral-800 text-white shadow-sm" : "text-neutral-400 hover:text-neutral-200"
            )}
          >
            <Calendar className="w-4 h-4" /> Sesiones
          </button>
        </div>

        {/* Content */}
        {activeTab === 'retos' && (
          <div className="space-y-4">
            {challenges.length === 0 ? (
              <div className="text-center py-10 text-neutral-500">No hay retos asignados.</div>
            ) : (
              challenges.map(challenge => (
                <div key={challenge.id} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <span className="text-xs font-medium text-emerald-500 mb-1 block">Nivel {challenge.level}</span>
                      <h3 className="text-white font-medium text-lg">{challenge.title}</h3>
                    </div>
                  </div>
                  <p className="text-neutral-400 text-sm mb-4">{challenge.description}</p>
                  
                  {challenge.videoUrl && (
                    <a 
                      href={challenge.videoUrl} 
                      target="_blank" 
                      rel="noreferrer"
                      className="w-full bg-neutral-800 hover:bg-neutral-700 text-white py-3 rounded-xl flex items-center justify-center gap-2 transition-colors font-medium"
                    >
                      <PlayCircle className="w-5 h-5" />
                      Ver Video del Reto
                    </a>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'torneos' && (
          <div className="space-y-4">
            {tournaments.length === 0 ? (
              <div className="text-center py-10 text-neutral-500">No estás en ningún torneo.</div>
            ) : (
              tournaments.map(tournament => (
                <div key={tournament.id} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                      <Trophy className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-white font-medium text-lg">{tournament.name}</h3>
                      <p className="text-sm text-emerald-500">{tournament.status === 'active' ? 'En curso' : 'Finalizado'}</p>
                    </div>
                  </div>
                  
                  <div className="bg-neutral-950 rounded-xl p-4">
                    <h4 className="text-sm font-medium text-neutral-400 mb-3">Tu Posición</h4>
                    {/* Mocking the position for now */}
                    <div className="flex justify-between items-center">
                      <span className="text-white font-medium">Atleta (Tú)</span>
                      <span className="text-emerald-500 font-bold">
                        {tournament.players.find(p => p.athleteId === user?.uid)?.points || 0} pts
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'sesiones' && (
          <div className="text-center py-10 text-neutral-500">
            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>No tienes sesiones programadas para hoy.</p>
          </div>
        )}
      </main>
    </div>
  );
}
