import { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Plus, Trophy, Target, ChevronRight, PlayCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function CoachCompetitions() {
  const [activeTab, setActiveTab] = useState<'retos' | 'torneos'>('retos');
  const { challenges, tournaments } = useAppStore();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Competición</h1>
        <button className="bg-emerald-600 hover:bg-emerald-500 text-white w-10 h-10 rounded-full flex items-center justify-center transition-colors">
          <Plus className="w-6 h-6" />
        </button>
      </div>

      <div className="flex p-1 bg-neutral-900 rounded-xl">
        <button
          onClick={() => setActiveTab('retos')}
          className={cn(
            "flex-1 py-2.5 text-sm font-medium rounded-lg transition-colors",
            activeTab === 'retos' ? "bg-neutral-800 text-white shadow-sm" : "text-neutral-400 hover:text-neutral-200"
          )}
        >
          Retos por Niveles
        </button>
        <button
          onClick={() => setActiveTab('torneos')}
          className={cn(
            "flex-1 py-2.5 text-sm font-medium rounded-lg transition-colors",
            activeTab === 'torneos' ? "bg-neutral-800 text-white shadow-sm" : "text-neutral-400 hover:text-neutral-200"
          )}
        >
          Torneos
        </button>
      </div>

      {activeTab === 'retos' && (
        <div className="space-y-4">
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <Target className="w-6 h-6 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-emerald-500 font-medium">Sistema de Retos</h3>
                <p className="text-sm text-emerald-500/80 mt-1">
                  Crea retos con links a videos (YouTube, etc). Los alumnos los ven y practican. No subas videos directamente.
                </p>
              </div>
            </div>
          </div>

          {[1, 2, 3].map(level => {
            const levelChallenges = challenges.filter(c => c.level === level);
            if (levelChallenges.length === 0 && level > 1) return null;

            return (
              <div key={level} className="space-y-3">
                <h2 className="text-lg font-medium text-white flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-neutral-800 flex items-center justify-center text-xs text-neutral-400">
                    {level}
                  </span>
                  Nivel {level}
                </h2>
                
                {levelChallenges.length === 0 ? (
                  <div className="bg-neutral-900 border border-neutral-800 border-dashed rounded-2xl p-4 text-center text-neutral-500 text-sm">
                    No hay retos en este nivel
                  </div>
                ) : (
                  levelChallenges.map(challenge => (
                    <div key={challenge.id} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-white font-medium">{challenge.title}</h3>
                        {challenge.videoUrl && (
                          <a href={challenge.videoUrl} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300">
                            <PlayCircle className="w-5 h-5" />
                          </a>
                        )}
                      </div>
                      <p className="text-sm text-neutral-400">{challenge.description}</p>
                    </div>
                  ))
                )}
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'torneos' && (
        <div className="space-y-4">
          {tournaments.length === 0 ? (
            <div className="text-center py-10 text-neutral-500">
              No hay torneos activos.
            </div>
          ) : (
            tournaments.map(tournament => (
              <div key={tournament.id} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                      <Trophy className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-white font-medium">{tournament.name}</h3>
                      <p className="text-xs text-emerald-500">{tournament.status === 'active' ? 'En curso' : 'Finalizado'}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-neutral-600" />
                </div>
                
                <div className="bg-neutral-950 rounded-xl p-3">
                  <div className="text-xs text-neutral-500 font-medium mb-2 uppercase tracking-wider">Top Ranking</div>
                  {tournament.players.sort((a, b) => b.points - a.points).slice(0, 3).map((p, i) => (
                    <div key={p.athleteId} className="flex justify-between items-center py-1.5 border-b border-neutral-800/50 last:border-0">
                      <div className="flex items-center gap-2">
                        <span className="text-neutral-500 text-sm font-mono">{i + 1}.</span>
                        <span className="text-neutral-300 text-sm">Atleta {p.athleteId.substring(0,4)}</span>
                      </div>
                      <span className="text-white font-medium text-sm">{p.points} pts</span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
