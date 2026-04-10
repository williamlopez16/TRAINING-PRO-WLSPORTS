import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Plus, Trophy, Target, ChevronRight, PlayCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function CoachCompetitions() {
  const [activeTab, setActiveTab] = useState<'retos' | 'torneos'>('retos');
  const { challenges, tournaments, addChallenge, addTournament, user } = useAppStore();
  const [showAddChallenge, setShowAddChallenge] = useState(false);
  const [showAddTournament, setShowAddTournament] = useState(false);

  const [newChallenge, setNewChallenge] = useState({ title: '', description: '', level: 1, videoUrl: '' });
  const [newTournament, setNewTournament] = useState({ name: '' });

  const handleAddChallenge = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChallenge.title) return;
    addChallenge({
      coachId: user?.uid || 'unknown',
      ...newChallenge
    });
    setShowAddChallenge(false);
    setNewChallenge({ title: '', description: '', level: 1, videoUrl: '' });
  };

  const handleAddTournament = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTournament.name) return;
    addTournament({
      coachId: user?.uid || 'unknown',
      name: newTournament.name,
      status: 'active',
      players: [],
      matches: []
    });
    setShowAddTournament(false);
    setNewTournament({ name: '' });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Competición</h1>
        <button 
          onClick={() => activeTab === 'retos' ? setShowAddChallenge(true) : setShowAddTournament(true)}
          className="bg-emerald-600 hover:bg-emerald-500 text-white w-10 h-10 rounded-full flex items-center justify-center transition-colors"
        >
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

          {showAddChallenge && (
            <div className="bg-neutral-900 border border-emerald-500/30 rounded-2xl p-5 mb-6">
              <h2 className="text-lg font-medium text-white mb-4">Nuevo Reto</h2>
              <form onSubmit={handleAddChallenge} className="space-y-4">
                <input 
                  type="text" 
                  value={newChallenge.title}
                  onChange={e => setNewChallenge({...newChallenge, title: e.target.value})}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
                  placeholder="Título del reto"
                  required
                />
                <textarea 
                  value={newChallenge.description}
                  onChange={e => setNewChallenge({...newChallenge, description: e.target.value})}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
                  placeholder="Descripción"
                  required
                />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-neutral-400 mb-1">Nivel</label>
                    <select 
                      value={newChallenge.level}
                      onChange={e => setNewChallenge({...newChallenge, level: parseInt(e.target.value)})}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
                    >
                      {[1,2,3,4,5].map(n => <option key={n} value={n}>Nivel {n}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-neutral-400 mb-1">Link Video (Opcional)</label>
                    <input 
                      type="url" 
                      value={newChallenge.videoUrl}
                      onChange={e => setNewChallenge({...newChallenge, videoUrl: e.target.value})}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
                      placeholder="https://youtube.com/..."
                    />
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button 
                    type="button"
                    onClick={() => setShowAddChallenge(false)}
                    className="flex-1 py-3 px-4 rounded-xl font-medium text-neutral-400 hover:text-white bg-neutral-800 hover:bg-neutral-700 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-3 px-4 rounded-xl font-medium text-white bg-emerald-600 hover:bg-emerald-500 transition-colors"
                  >
                    Guardar
                  </button>
                </div>
              </form>
            </div>
          )}

          {[1, 2, 3, 4, 5].map(level => {
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
          {showAddTournament && (
            <div className="bg-neutral-900 border border-emerald-500/30 rounded-2xl p-5 mb-6">
              <h2 className="text-lg font-medium text-white mb-4">Nuevo Torneo</h2>
              <form onSubmit={handleAddTournament} className="space-y-4">
                <input 
                  type="text" 
                  value={newTournament.name}
                  onChange={e => setNewTournament({...newTournament, name: e.target.value})}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
                  placeholder="Nombre del torneo"
                  required
                />
                <div className="flex gap-3 pt-2">
                  <button 
                    type="button"
                    onClick={() => setShowAddTournament(false)}
                    className="flex-1 py-3 px-4 rounded-xl font-medium text-neutral-400 hover:text-white bg-neutral-800 hover:bg-neutral-700 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-3 px-4 rounded-xl font-medium text-white bg-emerald-600 hover:bg-emerald-500 transition-colors"
                  >
                    Guardar
                  </button>
                </div>
              </form>
            </div>
          )}

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
                  {tournament.players.length === 0 && (
                    <div className="text-xs text-neutral-500 py-2 text-center">No hay jugadores aún</div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
