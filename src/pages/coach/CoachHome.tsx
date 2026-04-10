import { useAppStore } from '../../store/useAppStore';
import { Users, Trophy, Activity, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function CoachHome() {
  const { athletes, tournaments, user } = useAppStore();
  const navigate = useNavigate();

  const activeTournaments = tournaments.filter(t => t.status === 'active').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Hola, {user?.displayName?.split(' ')[0] || 'Entrenador'}</h1>
        <p className="text-neutral-400">Resumen de tu academia hoy</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div 
          onClick={() => navigate('/coach/athletes')}
          className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex flex-col gap-3 cursor-pointer hover:border-neutral-700 transition-colors"
        >
          <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{athletes.length}</p>
            <p className="text-sm text-neutral-400">Atletas activos</p>
          </div>
        </div>

        <div 
          onClick={() => navigate('/coach/competitions')}
          className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex flex-col gap-3 cursor-pointer hover:border-neutral-700 transition-colors"
        >
          <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{activeTournaments}</p>
            <p className="text-sm text-neutral-400">Torneos activos</p>
          </div>
        </div>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-500" />
            Actividad Reciente
          </h2>
        </div>
        
        <div className="space-y-4">
          <div className="text-center py-8 text-neutral-500">
            <p>No hay actividad reciente.</p>
            <p className="text-sm mt-1">Asigna retos o crea torneos para empezar.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
