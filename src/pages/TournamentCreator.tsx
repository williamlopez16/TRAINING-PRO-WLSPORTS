import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import { 
  ChevronLeft, Trophy, Swords, Award, Play, Check, Trash2, Edit2, Dice6, 
  Layout, Plus, TrendingUp, Star, Share2, Shield, Lock, Unlock, Eye, 
  Sparkles, RefreshCw, Minus, Calendar, CheckCircle2, RotateCcw, Users, Info
} from 'lucide-react';
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
  "Ciclones", "Relámpagos", "Truenos", "Delfines", "Tiburones",
  "Toros", "Guepardos", "Pumas", "Fénix", "Espartanos"
];

type TournamentFormat = 'round_robin' | 'elimination' | 'groups_playoffs' | 'lightning';

export const TournamentCreator: React.FC<TournamentCreatorProps> = ({ 
  courseId, 
  onBack, 
  setView, 
  initialTeams, 
  onClearInitialTeams 
}) => {
  const { courses, tournaments, histories, addTournament, deleteTournament, updateMatch } = useAppStore();
  const course = courses.find(c => c.id === courseId);
  const courseTournaments = tournaments.filter(t => t.courseId === courseId);

  // Estados de navegación interna
  const [activeTab, setActiveTab] = useState<'create' | 'list'>('create');
  const [selectedTournament, setSelectedTournament] = useState<string | null>(null);
  const [activeViewMode, setActiveViewMode] = useState<'fixture' | 'table' | 'podium'>('fixture');
  const [filterRound, setFilterRound] = useState<number | 'all'>('all');
  const [isStudentMode, setIsStudentMode] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Estados de configuración simplificada
  const [name, setName] = useState('');
  const [format, setFormat] = useState<TournamentFormat>('round_robin');
  const [rounds, setRounds] = useState<number>(1);
  const [teamCount, setTeamCount] = useState<number>(4);
  const [tempTeams, setTempTeams] = useState<{ id: string; name: string; memberIds: string[] }[]>([]);
  const [showTeamsList, setShowTeamsList] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const initialTeamsLoadedRef = useRef(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Inicialización inteligente
  useEffect(() => {
    const todayStr = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    const defaultName = `Torneo EF ${course?.name || ''} - ${todayStr}`;
    
    if (initialTeams && initialTeams.length > 0) {
      if (!initialTeamsLoadedRef.current) {
        initialTeamsLoadedRef.current = true;
        setActiveTab('create');
        setName(defaultName);
        setTempTeams(initialTeams.map(t => ({ id: uuidv4(), name: t.name, memberIds: t.memberIds || [] })));
        setTeamCount(initialTeams.length);
      }
    } else {
      if (courseTournaments.length > 0 && !selectedTournament && !initialTeamsLoadedRef.current) {
        setActiveTab('list');
        setSelectedTournament(courseTournaments[0].id);
      } else if (tempTeams.length === 0) {
        setName(defaultName);
        generateTeamsFromCourse(4);
      }
    }
  }, [initialTeams, courseTournaments.length]);

  // Generar equipos balanceados desde los estudiantes del curso
  const generateTeamsFromCourse = (count: number) => {
    const validCount = Math.max(2, Math.min(16, count));
    setTeamCount(validCount);
    
    const activeStudents = course?.students.filter(s => s.isActive) || [];
    const shuffled = [...activeStudents].sort(() => Math.random() - 0.5);
    
    const newTeams: { id: string; name: string; memberIds: string[] }[] = [];
    for (let i = 0; i < validCount; i++) {
      newTeams.push({
        id: uuidv4(),
        name: `${TEAM_NAMES[i % TEAM_NAMES.length]}`,
        memberIds: []
      });
    }

    if (newTeams.length > 0 && shuffled.length > 0) {
      shuffled.forEach((student, idx) => {
        newTeams[idx % newTeams.length].memberIds.push(student.id);
      });
    }

    setTempTeams(newTeams);
  };

  // Importar desde el último historial de grupos del curso
  const importFromLastHistory = () => {
    const courseHistories = histories.filter(h => h.courseId === courseId);
    if (courseHistories.length === 0) {
      showToast('⚠️ No hay grupos guardados previos en el historial');
      return;
    }
    const last = courseHistories[0];
    const imported = last.groups.map((grp, idx) => ({
      id: uuidv4(),
      name: last.groupNames?.[idx] || `Equipo ${idx + 1}`,
      memberIds: grp.map(s => s.id)
    }));
    setTempTeams(imported);
    setTeamCount(imported.length);
    showToast(`✅ Se cargaron ${imported.length} equipos de la clase anterior`);
  };

  // Asignar nombres temáticos aleatorios
  const randomizeTeamNames = () => {
    const shuffledNames = [...TEAM_NAMES].sort(() => Math.random() - 0.5);
    setTempTeams(prev => prev.map((t, i) => ({
      ...t,
      name: shuffledNames[i % shuffledNames.length]
    })));
    showToast('🎲 Nombres deportivos aleatorios asignados');
  };

  if (!course) return null;

  const currentTournament = tournaments.find(t => t.id === selectedTournament);

  // ==========================================
  // ALGORITMOS PROFESIONALES DE FIXTURE
  // ==========================================

  // Sistema Berger (Rotación Round-Robin por Jornadas)
  const generateBergerFixture = (teams: { id: string; name: string }[], roundsCount: number): Match[] => {
    const n = teams.length;
    if (n < 2) return [];

    const teamList: ({ id: string; name: string } | null)[] = [...teams];
    if (n % 2 !== 0) {
      teamList.push(null); // Dummy para fecha libre
    }

    const totalTeams = teamList.length;
    const roundsPerLeg = totalTeams - 1;
    const matchesPerRound = totalTeams / 2;
    const allMatches: Match[] = [];

    for (let leg = 0; leg < roundsCount; leg++) {
      const currentList = [...teamList];

      for (let r = 0; r < roundsPerLeg; r++) {
        const roundNum = leg * roundsPerLeg + (r + 1);

        for (let m = 0; m < matchesPerRound; m++) {
          const t1 = currentList[m];
          const t2 = currentList[totalTeams - 1 - m];

          if (!t1 || !t2) continue; // Descanso

          // Alternancia local/visita
          const alternate = (r + m) % 2 === 1;
          const isLegTwo = leg % 2 === 1;
          const home = (alternate !== isLegTwo) ? t1.id : t2.id;
          const away = (alternate !== isLegTwo) ? t2.id : t1.id;

          allMatches.push({
            id: uuidv4(),
            teamA: home,
            teamB: away,
            round: roundNum,
            status: 'pending'
          });
        }

        // Rotación Berger: mantener index 0 y rotar el resto
        const fixed = currentList[0];
        const rest = currentList.slice(1);
        const last = rest.pop()!;
        rest.unshift(last);
        currentList.splice(0, currentList.length, fixed, ...rest);
      }
    }

    return allMatches;
  };

  // Eliminatoria Directa (Copa)
  const generateKnockoutFixture = (teams: { id: string; name: string }[]): Match[] => {
    const matches: Match[] = [];
    const n = teams.length;
    if (n < 2) return [];

    if (n === 2) {
      matches.push({
        id: uuidv4(),
        teamA: teams[0].id,
        teamB: teams[1].id,
        round: 102, // Final
        status: 'pending'
      });
      return matches;
    }

    if (n <= 4) {
      matches.push({
        id: uuidv4(),
        teamA: teams[0].id,
        teamB: teams[n > 3 ? 3 : 2].id,
        round: 101, // Semifinal
        status: 'pending'
      });
      matches.push({
        id: uuidv4(),
        teamA: teams[1].id,
        teamB: teams[2].id,
        round: 101, // Semifinal
        status: 'pending'
      });
      return matches;
    }

    // Si son más de 4 equipos (hasta 8 equipos): Cuartos de final
    for (let i = 0; i < Math.floor(n / 2); i++) {
      const opp = n - 1 - i;
      if (opp > i) {
        matches.push({
          id: uuidv4(),
          teamA: teams[i].id,
          teamB: teams[opp].id,
          round: 100, // Cuartos
          status: 'pending'
        });
      }
    }

    return matches;
  };

  // ==========================================
  // CREACIÓN ULTRA RÁPIDA DEL TORNEO
  // ==========================================
  const handleFastCreate = () => {
    if (tempTeams.length < 2) {
      showToast('⚠️ Se requieren al menos 2 equipos para crear un torneo');
      return;
    }

    const cleanTeams = tempTeams.map((t, idx) => ({
      id: t.id,
      name: t.name.trim() || `Equipo ${idx + 1}`,
      memberIds: t.memberIds || []
    }));

    let matches: Match[] = [];
    let effectiveType: Tournament['type'] = 'round_robin';
    let effectiveRounds = rounds;

    if (format === 'round_robin') {
      effectiveType = 'round_robin';
      matches = generateBergerFixture(cleanTeams, rounds);
    } else if (format === 'lightning') {
      effectiveType = 'round_robin';
      effectiveRounds = 1;
      matches = generateBergerFixture(cleanTeams, 1);
    } else if (format === 'elimination') {
      effectiveType = 'elimination';
      effectiveRounds = 1;
      matches = generateKnockoutFixture(cleanTeams);
    } else if (format === 'groups_playoffs') {
      effectiveType = 'groups_playoffs';
      matches = generateBergerFixture(cleanTeams, rounds);
    }

    if (matches.length === 0) {
      showToast('⚠️ No fue posible generar partidos. Revisa los equipos.');
      return;
    }

    const finalTournamentName = name.trim() || `Torneo EF ${course.name}`;

    const newTournament: Tournament = {
      id: uuidv4(),
      courseId,
      name: finalTournamentName,
      type: effectiveType,
      teams: cleanTeams,
      matches,
      createdAt: Date.now(),
      config: {
        rounds: effectiveRounds,
        groups: format === 'groups_playoffs' ? 2 : 1
      }
    };

    addTournament(newTournament);
    setSelectedTournament(newTournament.id);
    setActiveTab('list');
    setActiveViewMode('fixture');
    setFilterRound('all');
    initialTeamsLoadedRef.current = false;
    onClearInitialTeams?.();
    showToast('🚀 ¡Fixture entregado automáticamente y listo para jugar!');
  };

  // ==========================================
  // TABLA DE POSICIONES EN VIVO
  // ==========================================
  const leaderboard = useMemo(() => {
    if (!currentTournament) return [];

    const stats: Record<string, { 
      id: string; 
      name: string; 
      pts: number; 
      pj: number; 
      pg: number; 
      pe: number; 
      pp: number; 
      gf: number; 
      gc: number;
      memberIds: string[];
    }> = {};

    currentTournament.teams.forEach(t => {
      stats[t.id] = { 
        id: t.id, 
        name: t.name, 
        pts: 0, 
        pj: 0, 
        pg: 0, 
        pe: 0, 
        pp: 0, 
        gf: 0, 
        gc: 0, 
        memberIds: t.memberIds || [] 
      };
    });

    currentTournament.matches.forEach(m => {
      if (m.status === 'finished' && m.scoreA !== undefined && m.scoreB !== undefined) {
        // En playoffs (ronda >= 100) no sumamos a la tabla general de liga
        if (m.round && m.round >= 100) return;

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

  // Actualizar marcador
  const handleScoreUpdate = (matchId: string, scoreA: number, scoreB: number) => {
    if (!selectedTournament || !currentTournament) return;
    const match = currentTournament.matches.find(m => m.id === matchId);
    if (!match) return;

    const winnerId = scoreA > scoreB ? match.teamA : scoreB > scoreA ? match.teamB : undefined;
    const updatedData: Partial<Match> = {
      scoreA,
      scoreB,
      winnerId,
      status: 'finished'
    };

    updateMatch(selectedTournament, matchId, updatedData);

    // Progreso automático para Eliminatorias / Playoffs
    const updatedMatches = currentTournament.matches.map(m => 
      m.id === matchId ? { ...m, ...updatedData } : m
    );

    // Semifinales finalizadas -> Generar Gran Final y 3er Puesto automáticamente
    const semiMatches = updatedMatches.filter(m => m.round === 101);
    const alreadyHasFinal = updatedMatches.some(m => m.round === 102);

    if (semiMatches.length === 2 && semiMatches.every(m => m.status === 'finished') && !alreadyHasFinal) {
      const winner1 = semiMatches[0].winnerId;
      const winner2 = semiMatches[1].winnerId;
      const loser1 = semiMatches[0].teamA === winner1 ? semiMatches[0].teamB : semiMatches[0].teamA;
      const loser2 = semiMatches[1].teamA === winner2 ? semiMatches[1].teamB : semiMatches[1].teamA;

      if (winner1 && winner2) {
        setTimeout(() => {
          const nextMatches: Match[] = [
            { id: uuidv4(), teamA: winner1, teamB: winner2, status: 'pending', round: 102 },
            { id: uuidv4(), teamA: loser1, teamB: loser2, status: 'pending', round: 103 }
          ];
          const updatedTournament = {
            ...currentTournament,
            matches: [...updatedMatches, ...nextMatches]
          };
          deleteTournament(currentTournament.id);
          addTournament(updatedTournament);
          setSelectedTournament(updatedTournament.id);
          showToast('🎉 ¡Semifinales concluidas! Se generaron la Gran Final y el 3er Puesto');
        }, 300);
      }
    }
  };

  // Ajuste ergonómico rápido de marcador (+ / -)
  const adjustScore = (matchId: string, teamKey: 'A' | 'B', delta: number) => {
    if (isStudentMode || !currentTournament) return;
    const match = currentTournament.matches.find(m => m.id === matchId);
    if (!match) return;

    const currentA = match.scoreA ?? 0;
    const currentB = match.scoreB ?? 0;

    const newA = teamKey === 'A' ? Math.max(0, currentA + delta) : currentA;
    const newB = teamKey === 'B' ? Math.max(0, currentB + delta) : currentB;

    handleScoreUpdate(matchId, newA, newB);
  };

  // Reiniciar un partido
  const resetMatch = (matchId: string) => {
    if (isStudentMode || !currentTournament) return;
    updateMatch(currentTournament.id, matchId, {
      scoreA: undefined,
      scoreB: undefined,
      winnerId: undefined,
      status: 'pending'
    });
    showToast('🔄 Marcador reiniciado');
  };

  // Iniciar Playoffs en formato Liga + Playoffs
  const startPlayoffs = () => {
    if (!currentTournament || leaderboard.length < 2) return;
    const top4 = leaderboard.slice(0, 4);

    const nextMatches: Match[] = [];
    if (top4.length >= 4) {
      nextMatches.push({
        id: uuidv4(),
        teamA: top4[0].id,
        teamB: top4[3].id,
        round: 101, // Semifinal 1 (1° vs 4°)
        status: 'pending'
      });
      nextMatches.push({
        id: uuidv4(),
        teamA: top4[1].id,
        teamB: top4[2].id,
        round: 101, // Semifinal 2 (2° vs 3°)
        status: 'pending'
      });
    } else {
      nextMatches.push({
        id: uuidv4(),
        teamA: top4[0].id,
        teamB: top4[1].id,
        round: 102, // Final directa
        status: 'pending'
      });
    }

    const updated = {
      ...currentTournament,
      matches: [...currentTournament.matches, ...nextMatches]
    };
    deleteTournament(currentTournament.id);
    addTournament(updated);
    setSelectedTournament(updated.id);
    setFilterRound('all');
    showToast('🚀 ¡Playoffs iniciados con los mejores de la tabla!');
  };

  // Compartir por WhatsApp
  const shareFixtureOnWhatsApp = () => {
    if (!currentTournament) return;

    let text = `🏆 *${currentTournament.name.toUpperCase()}*\n`;
    text += `🏫 Curso: ${course.name}\n`;
    text += `------------------------------------\n\n`;

    if (leaderboard.length > 0) {
      text += `📊 *TABLA DE POSICIONES:*\n`;
      leaderboard.forEach((t, i) => {
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}°`;
        const diff = t.gf - t.gc;
        text += `${medal} *${t.name}*: ${t.pts} pts | PJ: ${t.pj} | DG: ${diff > 0 ? '+' : ''}${diff}\n`;
      });
      text += `\n`;
    }

    text += `⚔️ *FIXTURE Y RESULTADOS:*\n`;
    const roundGroups = new Map<number, Match[]>();
    currentTournament.matches.forEach(m => {
      const r = m.round || 1;
      if (!roundGroups.has(r)) roundGroups.set(r, []);
      roundGroups.get(r)!.push(m);
    });

    Array.from(roundGroups.entries()).sort(([a], [b]) => a - b).forEach(([r, matches]) => {
      const title = r === 102 ? '🏆 Gran Final' : r === 103 ? '🥉 3er Puesto' : r === 101 ? '⭐ Semifinales' : `📅 Fecha ${r}`;
      text += `\n*${title}:*\n`;
      matches.forEach(m => {
        const teamA = currentTournament.teams.find(t => t.id === m.teamA)?.name || 'Equipo A';
        const teamB = currentTournament.teams.find(t => t.id === m.teamB)?.name || 'Equipo B';
        const score = m.status === 'finished' ? `${m.scoreA} - ${m.scoreB}` : 'vs';
        text += `• ${teamA} ${score} ${teamB}\n`;
      });
    });

    text += `\nGenerado con WLSPORTS EF`;

    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, '_blank');
  };

  // Cálculo de estadísticas generales del torneo
  const totalMatches = currentTournament?.matches.length || 0;
  const finishedMatches = currentTournament?.matches.filter(m => m.status === 'finished').length || 0;
  const percentComplete = totalMatches > 0 ? Math.round((finishedMatches / totalMatches) * 100) : 0;
  const hasPlayoffsAvailable = Boolean(
    currentTournament && 
    (currentTournament.type === 'groups_playoffs' || currentTournament.type === 'round_robin') && 
    !currentTournament.matches.some(m => (m.round || 0) >= 100) &&
    leaderboard.length >= 2
  );

  // Rondas disponibles en el torneo actual
  const availableRounds = useMemo(() => {
    if (!currentTournament) return [];
    const set = new Set<number>();
    currentTournament.matches.forEach(m => {
      if (m.round) set.add(m.round);
    });
    return Array.from(set).sort((a, b) => a - b);
  }, [currentTournament]);

  // Partidos filtrados
  const displayedMatches = useMemo(() => {
    if (!currentTournament) return [];
    if (filterRound === 'all') return currentTournament.matches;
    return currentTournament.matches.filter(m => m.round === filterRound);
  }, [currentTournament, filterRound]);

  // Estimación previa para el resumen de creación
  const previewMatchCount = useMemo(() => {
    const n = tempTeams.length;
    if (n < 2) return 0;
    if (format === 'elimination') return n <= 4 ? (n === 2 ? 1 : 4) : n;
    const rPerLeg = n % 2 === 0 ? n - 1 : n;
    const mPerRound = Math.floor(n / 2);
    const totalLegs = format === 'lightning' ? 1 : rounds;
    return rPerLeg * mPerRound * totalLegs;
  }, [tempTeams.length, format, rounds]);

  return (
    <div className="min-h-screen bg-[#080c14] text-slate-100 pb-24 selection:bg-emerald-500/30">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-slate-900 border border-emerald-500/60 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 text-sm font-black animate-in fade-in zoom-in-95">
          <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* HEADER PRINCIPAL */}
      <header className="sticky top-0 z-20 bg-[#090d16]/95 backdrop-blur-md border-b border-slate-800 px-4 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack} 
            className="p-2 hover:bg-slate-800 rounded-xl transition-colors text-slate-400 hover:text-white"
            title="Volver"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <img 
            src="/logo.jpg" 
            alt="OWL VISION PRO" 
            className="w-10 h-10 rounded-xl object-cover border border-amber-400/70 ring-1 ring-emerald-400/40 shadow-sm flex-shrink-0 bg-black"
          />
          <div>
            <h1 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" /> Torneos & Fixtures
            </h1>
            <p className="text-xs font-bold text-amber-400 uppercase tracking-wider">{course.name}</p>
          </div>
        </div>

        {/* Selector de pestañas */}
        <div className="flex bg-slate-950 p-1 rounded-2xl border border-slate-800">
          <button
            onClick={() => setActiveTab('create')}
            className={cn(
              "px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5",
              activeTab === 'create' ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30 neon-glow-green-sm" : "text-slate-400 hover:text-white"
            )}
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" /> Nuevo
          </button>
          <button
            onClick={() => setActiveTab('list')}
            className={cn(
              "px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5",
              activeTab === 'list' ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30" : "text-slate-400 hover:text-white"
            )}
          >
            <Layout className="w-3.5 h-3.5" /> Guardados ({courseTournaments.length})
          </button>
        </div>
      </header>

      <div className="p-4 max-w-4xl mx-auto space-y-6">

        {/* ==================================================== */}
        {/* PESTAÑA 1: NUEVO TORNEO (CONFIGURACIÓN ULTRA RÁPIDA) */}
        {/* ==================================================== */}
        {activeTab === 'create' && (
          <div className="bg-slate-900 rounded-[32px] p-5 sm:p-7 shadow-2xl border border-slate-800 space-y-6 animate-in fade-in">
            {/* Título y Nombre */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-black uppercase text-slate-300 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" /> Nombre del Torneo
                </label>
                <span className="text-xs text-slate-500 font-medium">Sugerencia automática</span>
              </div>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Liga Fútbol Sala 7° Básico"
                className="w-full bg-slate-800/90 border border-slate-700 rounded-2xl px-4 py-3.5 text-base font-bold text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>

            {/* PASO 1: FORMATO DEL TORNEO (4 OPCIONES VISUALES) */}
            <div className="space-y-3">
              <label className="text-xs font-black uppercase text-slate-300 flex items-center gap-2">
                <span>1. Elige el Formato Deportivo</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* LIGA */}
                <button
                  type="button"
                  onClick={() => setFormat('round_robin')}
                  className={cn(
                    "p-4 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between min-h-[110px]",
                    format === 'round_robin' 
                      ? "border-blue-500 bg-blue-600/20 ring-2 ring-blue-500/60 shadow-lg shadow-blue-500/10" 
                      : "border-slate-800 bg-slate-800/60 hover:bg-slate-800 hover:border-slate-700"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-black">
                      <Swords className="w-5 h-5" />
                    </div>
                    {format === 'round_robin' && <CheckCircle2 className="w-5 h-5 text-blue-400" />}
                  </div>
                  <div>
                    <div className="font-black text-white text-base">Liga</div>
                    <div className="text-xs text-slate-400 font-medium mt-0.5 leading-snug">
                      Todos contra todos. Campeón por tabla.
                    </div>
                  </div>
                </button>

                {/* LIGA + PLAYOFFS */}
                <button
                  type="button"
                  onClick={() => setFormat('groups_playoffs')}
                  className={cn(
                    "p-4 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between min-h-[110px]",
                    format === 'groups_playoffs' 
                      ? "border-amber-500 bg-amber-500/20 ring-2 ring-amber-500/60 shadow-lg shadow-amber-500/10" 
                      : "border-slate-800 bg-slate-800/60 hover:bg-slate-800 hover:border-slate-700"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-black">
                      <Star className="w-5 h-5" />
                    </div>
                    {format === 'groups_playoffs' && <CheckCircle2 className="w-5 h-5 text-amber-400" />}
                  </div>
                  <div>
                    <div className="font-black text-white text-base">Liga + Playoffs</div>
                    <div className="text-xs text-slate-400 font-medium mt-0.5 leading-snug">
                      Fase regular + Semifinales y Gran Final.
                    </div>
                  </div>
                </button>

                {/* COPA ELIMINATORIA */}
                <button
                  type="button"
                  onClick={() => setFormat('elimination')}
                  className={cn(
                    "p-4 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between min-h-[110px]",
                    format === 'elimination' 
                      ? "border-rose-500 bg-rose-500/20 ring-2 ring-rose-500/60 shadow-lg shadow-rose-500/10" 
                      : "border-slate-800 bg-slate-800/60 hover:bg-slate-800 hover:border-slate-700"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center font-black">
                      <Award className="w-5 h-5" />
                    </div>
                    {format === 'elimination' && <CheckCircle2 className="w-5 h-5 text-rose-400" />}
                  </div>
                  <div>
                    <div className="font-black text-white text-base">Copa Knockout</div>
                    <div className="text-xs text-slate-400 font-medium mt-0.5 leading-snug">
                      Eliminatoria directa a muerte súbita y bronce.
                    </div>
                  </div>
                </button>

                {/* TORNEO RELÁMPAGO */}
                <button
                  type="button"
                  onClick={() => { setFormat('lightning'); setRounds(1); }}
                  className={cn(
                    "p-4 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between min-h-[110px]",
                    format === 'lightning' 
                      ? "border-emerald-500 bg-emerald-500/20 ring-2 ring-emerald-500/60 shadow-lg shadow-emerald-500/10" 
                      : "border-slate-800 bg-slate-800/60 hover:bg-slate-800 hover:border-slate-700"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    {format === 'lightning' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                  </div>
                  <div>
                    <div className="font-black text-white text-base">Relámpago Express</div>
                    <div className="text-xs text-slate-400 font-medium mt-0.5 leading-snug">
                      1 vuelta rápida para una sola clase.
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* PASO 2: VUELTAS O RONDAS (SI APLICA) */}
            {format !== 'elimination' && format !== 'lightning' && (
              <div className="space-y-2 bg-slate-800/50 p-4 rounded-2xl border border-slate-700/60">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase text-slate-300">
                    2. ¿Cuántas Vueltas / Rondas?
                  </label>
                  <span className="text-xs font-bold text-blue-400">
                    {rounds === 1 ? '1 Vuelta (Solo Ida)' : '2 Vueltas (Ida y Vuelta)'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setRounds(1)}
                    className={cn(
                      "py-3 px-4 rounded-xl border text-sm font-black transition-all flex items-center justify-center gap-2",
                      rounds === 1 ? "bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/30" : "bg-slate-800 text-slate-400 border-slate-700 hover:text-white"
                    )}
                  >
                    1 Vuelta (Recomendado para 1 clase)
                  </button>
                  <button
                    type="button"
                    onClick={() => setRounds(2)}
                    className={cn(
                      "py-3 px-4 rounded-xl border text-sm font-black transition-all flex items-center justify-center gap-2",
                      rounds === 2 ? "bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/30" : "bg-slate-800 text-slate-400 border-slate-700 hover:text-white"
                    )}
                  >
                    2 Vueltas (Ida y Vuelta)
                  </button>
                </div>
              </div>
            )}

            {/* PASO 3: EQUIPOS EN JUEGO */}
            <div className="space-y-3 bg-slate-800/40 p-4 rounded-2xl border border-slate-700/60">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-black uppercase text-slate-300 flex items-center gap-2">
                    <Users className="w-4 h-4 text-emerald-400" />
                    <span>3. Equipos Participantes: {tempTeams.length}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {initialTeams ? 'Importados automáticamente desde tu clase de grupos.' : 'Listos y balanceados.'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={randomizeTeamNames}
                    className="text-xs font-bold text-blue-400 hover:text-blue-300 py-1.5 px-3 rounded-lg bg-blue-950/40 border border-blue-800/50 flex items-center gap-1.5 hover:bg-blue-900/50 transition-colors"
                  >
                    <Dice6 className="w-3.5 h-3.5" /> Nombres
                  </button>
                  {!initialTeams && (
                    <button
                      type="button"
                      onClick={importFromLastHistory}
                      className="text-xs font-bold text-amber-400 hover:text-amber-300 py-1.5 px-3 rounded-lg bg-amber-950/40 border border-amber-800/50 flex items-center gap-1.5 hover:bg-amber-900/50 transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Últimos Grupos
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowTeamsList(!showTeamsList)}
                    className="text-xs font-bold text-slate-400 hover:text-white py-1.5 px-3 rounded-lg bg-slate-800 border border-slate-700"
                  >
                    {showTeamsList ? 'Ocultar Nombres' : 'Editar Nombres'}
                  </button>
                </div>
              </div>

              {/* Selector de cantidad si no vino de grupos */}
              {!initialTeams && (
                <div className="flex items-center gap-2 pt-2">
                  <span className="text-xs font-bold text-slate-400">Cantidad:</span>
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                    {[2, 3, 4, 5, 6, 8].map(num => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => generateTeamsFromCourse(num)}
                        className={cn(
                          "w-9 h-9 rounded-xl text-xs font-black transition-all",
                          tempTeams.length === num ? "bg-blue-600 text-white shadow-md shadow-blue-600/30" : "bg-slate-800 text-slate-400 hover:text-white border border-slate-700"
                        )}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Píldoras de equipos */}
              <div className="flex flex-wrap gap-2 pt-1">
                {tempTeams.map((team, idx) => (
                  <span 
                    key={team.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 text-slate-200 text-xs font-bold border border-slate-700"
                  >
                    <span className="w-4 h-4 rounded-full bg-blue-500/30 text-blue-300 text-[10px] flex items-center justify-center font-black">
                      {idx + 1}
                    </span>
                    <span>{team.name}</span>
                    {team.memberIds.length > 0 && (
                      <span className="text-[10px] text-slate-400 font-semibold">({team.memberIds.length} j.)</span>
                    )}
                  </span>
                ))}
              </div>

              {/* Lista editable desplegable */}
              {showTeamsList && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-3 border-t border-slate-700/60 max-h-48 overflow-y-auto">
                  {tempTeams.map((team, idx) => (
                    <div key={team.id} className="flex items-center gap-2 bg-slate-800 p-2.5 rounded-xl border border-slate-700">
                      <span className="text-xs font-black text-slate-500 w-5">{idx + 1}.</span>
                      <input 
                        type="text"
                        value={team.name}
                        onChange={(e) => {
                          const updated = [...tempTeams];
                          updated[idx].name = e.target.value;
                          setTempTeams(updated);
                        }}
                        className="flex-1 bg-transparent text-sm font-bold text-white focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* RESUMEN PREVIO */}
            <div className="bg-blue-950/30 border border-blue-900/50 rounded-2xl p-4 flex items-center justify-between text-xs font-bold text-blue-200">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-400 flex-shrink-0" />
                <span>
                  {tempTeams.length} Equipos • ~{previewMatchCount} Partidos programados en jornadas ordenadas
                </span>
              </div>
              <span className="text-amber-400 font-black uppercase text-[11px] hidden sm:inline">
                Fixture Automático
              </span>
            </div>

            {/* BOTÓN GIGANTE DE GENERACIÓN INMEDIATA */}
            <button
              type="button"
              onClick={handleFastCreate}
              className="w-full bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white py-4 sm:py-5 px-6 rounded-2xl font-black text-base sm:text-lg flex items-center justify-center gap-3 shadow-xl shadow-blue-600/30 active:scale-95 transition-all min-h-[56px]"
            >
              <Play className="w-6 h-6 fill-white" />
              <span>⚡ Iniciar Torneo y Entregar Fixture</span>
            </button>
          </div>
        )}

        {/* ==================================================== */}
        {/* PESTAÑA 2: TORNEOS GUARDADOS Y FIXTURE ACTIVO        */}
        {/* ==================================================== */}
        {activeTab === 'list' && (
          <div className="space-y-6 animate-in fade-in">
            {/* Selector de Torneos Guardados */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-black uppercase text-slate-300">Tus Torneos de {course.name}</h2>
                <button
                  onClick={() => setActiveTab('create')}
                  className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Nuevo Fixture
                </button>
              </div>

              {courseTournaments.length === 0 ? (
                <div className="bg-slate-900 rounded-[28px] p-8 text-center border-2 border-dashed border-slate-800">
                  <Trophy className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                  <p className="font-bold text-white">No hay torneos activos aún</p>
                  <p className="text-xs text-slate-400 mb-4">Crea un torneo en 1 solo clic y entrega el fixture a tus alumnos.</p>
                  <button
                    onClick={() => setActiveTab('create')}
                    className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold text-xs inline-flex items-center gap-2 shadow-lg shadow-blue-600/30"
                  >
                    <Plus className="w-4 h-4" /> Crear Primer Torneo
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {courseTournaments.map(t => {
                    const isSelected = selectedTournament === t.id;
                    const matchesFinished = t.matches.filter(m => m.status === 'finished').length;
                    const pct = t.matches.length > 0 ? Math.round((matchesFinished / t.matches.length) * 100) : 0;
                    return (
                      <div key={t.id} className="relative group">
                        <button
                          onClick={() => setSelectedTournament(t.id)}
                          className={cn(
                            "w-full text-left p-4 rounded-2xl border transition-all flex flex-col justify-between min-h-[90px]",
                            isSelected 
                              ? "bg-slate-800 border-blue-500 ring-2 ring-blue-500/30 text-white shadow-xl shadow-blue-500/10" 
                              : "bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-200"
                          )}
                        >
                          <div className="pr-6">
                            <div className="font-black text-sm sm:text-base leading-tight truncate">{t.name}</div>
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className="text-[11px] font-black uppercase px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                                {t.type === 'round_robin' ? 'Liga' : t.type === 'elimination' ? 'Copa' : 'Liga + Playoffs'}
                              </span>
                              <span className="text-[11px] font-bold text-slate-400">{t.teams.length} Equipos</span>
                            </div>
                          </div>

                          {/* Barra de progreso */}
                          <div className="mt-3">
                            <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold mb-1">
                              <span>Progreso: {matchesFinished}/{t.matches.length}</span>
                              <span className={pct === 100 ? "text-emerald-400" : "text-blue-400"}>{pct}%</span>
                            </div>
                            <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
                              <div 
                                className={cn("h-full transition-all", pct === 100 ? "bg-emerald-500" : "bg-blue-500")}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        </button>

                        {/* Botón Borrar */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (deletingId === t.id) {
                              deleteTournament(t.id);
                              if (selectedTournament === t.id) setSelectedTournament(null);
                              setDeletingId(null);
                              showToast('🗑️ Torneo eliminado');
                            } else {
                              setDeletingId(t.id);
                              setTimeout(() => setDeletingId(null), 3500);
                            }
                          }}
                          className={cn(
                            "absolute top-2 right-2 p-1.5 rounded-xl border transition-all",
                            deletingId === t.id ? "bg-rose-600 text-white border-rose-500 animate-pulse" : "bg-slate-800/80 text-slate-400 border-slate-700 hover:text-rose-400"
                          )}
                          title={deletingId === t.id ? "Confirmar eliminación" : "Eliminar torneo"}
                        >
                          {deletingId === t.id ? <Check className="w-3.5 h-3.5" /> : <Trash2 className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ==================================================== */}
            {/* DETALLE Y GESTIÓN DEL TORNEO SELECCIONADO            */}
            {/* ==================================================== */}
            {currentTournament && (
              <div className="space-y-6 pt-2">
                {/* BARRA DE HERRAMIENTAS Y VISTAS */}
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-3">
                  {/* Selector de Vistas: Fixture / Tabla / Podio */}
                  <div className="flex bg-slate-950 p-1 rounded-2xl border border-slate-800">
                    <button
                      onClick={() => setActiveViewMode('fixture')}
                      className={cn(
                        "px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5",
                        activeViewMode === 'fixture' ? "bg-blue-600 text-white shadow-md shadow-blue-600/30" : "text-slate-400 hover:text-white"
                      )}
                    >
                      <Swords className="w-3.5 h-3.5" /> Fixture ({currentTournament.matches.length})
                    </button>
                    <button
                      onClick={() => setActiveViewMode('table')}
                      className={cn(
                        "px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5",
                        activeViewMode === 'table' ? "bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20" : "text-slate-400 hover:text-white"
                      )}
                    >
                      <TrendingUp className="w-3.5 h-3.5" /> Tabla
                    </button>
                    <button
                      onClick={() => setActiveViewMode('podium')}
                      className={cn(
                        "px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5",
                        activeViewMode === 'podium' ? "bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20" : "text-slate-400 hover:text-white"
                      )}
                    >
                      <Trophy className="w-3.5 h-3.5" /> Podio
                    </button>
                  </div>

                  {/* Acciones Rápidas: WhatsApp & Modo Alumnos */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={shareFixtureOnWhatsApp}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md shadow-emerald-600/20 active:scale-95 transition-all"
                      title="Compartir fixture y tabla por WhatsApp"
                    >
                      <Share2 className="w-3.5 h-3.5" /> WhatsApp
                    </button>

                    <button
                      onClick={() => {
                        setIsStudentMode(!isStudentMode);
                        showToast(isStudentMode ? '🔓 Modo Profesor activado' : '🔒 Modo Alumnos: Marcadores bloqueados');
                      }}
                      className={cn(
                        "px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 border transition-all",
                        isStudentMode 
                          ? "bg-amber-500 text-slate-950 border-amber-400 font-black ring-2 ring-amber-400/40" 
                          : "bg-slate-800 text-slate-300 border-slate-700 hover:text-white"
                      )}
                      title={isStudentMode ? "Clic para desbloquear edición" : "Bloquear pantalla para mostrar a alumnos"}
                    >
                      {isStudentMode ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                      <span>{isStudentMode ? 'Alumnos (Bloqueado)' : 'Modo Alumnos'}</span>
                    </button>

                    {hasPlayoffsAvailable && (
                      <button
                        onClick={startPlayoffs}
                        className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md shadow-amber-500/20 active:scale-95 transition-all"
                        title="Iniciar Playoffs con los mejores de la tabla"
                      >
                        <Sparkles className="w-3.5 h-3.5" /> Iniciar Playoffs
                      </button>
                    )}
                  </div>
                </div>

                {/* ==================================================== */}
                {/* VISTA 1: FIXTURE (PARTIDOS POR JORNADA)              */}
                {/* ==================================================== */}
                {activeViewMode === 'fixture' && (
                  <div className="space-y-4">
                    {/* Filtro por Jornadas / Rondas */}
                    {availableRounds.length > 1 && (
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                        <button
                          onClick={() => setFilterRound('all')}
                          className={cn(
                            "px-3 py-1.5 rounded-xl text-xs font-black transition-all whitespace-nowrap",
                            filterRound === 'all' ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white border border-slate-700"
                          )}
                        >
                          Todos ({currentTournament.matches.length})
                        </button>
                        {availableRounds.map(r => {
                          const roundTitle = r === 102 ? 'Final' : r === 103 ? '3er Puesto' : r === 101 ? 'Semis' : r === 100 ? 'Cuartos' : `Fecha ${r}`;
                          const roundMatches = currentTournament.matches.filter(m => m.round === r);
                          const roundDone = roundMatches.every(m => m.status === 'finished');
                          return (
                            <button
                              key={r}
                              onClick={() => setFilterRound(r)}
                              className={cn(
                                "px-3 py-1.5 rounded-xl text-xs font-black transition-all whitespace-nowrap flex items-center gap-1.5",
                                filterRound === r 
                                  ? "bg-blue-600 text-white" 
                                  : "bg-slate-800 text-slate-400 hover:text-white border border-slate-700"
                              )}
                            >
                              <span>{roundTitle}</span>
                              {roundDone && <Check className="w-3 h-3 text-emerald-400" />}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Lista de Partidos */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {displayedMatches.map((match, idx) => {
                        const teamA = currentTournament.teams.find(t => t.id === match.teamA);
                        const teamB = currentTournament.teams.find(t => t.id === match.teamB);
                        const isFinished = match.status === 'finished';
                        const roundTitle = match.round === 102 ? '🏆 Gran Final' : match.round === 103 ? '🥉 3er Puesto' : match.round === 101 ? '⭐ Semifinal' : match.round === 100 ? 'Cuartos' : `Fecha ${match.round || 1}`;
                        const isWinnerA = isFinished && match.winnerId === teamA?.id;
                        const isWinnerB = isFinished && match.winnerId === teamB?.id;

                        return (
                          <div 
                            key={match.id}
                            className={cn(
                              "bg-slate-900 border rounded-3xl p-4 sm:p-5 shadow-md flex flex-col justify-between transition-all",
                              isFinished ? "border-slate-800" : "border-slate-800 hover:border-slate-700"
                            )}
                          >
                            {/* Cabecera del Partido */}
                            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5 mb-3">
                              <span className="text-xs font-black uppercase text-blue-400 tracking-wider">
                                {roundTitle}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className={cn(
                                  "text-[10px] font-black uppercase px-2 py-0.5 rounded-md",
                                  isFinished ? "bg-emerald-950 text-emerald-300 border border-emerald-800/60" : "bg-slate-800 text-slate-400"
                                )}>
                                  {isFinished ? 'Finalizado' : 'Por Jugar'}
                                </span>
                                {!isStudentMode && isFinished && (
                                  <button
                                    onClick={() => resetMatch(match.id)}
                                    className="p-1 text-slate-500 hover:text-slate-300 rounded-lg hover:bg-slate-800"
                                    title="Reiniciar partido"
                                  >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Contenido Principal: Equipo A vs Equipo B */}
                            <div className="grid grid-cols-7 items-center gap-2 py-1">
                              {/* EQUIPO A */}
                              <div className="col-span-3 flex flex-col items-center text-center">
                                <div className={cn(
                                  "text-sm sm:text-base font-black leading-tight break-words max-w-full mb-2",
                                  isWinnerA ? "text-amber-400" : "text-white"
                                )}>
                                  {teamA?.name || 'Equipo A'}
                                </div>

                                {/* Controles de Marcador */}
                                <div className="flex items-center gap-1.5">
                                  {!isStudentMode && (
                                    <button
                                      type="button"
                                      onClick={() => adjustScore(match.id, 'A', -1)}
                                      className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center font-black active:scale-90 border border-slate-700 transition-transform"
                                    >
                                      <Minus className="w-3.5 h-3.5" />
                                    </button>
                                  )}

                                  <input 
                                    type="number"
                                    disabled={isStudentMode}
                                    placeholder="0"
                                    value={match.scoreA ?? ''}
                                    onChange={(e) => {
                                      const val = e.target.value === '' ? 0 : parseInt(e.target.value) || 0;
                                      handleScoreUpdate(match.id, val, match.scoreB ?? 0);
                                    }}
                                    className={cn(
                                      "w-12 sm:w-14 h-12 sm:h-14 rounded-2xl text-center text-xl sm:text-2xl font-black transition-all",
                                      isStudentMode 
                                        ? "bg-slate-800 border-none text-white cursor-default" 
                                        : "bg-slate-800 border border-slate-700 text-white focus:ring-2 focus:ring-blue-500"
                                    )}
                                  />

                                  {!isStudentMode && (
                                    <button
                                      type="button"
                                      onClick={() => adjustScore(match.id, 'A', 1)}
                                      className="w-8 h-8 rounded-xl bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center font-black active:scale-90 shadow-md shadow-blue-600/30 transition-transform"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* VS CENTRAL */}
                              <div className="col-span-1 flex flex-col items-center justify-center">
                                <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-[10px] font-black flex items-center justify-center">
                                  VS
                                </div>
                              </div>

                              {/* EQUIPO B */}
                              <div className="col-span-3 flex flex-col items-center text-center">
                                <div className={cn(
                                  "text-sm sm:text-base font-black leading-tight break-words max-w-full mb-2",
                                  isWinnerB ? "text-amber-400" : "text-white"
                                )}>
                                  {teamB?.name || 'Equipo B'}
                                </div>

                                {/* Controles de Marcador */}
                                <div className="flex items-center gap-1.5">
                                  {!isStudentMode && (
                                    <button
                                      type="button"
                                      onClick={() => adjustScore(match.id, 'B', -1)}
                                      className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center font-black active:scale-90 border border-slate-700 transition-transform"
                                    >
                                      <Minus className="w-3.5 h-3.5" />
                                    </button>
                                  )}

                                  <input 
                                    type="number"
                                    disabled={isStudentMode}
                                    placeholder="0"
                                    value={match.scoreB ?? ''}
                                    onChange={(e) => {
                                      const val = e.target.value === '' ? 0 : parseInt(e.target.value) || 0;
                                      handleScoreUpdate(match.id, match.scoreA ?? 0, val);
                                    }}
                                    className={cn(
                                      "w-12 sm:w-14 h-12 sm:h-14 rounded-2xl text-center text-xl sm:text-2xl font-black transition-all",
                                      isStudentMode 
                                        ? "bg-slate-800 border-none text-white cursor-default" 
                                        : "bg-slate-800 border border-slate-700 text-white focus:ring-2 focus:ring-blue-500"
                                    )}
                                  />

                                  {!isStudentMode && (
                                    <button
                                      type="button"
                                      onClick={() => adjustScore(match.id, 'B', 1)}
                                      className="w-8 h-8 rounded-xl bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center font-black active:scale-90 shadow-md shadow-blue-600/30 transition-transform"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ==================================================== */}
                {/* VISTA 2: TABLA DE POSICIONES                         */}
                {/* ==================================================== */}
                {activeViewMode === 'table' && (
                  <div className="bg-slate-900 rounded-3xl overflow-hidden border border-slate-800 shadow-xl">
                    <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                      <h3 className="text-sm font-black text-white flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-amber-400" /> Clasificación Oficial
                      </h3>
                      <span className="text-xs text-slate-400 font-bold">
                        Criterio: Puntos &gt; Dif. Goles &gt; Goles a Favor
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-800/80 border-b border-slate-700 text-xs font-black uppercase text-slate-300">
                            <th className="px-4 py-3.5">Pos. Equipo</th>
                            <th className="px-2 py-3.5 text-center">PJ</th>
                            <th className="px-2 py-3.5 text-center">G</th>
                            <th className="px-2 py-3.5 text-center">E</th>
                            <th className="px-2 py-3.5 text-center">P</th>
                            <th className="px-2 py-3.5 text-center">GF</th>
                            <th className="px-2 py-3.5 text-center">GC</th>
                            <th className="px-2 py-3.5 text-center">DG</th>
                            <th className="px-4 py-3.5 text-center text-amber-400">PTS</th>
                          </tr>
                        </thead>
                        <tbody>
                          {leaderboard.map((team, idx) => {
                            const diff = team.gf - team.gc;
                            const isPlayoffZone = idx < 4 && currentTournament.type === 'groups_playoffs';
                            return (
                              <tr 
                                key={team.id}
                                className={cn(
                                  "border-b border-slate-800 last:border-none transition-colors",
                                  idx === 0 ? "bg-amber-500/10" : idx < 3 ? "bg-slate-800/40" : "",
                                  isPlayoffZone ? "border-l-4 border-l-blue-500" : ""
                                )}
                              >
                                <td className="px-4 py-3.5">
                                  <div className="flex items-center gap-3">
                                    <span className={cn(
                                      "w-6 h-6 rounded-full flex items-center justify-center text-xs font-black",
                                      idx === 0 ? "bg-amber-400 text-slate-950" : 
                                      idx === 1 ? "bg-slate-400 text-slate-950" : 
                                      idx === 2 ? "bg-amber-700 text-amber-100" : 
                                      "bg-slate-800 text-slate-400"
                                    )}>
                                      {idx + 1}
                                    </span>
                                    <div>
                                      <div className="font-black text-sm text-white">{team.name}</div>
                                      {team.memberIds.length > 0 && (
                                        <div className="text-[11px] text-slate-400">
                                          {team.memberIds.length} alumnos asignados
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-2 py-3.5 text-center text-sm font-bold text-slate-300">{team.pj}</td>
                                <td className="px-2 py-3.5 text-center text-sm font-medium text-slate-400">{team.pg}</td>
                                <td className="px-2 py-3.5 text-center text-sm font-medium text-slate-400">{team.pe}</td>
                                <td className="px-2 py-3.5 text-center text-sm font-medium text-slate-400">{team.pp}</td>
                                <td className="px-2 py-3.5 text-center text-sm font-medium text-slate-400">{team.gf}</td>
                                <td className="px-2 py-3.5 text-center text-sm font-medium text-slate-400">{team.gc}</td>
                                <td className={cn(
                                  "px-2 py-3.5 text-center text-sm font-bold",
                                  diff > 0 ? "text-emerald-400" : diff < 0 ? "text-rose-400" : "text-slate-400"
                                )}>
                                  {diff > 0 ? `+${diff}` : diff}
                                </td>
                                <td className="px-4 py-3.5 text-center text-base font-black text-amber-400">
                                  {team.pts}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* ==================================================== */}
                {/* VISTA 3: PODIO Y PREMIACIÓN                          */}
                {/* ==================================================== */}
                {activeViewMode === 'podium' && (
                  <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
                    <div>
                      <h3 className="text-lg font-black text-white flex items-center gap-2">
                        <Award className="w-6 h-6 text-amber-400" /> Podio Oficial Educación Física
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">
                        Reconocimiento al esfuerzo, juego limpio y trabajo en equipo.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* ORO */}
                      <div className="bg-amber-500/10 border-2 border-amber-500/50 rounded-3xl p-5 text-center flex flex-col items-center justify-between">
                        <div className="w-14 h-14 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-amber-400/20 mb-3">
                          <Trophy className="w-7 h-7" />
                        </div>
                        <div>
                          <span className="text-xs font-black uppercase text-amber-400 tracking-wider">
                            1° Lugar • Oro 🥇
                          </span>
                          <h4 className="text-lg font-black text-white mt-1">
                            {currentTournament.matches.find(m => m.round === 102)?.winnerId 
                              ? currentTournament.teams.find(t => t.id === currentTournament.matches.find(m => m.round === 102)?.winnerId)?.name
                              : leaderboard[0]?.name || 'Por definir'}
                          </h4>
                        </div>
                      </div>

                      {/* PLATA */}
                      <div className="bg-slate-800/60 border border-slate-700 rounded-3xl p-5 text-center flex flex-col items-center justify-between">
                        <div className="w-14 h-14 rounded-2xl bg-slate-300 text-slate-950 flex items-center justify-center font-black shadow-md mb-3">
                          <Award className="w-7 h-7" />
                        </div>
                        <div>
                          <span className="text-xs font-black uppercase text-slate-300 tracking-wider">
                            2° Lugar • Plata 🥈
                          </span>
                          <h4 className="text-lg font-black text-white mt-1">
                            {currentTournament.matches.find(m => m.round === 102)?.status === 'finished'
                              ? currentTournament.teams.find(t => t.id === (currentTournament.matches.find(m => m.round === 102)?.teamA === currentTournament.matches.find(m => m.round === 102)?.winnerId ? currentTournament.matches.find(m => m.round === 102)?.teamB : currentTournament.matches.find(m => m.round === 102)?.teamA))?.name
                              : leaderboard[1]?.name || 'Por definir'}
                          </h4>
                        </div>
                      </div>

                      {/* BRONCE */}
                      <div className="bg-slate-800/40 border border-slate-700/60 rounded-3xl p-5 text-center flex flex-col items-center justify-between">
                        <div className="w-14 h-14 rounded-2xl bg-amber-700/80 text-amber-100 flex items-center justify-center font-black shadow-md mb-3">
                          <Star className="w-7 h-7" />
                        </div>
                        <div>
                          <span className="text-xs font-black uppercase text-amber-500 tracking-wider">
                            3° Lugar • Bronce 🥉
                          </span>
                          <h4 className="text-lg font-black text-white mt-1">
                            {currentTournament.matches.find(m => m.round === 103)?.winnerId
                              ? currentTournament.teams.find(t => t.id === currentTournament.matches.find(m => m.round === 103)?.winnerId)?.name
                              : leaderboard[2]?.name || 'Por definir'}
                          </h4>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
