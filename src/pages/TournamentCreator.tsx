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
  onClearInitialTeams?: () => void;
}

const TEAM_NAMES = [
  "Titanes", "Rápidos", "Halcones", "Gladiadores", "Panteras", 
  "Cobras", "Leones", "Águilas", "Lobos", "Dragones", 
  "Ciclones", "Relámpagos", "Truenos", "Delfines", "Tiburones"
];

export const TournamentCreator: React.FC<TournamentCreatorProps> = ({ courseId, onBack, setView, initialTeams, onClearInitialTeams }) => {
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
  const initialTeamsLoadedRef = React.useRef(false);

  useEffect(() => {
    if (initialTeams && initialTeams.length > 0) {
      if (!initialTeamsLoadedRef.current) {
        initialTeamsLoadedRef.current = true;
        setActiveTab('create');
        setTempTeams(initialTeams.map(t => ({ id: uuidv4(), name: t.name, memberIds: t.memberIds || [] })));
        setTeamCount(initialTeams.length);
      }
    } else {
      if (tempTeams.length === 0) {
        generateTempTeams(teamCount);
      }
    }
  }, [initialTeams]);

  const generateTempTeams = (count: number) => {
    const validCount = Math.max(2, count);
    const activeStudents = course?.students.filter(s => s.isActive) || [];
    const shuffled = [...activeStudents].sort(() => Math.random() - 0.5);
    
    const newTeams: { id: string; name: string; memberIds: string[] }[] = [];
    for (let i = 0; i < validCount; i++) {
       newTeams.push({
         id: uuidv4(),
         name: `${TEAM_NAMES[Math.floor(Math.random() * TEAM_NAMES.length)]} ${Math.floor(Math.random() * 99)}`,
         memberIds: []
       });
    }

    if (newTeams.length > 0) {
      shuffled.forEach((s, i) => {
        const targetTeam = newTeams[i % newTeams.length];
        if (targetTeam) targetTeam.memberIds.push(s.id);
      });
    }
    setTempTeams(newTeams);
  };

  const handleTeamCountChange = (count: number) => {
    setTeamCount(count);
    setTempTeams(prev => {
      if (count > prev.length) {
        const added: { id: string; name: string; memberIds: string[] }[] = [];
        for (let i = prev.length; i < count; i++) {
          added.push({
            id: uuidv4(),
            name: `${TEAM_NAMES[Math.floor(Math.random() * TEAM_NAMES.length)]} ${Math.floor(Math.random() * 99)}`,
            memberIds: []
          });
        }
        return [...prev, ...added];
      } else if (count < prev.length) {
        return prev.slice(0, count);
      }
      return prev;
    });
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

    const teams = topTeamsInput
      .map(t => currentTournament.teams.find(team => team.id === t.id))
      .filter((t): t is typeof currentTournament.teams[0] => Boolean(t));
    if (teams.length < 2) return;

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
    if (tempTeams.length < 2) {
      alert("Se requieren al menos 2 equipos para iniciar el torneo.");
      return;
    }

    const teams = tempTeams.map((t, idx) => ({
      ...t,
      name: t.name.trim() || `Equipo ${idx + 1}`
    }));
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

    if (matches.length === 0) {
      alert("No se pudieron generar partidos. Revisa que haya al menos 2 equipos disponibles.");
      return;
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
    initialTeamsLoadedRef.current = false;
    onClearInitialTeams?.();
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

  const isCompleted = Boolean(
    currentTournament?.matches && 
    currentTournament.matches.length > 0 && 
    currentTournament.matches.every(m => m.status === 'finished')
  );
  const showPlayoffButton = Boolean(
    isCompleted && 
    currentTournament?.type !== 'elimination' && 
    (currentTournament?.teams?.length || 0) >= 2
  );

  return (
    <div className="min-h-screen bg-[#0d111c] text-slate-100 pb-20">
      <header className="sticky top-0 z-20 bg-[#0f1523]/95 backdrop-blur-md border-b border-slate-800 px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-slate-800 rounded-xl transition-colors">
            <ChevronLeft className="w-6 h-6 text-slate-400 hover:text-white" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white">Torneos EF</h1>
            <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider">{course.name}</p>
          </div>
        </div>
        <Trophy className="w-6 h-6 text-amber-400" />
      </header>

      <div className="p-4 max-w-4xl mx-auto">
        <div className="flex bg-slate-900 p-1 rounded-2xl shadow-sm border border-slate-800 mb-6">
          <button 
            onClick={() => setActiveTab('list')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all font-semibold text-sm",
              activeTab === 'list' ? "bg-blue-600 text-white shadow-md shadow-blue-600/30" : "text-slate-400 hover:text-white hover:bg-slate-800"
            )}
          >
            <Layout className="w-4 h-4" /> Mis Torneos
          </button>
          <button 
            onClick={() => setActiveTab('create')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all font-semibold text-sm",
              activeTab === 'create' ? "bg-blue-600 text-white shadow-md shadow-blue-600/30" : "text-slate-400 hover:text-white hover:bg-slate-800"
            )}
          >
            <Plus className="w-4 h-4" /> Nuevo Torneo
          </button>
        </div>

        {activeTab === 'create' ? (
          <div className="bg-slate-900 rounded-[32px] p-6 shadow-md border border-slate-800 space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-200 mb-2">Nombre del Torneo</label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Copa Primavera 11A"
                className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-5 py-4 text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <button 
                onClick={() => setType('round_robin')}
                className={cn(
                  "p-3.5 rounded-2xl border transition-all flex flex-col items-center gap-1.5 min-h-[70px] justify-center",
                  type === 'round_robin' ? "border-blue-500 bg-blue-600 text-white shadow-md shadow-blue-600/30" : "border-slate-700 bg-slate-800/80 text-slate-300 hover:bg-slate-750"
                )}
              >
                <Swords className="w-5 h-5" />
                <span className="text-xs font-bold uppercase tracking-wider">Liga</span>
              </button>
              <button 
                onClick={() => setType('elimination')}
                className={cn(
                  "p-3.5 rounded-2xl border transition-all flex flex-col items-center gap-1.5 min-h-[70px] justify-center",
                  type === 'elimination' ? "border-blue-500 bg-blue-600 text-white shadow-md shadow-blue-600/30" : "border-slate-700 bg-slate-800/80 text-slate-300 hover:bg-slate-750"
                )}
              >
                <Award className="w-5 h-5" />
                <span className="text-xs font-bold uppercase tracking-wider">Eliminatoria</span>
              </button>
              <button 
                onClick={() => setType('groups_playoffs')}
                className={cn(
                  "p-3.5 rounded-2xl border transition-all flex flex-col items-center gap-1.5 min-h-[70px] justify-center",
                  type === 'groups_playoffs' ? "border-blue-500 bg-blue-600 text-white shadow-md shadow-blue-600/30" : "border-slate-700 bg-slate-800/80 text-slate-300 hover:bg-slate-750"
                )}
              >
                <TrendingUp className="w-5 h-5" />
                <span className="text-xs font-bold uppercase tracking-wider">Grupos</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black uppercase text-slate-300 mb-2">Equipos: {tempTeams.length > 0 ? tempTeams.length : teamCount}</label>
                <div className="flex items-center gap-3">
                  <input 
                    type="range" 
                    min="2" 
                    max="16" 
                    value={tempTeams.length > 0 ? tempTeams.length : teamCount}
                    onChange={(e) => handleTeamCountChange(parseInt(e.target.value))}
                    className="flex-1 accent-blue-500 h-2 bg-slate-700 rounded-lg cursor-pointer"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-black uppercase text-slate-300 mb-2">Vueltas: {rounds}</label>
                <div className="flex items-center gap-3">
                  <input 
                    type="range" 
                    min="1" 
                    max="4" 
                    value={rounds}
                    onChange={(e) => setRounds(parseInt(e.target.value))}
                    className="flex-1 accent-blue-500 h-2 bg-slate-700 rounded-lg cursor-pointer"
                    disabled={type === 'elimination'}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-sm sm:text-base font-bold text-slate-200">Equipos & Nombres</label>
                <button 
                  onClick={() => generateTempTeams(teamCount)}
                  className="text-xs font-black uppercase text-blue-400 hover:text-blue-300 flex items-center gap-1.5 py-1 px-2 rounded-lg hover:bg-blue-950/40"
                >
                  <Dice6 className="w-3.5 h-3.5" /> Nombres Aleatorios
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-56 overflow-y-auto p-1 pr-2">
                {tempTeams.map((team, idx) => (
                  <div key={team.id} className="flex items-center gap-2.5 bg-slate-800/80 p-2.5 rounded-xl group border border-slate-700/60 focus-within:border-blue-500 min-h-[48px]">
                    <span className="text-xs font-black text-slate-400 w-5 text-center">{idx + 1}</span>
                    <input 
                      type="text" 
                      value={team.name}
                      onChange={(e) => {
                        const newTeams = [...tempTeams];
                        newTeams[idx].name = e.target.value;
                        setTempTeams(newTeams);
                      }}
                      className="flex-1 bg-transparent border-none p-0 text-base font-bold text-slate-200 focus:ring-0 focus:text-white"
                    />
                  </div>
                ))}
              </div>
            </div>

            <button 
              onClick={handleCreate}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 px-6 rounded-2xl font-black text-base sm:text-lg flex items-center justify-center gap-2 shadow-xl shadow-blue-600/30 active:scale-95 transition-all min-h-[52px]"
            >
              <Play className="w-5 h-5 fill-white" /> {initialTeams ? 'Iniciar desde Grupos' : 'Generar Fixture'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {courseTournaments.length === 0 ? (
               <div className="bg-slate-900 rounded-[32px] p-12 flex flex-col items-center text-center border-2 border-dashed border-slate-800">
                  <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4">
                    <Trophy className="w-8 h-8 text-slate-500" />
                  </div>
                  <h3 className="text-lg font-bold text-white">No hay torneos</h3>
                  <p className="text-sm text-slate-400">Crea tu primer fixture de Educación Física.</p>
               </div>
            ) : (
              courseTournaments.map(t => (
                <div key={t.id} className="relative group">
                  <button 
                    onClick={() => setSelectedTournament(t.id)}
                    className={cn(
                      "w-full text-left p-5 rounded-[28px] border transition-all flex items-center justify-between",
                      selectedTournament === t.id ? "bg-slate-800 border-blue-500 text-white shadow-xl shadow-blue-500/10" : "bg-slate-900 border-slate-800 text-slate-100 shadow-sm hover:border-slate-700"
                    )}
                  >
                    <div>
                      <div className="font-bold text-white text-base sm:text-lg">{t.name}</div>
                      <div className={cn("text-xs font-black uppercase inline-block px-3 py-1 rounded-full mt-1.5", selectedTournament === t.id ? "bg-blue-950 text-blue-300 border border-blue-800/60" : "bg-slate-800 text-slate-300")}>
                        {t.type === 'round_robin' ? 'Liga' : t.type === 'elimination' ? 'Eliminatoria' : 'Grupos + Playoff'} • {t.teams.length} Equipos
                      </div>
                    </div>
                    <ChevronLeft className="w-5 h-5 rotate-180 text-slate-400 group-hover:text-white transition-colors" />
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
                      deletingId === t.id ? "bg-rose-600 text-white border-rose-500 animate-pulse" : 
                      selectedTournament === t.id ? "bg-rose-600 text-white border-rose-500" : "bg-slate-800 text-rose-400 border-slate-700 hover:bg-slate-700"
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
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-4">
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  <Swords className="w-5 h-5 text-rose-500" /> Encuentros
                </h2>
                {showPlayoffButton && (
                  <button 
                    onClick={generatePlayoffs}
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-4 py-2 rounded-full text-[10px] font-black uppercase shadow-lg shadow-amber-500/20 animate-bounce flex items-center gap-2"
                  >
                    🚀 Iniciar Playoffs (Final y 3er Puesto)
                  </button>
                )}
                {(currentTournament.type === 'round_robin' || (currentTournament.type === 'groups_playoffs' && !isCompleted)) && (
                  <button 
                    onClick={() => setShowTable(!showTable)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black uppercase transition-all",
                      showTable ? "bg-amber-500 text-slate-950 font-bold" : "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700"
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
                  "p-2 rounded-xl transition-all flex items-center gap-2 font-bold text-xs border",
                  deletingId === selectedTournament ? "bg-rose-600 border-rose-500 text-white" : "border-slate-800 text-rose-400 hover:bg-rose-950/40"
                )}
              >
                {deletingId === selectedTournament ? '¿Borrar?' : <Trash2 className="w-5 h-5" />}
              </button>
            </div>

            {showTable && currentTournament.type === 'round_robin' ? (
              <div className="bg-slate-900 rounded-3xl overflow-hidden shadow-md border border-slate-800">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-800/80 border-b border-slate-700">
                      <th className="px-4 py-3 text-[10px] font-black uppercase text-slate-400">Equipo</th>
                      <th className="px-2 py-3 text-[10px] font-black uppercase text-slate-400 text-center">PJ</th>
                      <th className="px-2 py-3 text-[10px] font-black uppercase text-slate-400 text-center">PTS</th>
                      <th className="px-2 py-3 text-[10px] font-black uppercase text-slate-400 text-center">DG</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((team, idx) => (
                      <tr key={team.id} className={cn("border-b border-slate-800 last:border-none", idx < 3 && "bg-amber-500/5")}>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <span className={cn(
                              "w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold",
                              idx === 0 ? "bg-amber-400 text-slate-950 font-black" : "bg-slate-800 text-slate-400 border border-slate-700"
                            )}>{idx + 1}</span>
                            <span className="font-bold text-sm text-white">{team.name}</span>
                          </div>
                        </td>
                        <td className="px-2 py-4 text-center font-bold text-slate-400">{team.pj}</td>
                        <td className="px-2 py-4 text-center font-black text-white">{team.pts}</td>
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
                    <div key={m.id} className="bg-slate-900 rounded-3xl p-5 shadow-md border border-slate-800">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 text-center">
                          <div className={`text-sm sm:text-base font-bold mb-2 truncate ${m.winnerId === teamA?.id ? 'text-amber-400' : 'text-white'}`}>{teamA?.name}</div>
                          <input 
                            type="number" 
                            placeholder="0"
                            value={m.scoreA ?? ''} 
                            onChange={(e) => updateScore(m.id, parseInt(e.target.value) || 0, m.scoreB || 0)}
                            className="w-14 sm:w-16 h-14 sm:h-16 bg-slate-800 border border-slate-700 rounded-2xl text-center text-2xl font-black text-white placeholder-slate-600 focus:ring-2 focus:ring-blue-500 transition-all"
                          />
                        </div>
                        
                        <div className="flex flex-col items-center gap-1.5">
                          <div className="text-xs font-black text-blue-400 uppercase tracking-wider">
                            {m.round === 102 ? 'Final' : m.round === 103 ? '3er Puesto' : m.round === 101 ? 'Semi' : `#${idx + 1}`}
                          </div>
                          <div className={cn(
                            "w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shadow-sm",
                            m.round && m.round >= 101 ? "bg-amber-500 text-slate-950 font-black" : "bg-slate-800 text-slate-300 border border-slate-700"
                          )}>VS</div>
                        </div>

                        <div className="flex-1 text-center">
                          <div className={`text-sm sm:text-base font-bold mb-2 truncate ${m.winnerId === teamB?.id ? 'text-amber-400' : 'text-white'}`}>{teamB?.name}</div>
                          <input 
                            type="number" 
                            placeholder="0"
                            value={m.scoreB ?? ''} 
                            onChange={(e) => updateScore(m.id, m.scoreA || 0, parseInt(e.target.value) || 0)}
                            className="w-14 sm:w-16 h-14 sm:h-16 bg-slate-800 border border-slate-700 rounded-2xl text-center text-2xl font-black text-white placeholder-slate-600 focus:ring-2 focus:ring-blue-500 transition-all"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl p-6 shadow-xl">
              <h3 className="text-lg font-black flex items-center gap-2 mb-4">
                <Award className="w-6 h-6 text-amber-400" /> Podio EF
              </h3>
              <div className="space-y-3">
                 <div className="flex items-center gap-4 bg-slate-800/80 p-4 rounded-2xl border border-slate-700/60">
                   <div className="w-10 h-10 rounded-full bg-amber-400 flex items-center justify-center text-slate-950 ring-4 ring-amber-400/20 font-black">
                     <Trophy className="w-5 h-5" />
                   </div>
                   <div className="flex-1">
                     <div className="text-[10px] font-black uppercase text-amber-400">Oro</div>
                     <div className="font-bold text-white">
                       {currentTournament.matches.find(m => m.round === 102)?.winnerId 
                        ? currentTournament.teams.find(t => t.id === currentTournament.matches.find(m => m.round === 102)?.winnerId)?.name
                        : leaderboard[0]?.name || 'Por definir'}
                     </div>
                   </div>
                 </div>
                 <div className="flex items-center gap-4 bg-slate-800/80 p-4 rounded-2xl border border-slate-700/60 opacity-80">
                   <div className="w-10 h-10 rounded-full bg-slate-400 flex items-center justify-center text-slate-950 font-black">
                     <Award className="w-5 h-5" />
                   </div>
                   <div className="flex-1">
                     <div className="text-[10px] font-black uppercase text-slate-400">Plata</div>
                     <div className="font-bold text-white">
                       {currentTournament.matches.find(m => m.round === 102)?.status === 'finished'
                        ? currentTournament.teams.find(t => t.id === (currentTournament.matches.find(m => m.round === 102)?.teamA === currentTournament.matches.find(m => m.round === 102)?.winnerId ? currentTournament.matches.find(m => m.round === 102)?.teamB : currentTournament.matches.find(m => m.round === 102)?.teamA))?.name
                        : leaderboard[1]?.name || 'Por definir'}
                     </div>
                   </div>
                 </div>
                 <div className="flex items-center gap-4 bg-slate-800/80 p-4 rounded-2xl border border-slate-700/60 opacity-70">
                   <div className="w-10 h-10 rounded-full bg-amber-700/60 flex items-center justify-center text-amber-200">
                     <Star className="w-5 h-5" />
                   </div>
                   <div className="flex-1">
                     <div className="text-[10px] font-black uppercase text-amber-500">Bronce</div>
                     <div className="font-bold text-white">
                       {currentTournament.matches.find(m => m.round === 103)?.winnerId
                        ? currentTournament.teams.find(t => t.id === currentTournament.matches.find(m => m.round === 103)?.winnerId)?.name
                        : 'Por definir'}
                     </div>
                   </div>
                 </div>
                 <p className="text-[10px] text-slate-400 mt-4 italic">El Diploma Olímpico se entrega a los participantes destacados de cada grupo.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
