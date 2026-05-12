import React, { useState, useMemo, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { ChevronLeft, Trophy, Users, Swords, Award, Play, Check, Trash2, Edit2, Dice6, Save, Layout, Plus, TrendingUp, Star } from 'lucide-react';
import { View } from '../App';
import { Tournament, Match, Student } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { cn } from '../lib/utils';

interface TournamentCreatorProps {
  courseId: string;
  onBack: () => void;
  setView: (view: View, courseId?: string, extra?: any) => void;
  initialTeams?: { name: string; memberIds: string[] }[];
}

const TEAM_NAMES = [
  "Titanes", "Rápidos", "Halcones", "Gladiadores", "Panteras", 
  "Cobras", "Leones", "Águilas", "Lobos", "Dragones", 
  "Ciclones", "Relámpagos", "Truenos", "Delfines", "Tiburones"
];

export const TournamentCreator: React.FC<TournamentCreatorProps> = ({ courseId, onBack, setView, initialTeams }) => {
  const { courses, tournaments, addTournament, deleteTournament, updateMatch } = useAppStore();
  const course = courses.find(c => c.id === courseId);
  const courseTournaments = tournaments.filter(t => t.courseId === courseId);

  const [activeTab, setActiveTab] = useState<'list' | 'create'>('list');
  const [name, setName] = useState('');
  const [type, setType] = useState<'round_robin' | 'elimination' | 'groups_playoffs'>('round_robin');
  const [teamCount, setTeamCount] = useState(4);
  const [rounds, setRounds] = useState(1);
  const [selectedTournament, setSelectedTournament] = useState<string | null>(null);
  const [showTable, setShowTable] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  // Equipos temporales para edición
  const [tempTeams, setTempTeams] = useState<{ id: string; name: string; memberIds: string[] }[]>([]);

  useEffect(() => {
    if (activeTab === 'create' && tempTeams.length === 0) {
      if (initialTeams && initialTeams.length > 0) {
        setTempTeams(initialTeams.map(t => ({ id: uuidv4(), name: t.name, memberIds: t.memberIds })));
        setTeamCount(initialTeams.length);
      } else {
        generateTempTeams(teamCount);
      }
    }
  }, [activeTab, initialTeams, teamCount]);

  const generateTempTeams = (count: number) => {
    const activeStudents = course?.students.filter(s => s.isActive) || [];
    const shuffled = [...activeStudents].sort(() => Math.random() - 0.5);
    
    const newTeams: { id: string; name: string; memberIds: string[] }[] = [];
    for (let i = 0; i < count; i++) {
       newTeams.push({
         id: uuidv4(),
         name: `${TEAM_NAMES[Math.floor(Math.random() * TEAM_NAMES.length)]} ${Math.floor(Math.random() * 99)}`,
         memberIds: []
       });
    }

    shuffled.forEach((s, i) => {
      newTeams[i % count].memberIds.push(s.id);
    });
    setTempTeams(newTeams);
  };

  if (!course) return null;

  const currentTournament = tournaments.find(t => t.id === selectedTournament);

  const leaderboard = useMemo(() => {
    if (!currentTournament || (currentTournament.type !== 'round_robin' && currentTournament.type !== 'groups_playoffs')) return [];
    
    const stats: Record<string, { id: string, name: string, pts: number, pj: number, pg: number, pe: number, pp: number, gf: number, gc: number }> = {};
    
    currentTournament.teams.forEach(t => {
      stats[t.id] = { id: t.id, name: t.name, pts: 0, pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0 };
    });

    currentTournament.matches.forEach(m => {
      if (m.status === 'finished' && m.scoreA !== undefined && m.scoreB !== undefined) {
        const sA = stats[m.teamA];
        const sB = stats[m.teamB];
        if (!sA || !sB) return;

        sA.pj++; sB.pj++;
        sA.gf += m.scoreA; sA.gc += m.scoreB;
        sB.gf += m.scoreB; sB.gc += m.scoreA;

        if (m.scoreA > m.scoreB) {
          sA.pg++; sA.pts += 3; sB.pp++;
        } else if (m.scoreB > m.scoreA) {
          sB.pg++; sB.pts += 3; sA.pp++;
        } else {
          sA.pe++; sB.pe++; sA.pts += 1; sB.pts += 1;
        }
      }
    });

    return Object.values(stats).sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      const difA = a.gf - a.gc;
      const difB = b.gf - b.gc;
      if (difB !== difA) return difB - difA;
      return b.gf - a.gf;
    });
  }, [currentTournament]);

  const generatePlayoffs = () => {
    if (!currentTournament) return;
    
    const topTeamsInput = leaderboard.slice(0, 4);
    if (topTeamsInput.length < 2) return;

    const teams = topTeamsInput.map(t => currentTournament.teams.find(team => team.id === t.id)!);
    const matches: Match[] = [];

    if (teams.length >= 4) {
      // Semifinales
      matches.push({
        id: uuidv4(),
        teamA: teams[0].id,
        teamB: teams[3].id,
        status: 'pending',
        round: 101 // Semifinal
      });
      matches.push({
        id: uuidv4(),
        teamA: teams[1].id,
        teamB: teams[2].id,
        status: 'pending',
        round: 101 // Semifinal
      });
    } else {
      matches.push({
        id: uuidv4(),
        teamA: teams[0].id,
        teamB: teams[1].id,
        status: 'pending',
        round: 102 // Final directa
      });
    }

    const updatedTournament = {
      ...currentTournament,
      matches: [...currentTournament.matches, ...matches],
      type: 'elimination' as const
    };
    
    deleteTournament(currentTournament.id);
    addTournament(updatedTournament);
    setSelectedTournament(updatedTournament.id);
  };

  const generateNextRound = () => {
    if (!currentTournament) return;
    
    const maxRound = Math.max(...currentTournament.matches.map(m => m.round || 0));
    const currentRoundMatches = currentTournament.matches.filter(m => (m.round || 0) === maxRound);
    
    if (currentRoundMatches.some(m => m.status !== 'finished')) {
      alert("Debes terminar todos los partidos de la ronda actual.");
      return;
    }

    const winners = currentRoundMatches.map(m => m.winnerId).filter(Boolean) as string[];
    
    if (winners.length < 2) {
      alert("Torneo finalizado.");
      return;
    }

    const nextMatches: Match[] = [];
    
    // Si acabamos de terminar Semifinales (2 partidos en la ronda actual)
    if (currentRoundMatches.length === 2 && maxRound >= 100) {
      const losers = currentRoundMatches.map(m => m.teamA === m.winnerId ? m.teamB : m.teamA);
      
      // Gran Final
      nextMatches.push({
        id: uuidv4(),
        teamA: winners[0],
        teamB: winners[1],
        status: 'pending',
        round: 102 // Final
      });
      
      // Tercer Puesto
      nextMatches.push({
        id: uuidv4(),
        teamA: losers[0],
        teamB: losers[1],
        status: 'pending',
        round: 103 // 3er Puesto
      });
    } else {
      // Eliminatoria estándar
      for (let i = 0; i < winners.length; i += 2) {
        if (i + 1 < winners.length) {
          nextMatches.push({
            id: uuidv4(),
            teamA: winners[i],
            teamB: winners[i+1],
            status: 'pending',
            round: maxRound + 1
          });
        }
      }
    }

    const updatedTournament = {
      ...currentTournament,
      matches: [...currentTournament.matches, ...nextMatches]
    };

    deleteTournament(currentTournament.id);
    addTournament(updatedTournament);
    setSelectedTournament(updatedTournament.id);
  };

  const handleCreate = () => {
    const teams = [...tempTeams];
    const matches: Match[] = [];

    if (type === 'round_robin') {
      // Liga: Todos contra todos x N vueltas
      for (let r = 0; r < rounds; r++) {
        for (let i = 0; i < teams.length; i++) {
          for (let j = i + 1; j < teams.length; j++) {
            matches.push({
              id: uuidv4(),
              teamA: teams[i].id,
              teamB: teams[j].id,
              status: 'pending',
              round: r + 1
            });
          }
        }
      }
    } else if (type === 'elimination') {
      // Eliminatoria directa (Solo primera ronda, resto se genera al terminar)
      for (let i = 0; i < teams.length; i += 2) {
        if (i + 1 < teams.length) {
          matches.push({
            id: uuidv4(),
            teamA: teams[i].id,
            teamB: teams[i+1].id,
            status: 'pending',
            round: 1
          });
        }
      }
    } else if (type === 'groups_playoffs') {
      // Fase de grupos automática
      // Dividimos en 2 grupos si hay más de 6 equipos
      const halfway = Math.ceil(teams.length / 2);
      const groupA = teams.slice(0, halfway);
      const groupB = teams.slice(halfway);

      const generateGroupMatches = (groupTeams: typeof teams) => {
        for (let i = 0; i < groupTeams.length; i++) {
          for (let j = i + 1; j < groupTeams.length; j++) {
            matches.push({
              id: uuidv4(),
              teamA: groupTeams[i].id,
              teamB: groupTeams[j].id,
              status: 'pending',
              round: 1 // Grupo
            });
          }
        }
      };

      generateGroupMatches(groupA);
      if (groupB.length > 0) generateGroupMatches(groupB);
    }

    const newTournament: Tournament = {
      id: uuidv4(),
      courseId,
      name: name.trim() || `Torneo ${new Date().toLocaleDateString()}`,
      type,
      teams,
      matches,
      createdAt: Date.now(),
      config: {
        rounds,
        groups: type === 'groups_playoffs' ? 2 : 1
      }
    };

    addTournament(newTournament);
    setName('');
    setTempTeams([]);
    setActiveTab('list');
    setSelectedTournament(newTournament.id);
  };

  const updateScore = (matchId: string, a: number, b: number) => {
    if (!selectedTournament || !currentTournament) return;
    const match = currentTournament.matches.find(m => m.id === matchId);
    if (!match) return;

    const winnerId = a > b ? match.teamA : b > a ? match.teamB : undefined;
    
    // Primero actualizamos el match
    const updatedMatchData = { scoreA: a, scoreB: b, winnerId, status: 'finished' as const };
    updateMatch(selectedTournament, matchId, updatedMatchData);

    // Verificamos si la fase actual ha terminado para disparar la siguiente automáticamente
    const updatedMatches = currentTournament.matches.map(m => 
      m.id === matchId ? { ...m, ...updatedMatchData } : m
    );

    const maxRound = Math.max(...updatedMatches.map(m => m.round || 0));
    const currentRoundMatches = updatedMatches.filter(m => (m.round || 0) === maxRound);
    
    if (currentRoundMatches.every(m => m.status === 'finished')) {
      // Si estamos en Semifinales (2 partidos), generamos Final y Bronce automáticamente
      if (currentRoundMatches.length === 2 && maxRound === 101) {
        setTimeout(() => {
          const winners = currentRoundMatches.map(m => m.winnerId).filter(Boolean) as string[];
          const losers = currentRoundMatches.map(m => m.teamA === m.winnerId ? m.teamB : m.teamA);
          
          if (winners.length === 2 && losers.length === 2) {
            const nextMatches: Match[] = [
              { id: uuidv4(), teamA: winners[0], teamB: winners[1], status: 'pending', round: 102 },
              { id: uuidv4(), teamA: losers[0], teamB: losers[1], status: 'pending', round: 103 }
            ];
            const updatedTournament = { ...currentTournament, matches: [...updatedMatches, ...nextMatches] };
            deleteTournament(currentTournament.id);
            addTournament(updatedTournament);
            setSelectedTournament(updatedTournament.id);
          }
        }, 500);
      } 
      // Si estamos en Eliminatoria estándar y quedan equipos
      else if (currentTournament.type === 'elimination' && maxRound < 100) {
        setTimeout(() => {
          const winners = currentRoundMatches.map(m => m.winnerId).filter(Boolean) as string[];
          if (winners.length >= 2) {
            const nextMatches: Match[] = [];
            for (let i = 0; i < winners.length; i += 2) {
              if (i + 1 < winners.length) {
                nextMatches.push({ id: uuidv4(), teamA: winners[i], teamB: winners[i+1], status: 'pending', round: maxRound + 1 });
              }
            }
            const updatedTournament = { ...currentTournament, matches: [...updatedMatches, ...nextMatches] };
            deleteTournament(currentTournament.id);
            addTournament(updatedTournament);
            setSelectedTournament(updatedTournament.id);
          }
        }, 500);
      }
    }
  };

  const deleteTournamentWithFeedback = (id: string) => {
    deleteTournament(id);
    if (selectedTournament === id) setSelectedTournament(null);
  };

  const isCompleted = currentTournament?.matches.every(m => m.status === 'finished');
  const showPlayoffButton = isCompleted && currentTournament?.type !== 'elimination' && currentTournament?.teams.length >= 2;

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
            <ChevronLeft className="w-6 h-6 text-slate-600" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Torneos EF</h1>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{course.name}</p>
          </div>
        </div>
        <Trophy className="w-6 h-6 text-amber-500" />
      </header>

      <div className="p-4 max-w-4xl mx-auto">
        <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-slate-200 mb-6">
          <button 
            onClick={() => setActiveTab('list')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all font-semibold text-sm",
              activeTab === 'list' ? "bg-slate-900 text-white shadow-md" : "text-slate-500 hover:bg-slate-50"
            )}
          >
            <Layout className="w-4 h-4" /> Mis Torneos
          </button>
          <button 
            onClick={() => setActiveTab('create')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all font-semibold text-sm",
              activeTab === 'create' ? "bg-slate-900 text-white shadow-md" : "text-slate-500 hover:bg-slate-50"
            )}
          >
            <Plus className="w-4 h-4" /> Nuevo Torneo
          </button>
        </div>

        {activeTab === 'create' ? (
          <div className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-200 space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Nombre del Torneo</label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Copa Primavera 11A"
                className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-slate-900 focus:ring-2 focus:ring-slate-900 transition-all"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <button 
                onClick={() => setType('round_robin')}
                className={cn(
                  "p-3 rounded-2xl border-2 transition-all flex flex-col items-center gap-1",
                  type === 'round_robin' ? "border-slate-900 bg-slate-900 text-white" : "border-slate-100 bg-slate-50 text-slate-500"
                )}
              >
                <Swords className="w-5 h-5" />
                <span className="text-[10px] font-bold uppercase">Liga</span>
              </button>
              <button 
                onClick={() => setType('elimination')}
                className={cn(
                  "p-3 rounded-2xl border-2 transition-all flex flex-col items-center gap-1",
                  type === 'elimination' ? "border-slate-900 bg-slate-900 text-white" : "border-slate-100 bg-slate-50 text-slate-500"
                )}
              >
                <Award className="w-5 h-5" />
                <span className="text-[10px] font-bold uppercase">Eliminatoria</span>
              </button>
              <button 
                onClick={() => setType('groups_playoffs')}
                className={cn(
                  "p-3 rounded-2xl border-2 transition-all flex flex-col items-center gap-1",
                  type === 'groups_playoffs' ? "border-slate-900 bg-slate-900 text-white" : "border-slate-100 bg-slate-50 text-slate-500"
                )}
              >
                <TrendingUp className="w-5 h-5" />
                <span className="text-[10px] font-bold uppercase">Grup + Playoff</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-2">Equipos: {teamCount}</label>
                <div className="flex items-center gap-3">
                  <input 
                    type="range" 
                    min="2" 
                    max="16" 
                    value={teamCount}
                    onChange={(e) => setTeamCount(parseInt(e.target.value))}
                    className="flex-1 accent-slate-900"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-2">Vueltas (Ida/Vuelta): {rounds}</label>
                <div className="flex items-center gap-3">
                  <input 
                    type="range" 
                    min="1" 
                    max="4" 
                    value={rounds}
                    onChange={(e) => setRounds(parseInt(e.target.value))}
                    className="flex-1 accent-blue-500"
                    disabled={type === 'elimination'}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-bold text-slate-700">Equipos & Nombres</label>
                <button 
                  onClick={() => generateTempTeams(teamCount)}
                  className="text-[10px] font-black uppercase text-blue-500 flex items-center gap-1"
                >
                  <Dice6 className="w-3 h-3" /> Nombres Aleatorios
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1 pr-2">
                {tempTeams.map((team, idx) => (
                  <div key={team.id} className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl group border border-transparent focus-within:border-slate-200">
                    <span className="text-[10px] font-black text-slate-400 w-4">{idx + 1}</span>
                    <input 
                      type="text" 
                      value={team.name}
                      onChange={(e) => {
                        const newTeams = [...tempTeams];
                        newTeams[idx].name = e.target.value;
                        setTempTeams(newTeams);
                      }}
                      className="flex-1 bg-transparent border-none p-0 text-sm font-bold text-slate-700 focus:ring-0"
                    />
                  </div>
                ))}
              </div>
            </div>

            <button 
              onClick={handleCreate}
              className="w-full bg-slate-900 text-white py-4 rounded-3xl font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"
            >
              <Play className="w-5 h-5 fill-white" /> {initialTeams ? 'Iniciar desde Grupos' : 'Generar Fixture'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {courseTournaments.length === 0 ? (
               <div className="bg-white rounded-[32px] p-12 flex flex-col items-center text-center border-2 border-dashed border-slate-200">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                    <Trophy className="w-8 h-8 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">No hay torneos</h3>
                  <p className="text-sm text-slate-500">Crea tu primer fixture de Educación Física.</p>
               </div>
            ) : (
              courseTournaments.map(t => (
                <div key={t.id} className="relative group">
                  <button 
                    onClick={() => setSelectedTournament(t.id)}
                    className={cn(
                      "w-full text-left p-5 rounded-[28px] border transition-all flex items-center justify-between",
                      selectedTournament === t.id ? "bg-slate-900 border-slate-900 text-white shadow-xl" : "bg-white border-slate-100 text-slate-900 shadow-sm"
                    )}
                  >
                    <div>
                      <div className="font-bold">{t.name}</div>
                      <div className={cn("text-[10px] font-black uppercase inline-block px-2 py-0.5 rounded-full mt-1", selectedTournament === t.id ? "bg-white/20" : "bg-slate-100 text-slate-500")}>
                        {t.type === 'round_robin' ? 'Liga' : t.type === 'elimination' ? 'Eliminatoria' : 'Grupos + Playoff'} • {t.teams.length} Equipos
                      </div>
                    </div>
                    <ChevronLeft className="w-5 h-5 rotate-180 opacity-40 group-hover:opacity-100 transition-opacity" />
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      if (deletingId === t.id) {
                        deleteTournamentWithFeedback(t.id);
                        setDeletingId(null);
                      } else {
                        setDeletingId(t.id);
                        // Auto-cancela después de 3 segundos
                        setTimeout(() => setDeletingId(null), 3000);
                      }
                    }}
                    className={cn(
                      "absolute -top-2 -right-2 p-2 rounded-full shadow-lg border transition-all hover:scale-110 active:scale-90",
                      deletingId === t.id ? "bg-rose-600 text-white border-rose-700 animate-pulse" : 
                      selectedTournament === t.id ? "bg-rose-500 text-white border-rose-600" : "bg-white text-rose-500 border-slate-100"
                    )}
                  >
                    {deletingId === t.id ? <Check className="w-3.5 h-3.5" /> : <Trash2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {selectedTournament && currentTournament && activeTab === 'list' && (
          <div className="mt-8 space-y-8 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center justify-between border-b pb-4">
              <div className="flex items-center gap-4">
                <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Swords className="w-5 h-5 text-rose-500" /> Encuentros
                </h2>
                {showPlayoffButton && (
                  <button 
                    onClick={generatePlayoffs}
                    className="bg-amber-500 text-white px-4 py-2 rounded-full text-[10px] font-black uppercase shadow-lg shadow-amber-500/20 animate-bounce flex items-center gap-2"
                  >
                    🚀 Iniciar Playoffs (Final y 3er Puesto)
                  </button>
                )}
                {(currentTournament.type === 'round_robin' || (currentTournament.type === 'groups_playoffs' && !isCompleted)) && (
                  <button 
                    onClick={() => setShowTable(!showTable)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black uppercase transition-all",
                      showTable ? "bg-amber-500 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    )}
                  >
                    <TrendingUp className="w-3.5 h-3.5" /> {showTable ? 'Ver Partidos' : 'Ver Tabla'}
                  </button>
                )}
              </div>
              <button 
                onClick={() => {
                  if (deletingId === selectedTournament) {
                    deleteTournamentWithFeedback(selectedTournament);
                    setDeletingId(null);
                  } else {
                    setDeletingId(selectedTournament);
                    setTimeout(() => setDeletingId(null), 3000);
                  }
                }} 
                className={cn(
                  "p-2 rounded-xl transition-all flex items-center gap-2 font-bold text-xs",
                  deletingId === selectedTournament ? "bg-rose-600 text-white" : "text-rose-500 hover:bg-rose-50"
                )}
              >
                {deletingId === selectedTournament ? '¿Borrar?' : <Trash2 className="w-5 h-5" />}
              </button>
            </div>

            {showTable && currentTournament.type === 'round_robin' ? (
              <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-100">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="px-4 py-3 text-[10px] font-black uppercase text-slate-400">Equipo</th>
                      <th className="px-2 py-3 text-[10px] font-black uppercase text-slate-400 text-center">PJ</th>
                      <th className="px-2 py-3 text-[10px] font-black uppercase text-slate-400 text-center">PTS</th>
                      <th className="px-2 py-3 text-[10px] font-black uppercase text-slate-400 text-center">DG</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((team, idx) => (
                      <tr key={team.id} className={cn("border-b border-slate-50 last:border-none", idx < 3 && "bg-amber-50/30")}>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <span className={cn(
                              "w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold",
                              idx === 0 ? "bg-amber-400 text-white" : "bg-slate-100 text-slate-400"
                            )}>{idx + 1}</span>
                            <span className="font-bold text-sm">{team.name}</span>
                          </div>
                        </td>
                        <td className="px-2 py-4 text-center font-bold text-slate-500">{team.pj}</td>
                        <td className="px-2 py-4 text-center font-black text-slate-900">{team.pts}</td>
                        <td className="px-2 py-4 text-center text-xs font-medium text-slate-400">{team.gf - team.gc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentTournament.matches.map((m, idx) => {
                  const teamA = currentTournament.teams.find(t => t.id === m.teamA);
                  const teamB = currentTournament.teams.find(t => t.id === m.teamB);
                  return (
                    <div key={m.id} className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 text-center">
                          <div className="font-bold text-slate-900 text-sm mb-2">{teamA?.name}</div>
                          <input 
                            type="number" 
                            placeholder="0"
                            value={m.scoreA ?? ''} 
                            onChange={(e) => updateScore(m.id, parseInt(e.target.value) || 0, m.scoreB || 0)}
                            className="w-14 h-14 bg-slate-50 rounded-2xl text-center text-xl font-black focus:ring-2 focus:ring-slate-900 transition-all border-none"
                          />
                        </div>
                        
                        <div className="flex flex-col items-center gap-1">
                          <div className="text-[10px] font-black text-blue-500 uppercase">
                            {m.round === 102 ? 'Final' : m.round === 103 ? '3er Puesto' : m.round === 101 ? 'Semi' : `#${idx + 1}`}
                          </div>
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-bold shadow-sm",
                            m.round && m.round >= 101 ? "bg-amber-500" : "bg-slate-900"
                          )}>VS</div>
                        </div>

                        <div className="flex-1 text-center">
                          <div className="font-bold text-slate-900 text-sm mb-2">{teamB?.name}</div>
                          <input 
                            type="number" 
                            placeholder="0"
                            value={m.scoreB ?? ''} 
                            onChange={(e) => updateScore(m.id, m.scoreA || 0, parseInt(e.target.value) || 0)}
                            className="w-14 h-14 bg-slate-50 rounded-2xl text-center text-xl font-black focus:ring-2 focus:ring-slate-900 transition-all border-none"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl">
              <h3 className="text-lg font-black flex items-center gap-2 mb-4">
                <Award className="w-6 h-6 text-amber-400" /> Podio EF
              </h3>
              <div className="space-y-3">
                 <div className="flex items-center gap-4 bg-white/10 p-4 rounded-2xl border border-white/10">
                   <div className="w-10 h-10 rounded-full bg-amber-400 flex items-center justify-center text-slate-900 ring-4 ring-amber-400/20">
                     <Trophy className="w-5 h-5" />
                   </div>
                   <div className="flex-1">
                     <div className="text-[10px] font-black uppercase text-amber-200">Oro</div>
                     <div className="font-bold">
                       {currentTournament.matches.find(m => m.round === 102)?.winnerId 
                        ? currentTournament.teams.find(t => t.id === currentTournament.matches.find(m => m.round === 102)?.winnerId)?.name
                        : leaderboard[0]?.name || 'Por definir'}
                     </div>
                   </div>
                 </div>
                 <div className="flex items-center gap-4 bg-white/10 p-4 rounded-2xl border border-white/10 opacity-80">
                   <div className="w-10 h-10 rounded-full bg-slate-300 flex items-center justify-center text-slate-900">
                     <Award className="w-5 h-5" />
                   </div>
                   <div className="flex-1">
                     <div className="text-[10px] font-black uppercase text-slate-300">Plata</div>
                     <div className="font-bold">
                       {currentTournament.matches.find(m => m.round === 102)?.status === 'finished'
                        ? currentTournament.teams.find(t => t.id === (currentTournament.matches.find(m => m.round === 102)?.teamA === currentTournament.matches.find(m => m.round === 102)?.winnerId ? currentTournament.matches.find(m => m.round === 102)?.teamB : currentTournament.matches.find(m => m.round === 102)?.teamA))?.name
                        : leaderboard[1]?.name || 'Por definir'}
                     </div>
                   </div>
                 </div>
                 <div className="flex items-center gap-4 bg-white/10 p-4 rounded-2xl border border-white/10 opacity-60">
                   <div className="w-10 h-10 rounded-full bg-amber-700/50 flex items-center justify-center text-amber-200">
                     <Star className="w-5 h-5" />
                   </div>
                   <div className="flex-1">
                     <div className="text-[10px] font-black uppercase text-amber-600">Bronce</div>
                     <div className="font-bold">
                       {currentTournament.matches.find(m => m.round === 103)?.winnerId
                        ? currentTournament.teams.find(t => t.id === currentTournament.matches.find(m => m.round === 103)?.winnerId)?.name
                        : 'Por definir'}
                     </div>
                   </div>
                 </div>
                 <p className="text-[10px] text-white/40 mt-4 italic">El Diploma Olímpico se entrega a los participantes destacados de cada grupo.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
