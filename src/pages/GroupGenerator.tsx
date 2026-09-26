import React, { useState, useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import { 
  ChevronLeft, RefreshCw, Save, AlertCircle, LayoutGrid, 
  Users, Star, Trophy, Dices, Pencil, Check, Share2, 
  Search, Eye, EyeOff, X, CheckCircle2, Shield 
} from 'lucide-react';
import { View } from '../App';
import { Student, GroupConfig, GroupResult } from '../types';
import { cn } from '../lib/utils';
import { v4 as uuidv4 } from 'uuid';
import owlLogo from '../assets/logo.jpg';

const RANDOM_TEAM_NAMES = [
  'Tiburones', 'Águilas Reales', 'Leones', 'Panteras Negras', 'Halcones', 
  'Relámpagos', 'Titanes', 'Guerreros', 'Fénix', 'Dragones', 
  'Toros Salvajes', 'Espartanos', 'Vikingos', 'Pumas', 'Cobras', 
  'Huracanes', 'Lobos Grises', 'Rayos', 'Gladiadores', 'Centellas', 
  'Grizzlies', 'Cóndores', 'Jaguares', 'Astros', 'Ciclones', 
  'Halcones Dorados', 'Cometas', 'Leopardos', 'Tsunamis', 'Bravos',
  'Invictos', 'Raptors', 'Pioneros', 'Centuriones', 'Valientes',
  'Tigres', 'Rangers', 'Víboras', 'Meteoros', 'Imperio', 'Furia Roja'
];

interface GroupGeneratorProps {
  courseId: string;
  onNavigate: (view: View, courseId?: string, extra?: any) => void;
}

export function GroupGenerator({ courseId, onNavigate }: GroupGeneratorProps) {
  const { courses, saveHistory, histories, setAllStudentsActive } = useAppStore();
  const course = courses.find(c => c.id === courseId);
  const courseHistories = useMemo(() => histories.filter(h => h.courseId === courseId).sort((a,b) => b.date - a.date), [histories, courseId]);
  const activeStudents = useMemo(() => course?.students.filter(s => s.isActive) || [], [course]);

  const [config, setConfig] = useState<GroupConfig>({
    mode: 'random',
    type: 'by_count',
    value: 2
  });

  const [result, setResult] = useState<Student[][] | null>(null);
  const [groupNames, setGroupNames] = useState<string[]>([]);
  const [editingGroupIdx, setEditingGroupIdx] = useState<number | null>(null);
  const [editingNameValue, setEditingNameValue] = useState<string>('');
  const [selectedStudent, setSelectedStudent] = useState<{groupIdx: number, sIdx: number} | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [isTeacherUnlocked, setIsTeacherUnlocked] = useState(false);
  const [searchStudentTerm, setSearchStudentTerm] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(curr => curr === msg ? null : curr);
    }, 3200);
  };

  const shareGroups = async () => {
    if (!result || !course) return;
    const dateStr = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    let text = `⚽ *GRUPOS - ${course.name.toUpperCase()}*\n📅 ${dateStr} • ${result.length} Equipos\n\n`;
    
    result.forEach((group, idx) => {
      const name = groupNames[idx] || `Grupo ${idx + 1}`;
      text += `🏆 *${name}* (${group.length} integrantes):\n`;
      group.forEach((student, sIdx) => {
        text += `  • ${student.name}\n`;
      });
      text += `\n`;
    });

    text += `Generado con WLSPORTS Groups`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Grupos - ${course.name}`,
          text: text
        });
        return;
      } catch (err) {
        // Fallback to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(text);
      showToast('📋 ¡Grupos copiados! Listo para pegar en WhatsApp');
    } catch (err) {
      showToast('No se pudo copiar automáticamente');
    }
  };

  if (!course) return null;

  const generate = () => {
    let pool = [...activeStudents];

    if (config.mode === 'men_only') pool = pool.filter(s => s.gender === 'M' || s.gender === 'H');
    if (config.mode === 'women_only') pool = pool.filter(s => s.gender === 'F');

    // Separar por células (1-4), Líderes y pool regular
    const leaderPool = pool.filter(s => s.leaderCandidate);
    const cellPools = [
      pool.filter(s => s.reservedGroup === 1 && !s.leaderCandidate),
      pool.filter(s => s.reservedGroup === 2 && !s.leaderCandidate),
      pool.filter(s => s.reservedGroup === 3 && !s.leaderCandidate),
      pool.filter(s => s.reservedGroup === 4 && !s.leaderCandidate)
    ];
    const regularPool = pool.filter(s => !s.reservedGroup && !s.leaderCandidate);
    
    // Shuffle todos los pools
    const shuffle = (array: any[]) => {
      for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
      }
    };
    shuffle(leaderPool);
    cellPools.forEach(shuffle);
    shuffle(regularPool);
    
    let numGroups = config.value;
    if (config.type === 'by_size') {
      numGroups = Math.max(1, Math.ceil(pool.length / config.value));
    } else {
      numGroups = Math.max(1, parseInt(String(config.value)));
    }
    
    let groups: Student[][] = Array.from({ length: numGroups }, () => []);
    
    // CASO: Modos no separados por sexo
    if (config.mode !== 'separated_gender') {
      let gIdx = 0;

      // 1. Distribuir LÍDERES (Uno por grupo hasta agotar o llenar todos los grupos)
      const leaderOffset = Math.floor(Math.random() * numGroups);
      leaderPool.forEach((student, i) => {
        groups[(leaderOffset + i) % numGroups].push(student);
      });
      
      // 2. Distribuir CÉLULAS (Separación garantizada)
      cellPools.forEach(cell => {
        let offset = Math.floor(Math.random() * numGroups);
        cell.forEach((student, i) => {
          groups[(offset + i) % numGroups].push(student);
        });
      });
      
      // 3. Rellenar con pool regular
      // Historial para penalización
      const recentPairs = new Set<string>();
      courseHistories.slice(0, 2).forEach(hist => {
        hist.groups.forEach(group => {
          for (let i = 0; i < group.length; i++) {
            for (let j = i + 1; j < group.length; j++) {
              recentPairs.add(`${group[i].id}-${group[j].id}`);
              recentPairs.add(`${group[j].id}-${group[i].id}`);
            }
          }
        });
      });

      const getNormalizedGender = (gender: string) => {
        const g = (gender || '').toUpperCase();
        if (g === 'M' || g === 'H' || g === 'HOMBRE' || g === 'VARÓN') return 'M';
        if (g === 'F' || g === 'MUJER') return 'F';
        return 'O';
      };

      const findBestIdx = (student: Student, isBalancedMode: boolean) => {
        let bestIdx = 0;
        let minPenalty = Infinity;
        let minSize = Infinity;
        let minGenderCount = Infinity;
        
        const studentCategory = getNormalizedGender(student.gender);

        // Mezclamos el orden de revisión de grupos
        const groupIndices = Array.from({ length: numGroups }, (_, i) => i);
        for (let i = groupIndices.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [groupIndices[i], groupIndices[j]] = [groupIndices[j], groupIndices[i]];
        }

        for (const idx of groupIndices) {
          const g = groups[idx];
          
          // Contador de género para balance usando normalización
          const genderCount = g.filter(m => getNormalizedGender(m.gender) === studentCategory).length;
          
          // Penalización por historial
          let penalty = 0;
          g.forEach(member => {
            if (recentPairs.has(`${student.id}-${member.id}`)) penalty++;
          });

          if (isBalancedMode) {
            // En modo balanceado: Prioridad absoluta al balance de género del pool actual
            if (genderCount < minGenderCount || 
               (genderCount === minGenderCount && g.length < minSize) ||
               (genderCount === minGenderCount && g.length === minSize && penalty < minPenalty)) {
              minGenderCount = genderCount;
              minSize = g.length;
              minPenalty = penalty;
              bestIdx = idx;
            }
          } else {
            // En modo normal: 1. Menos penalización, 2. Menor tamaño
            if (penalty < minPenalty || (penalty === minPenalty && g.length < minSize)) {
              minPenalty = penalty;
              minSize = g.length;
              bestIdx = idx;
            }
          }
        }
        return bestIdx;
      };
      
      const isBalanced = config.mode === 'balanced_mixed' || config.mode === 'balanced_gender';
      
      if (isBalanced) {
        const boys = regularPool.filter(s => getNormalizedGender(s.gender) === 'M');
        const girls = regularPool.filter(s => getNormalizedGender(s.gender) === 'F');
        const others = regularPool.filter(s => getNormalizedGender(s.gender) === 'O');
        
        const distribute = (arr: Student[]) => {
          arr.forEach(s => {
            const currentIdx = findBestIdx(s, true);
            groups[currentIdx].push(s);
          });
        };
        distribute(boys);
        distribute(girls);
        distribute(others);
      } else {
        regularPool.forEach(s => {
          const currentIdx = findBestIdx(s, false);
          groups[currentIdx].push(s);
        });
      }

      // 3. CAMUFLAJE FINAL: Mezclar el orden INTERNO de cada grupo
      // Esto evita que los especiales queden siempre "arriba" en la lista del grupo
      groups.forEach(group => {
        for (let i = group.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [group[i], group[j]] = [group[j], group[i]];
        }
      });
    } else {
      // CASO: Separados por sexo
      const boys = pool.filter(s => s.gender === 'M' || s.gender === 'H');
      const girls = pool.filter(s => s.gender === 'F');
      const others = pool.filter(s => s.gender !== 'M' && s.gender !== 'H' && s.gender !== 'F');

      if (config.type === 'by_size') {
        const s = config.value;
        let bGroupsNum = Math.ceil(boys.length / s);
        let gGroupsNum = Math.ceil(girls.length / s);
        
        groups = [];
        for (let i = 0; i < bGroupsNum; i++) groups.push([]);
        boys.forEach((student, i) => groups[i % bGroupsNum].push(student));
        
        const gOffset = groups.length;
        for (let i = 0; i < gGroupsNum; i++) groups.push([]);
        girls.forEach((student, i) => groups[gOffset + (i % gGroupsNum)].push(student));
        
        if (others.length > 0 && groups.length > 0) {
          others.forEach((student, i) => groups[i % groups.length].push(student));
        } else if (others.length > 0) {
          groups.push([...others]);
        }
      } else {
        const totalGroups = config.value;
        const bRatio = boys.length / (boys.length + girls.length || 1);
        let bGroupsNum = Math.round(totalGroups * bRatio);
        let gGroupsNum = totalGroups - bGroupsNum;

        if (bGroupsNum === 0 && boys.length > 0 && totalGroups > 1) { bGroupsNum = 1; gGroupsNum = totalGroups - 1; }
        if (gGroupsNum === 0 && girls.length > 0 && totalGroups > 1) { gGroupsNum = 1; bGroupsNum = totalGroups - 1; }

        groups = [];
        for (let i = 0; i < bGroupsNum; i++) groups.push([]);
        if (bGroupsNum > 0) {
          boys.forEach((student, i) => groups[i % bGroupsNum].push(student));
        }

        const gOffset = groups.length;
        for (let i = 0; i < gGroupsNum; i++) groups.push([]);
        if (gGroupsNum > 0) {
          girls.forEach((student, i) => groups[gOffset + (i % gGroupsNum)].push(student));
        }

        if (others.length > 0 && groups.length > 0) {
          others.forEach((student, i) => groups[i % groups.length].push(student));
        } else if (others.length > 0) {
          groups.push([...others]);
        }
      }
    }

    const filteredGroups = groups.filter(g => g.length > 0);
    setResult(filteredGroups);
    setGroupNames(filteredGroups.map((_, i) => `Grupo ${i + 1}`));
    setSelectedStudent(null);
    setSearchStudentTerm('');
    setEditingGroupIdx(null);
    setIsSaved(false);
  };

  const assignRandomNamesAll = () => {
    if (!result || (isSaved && !isTeacherUnlocked)) return;
    const shuffled = [...RANDOM_TEAM_NAMES].sort(() => 0.5 - Math.random());
    const newNames = result.map((_, i) => shuffled[i % shuffled.length] || `Equipo ${i + 1}`);
    setGroupNames(newNames);
    if (isSaved) setIsSaved(false);
    showToast('🎲 Nombres deportivos asignados');
  };

  const assignRandomNameSingle = (idx: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!result || (isSaved && !isTeacherUnlocked)) return;
    const currentNames = [...groupNames];
    const available = RANDOM_TEAM_NAMES.filter(n => !currentNames.includes(n));
    const pool = available.length > 0 ? available : RANDOM_TEAM_NAMES;
    const randomChoice = pool[Math.floor(Math.random() * pool.length)];
    currentNames[idx] = randomChoice;
    setGroupNames(currentNames);
    if (editingGroupIdx === idx) {
      setEditingNameValue(randomChoice);
    }
    if (isSaved) setIsSaved(false);
  };

  const startEditingName = (idx: number, currentName: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (isSaved && !isTeacherUnlocked) return;
    setEditingGroupIdx(idx);
    setEditingNameValue(currentName);
  };

  const saveEditingName = (idx: number) => {
    const trimmed = editingNameValue.trim();
    const currentNames = [...groupNames];
    currentNames[idx] = trimmed || `Grupo ${idx + 1}`;
    setGroupNames(currentNames);
    setEditingGroupIdx(null);
    if (isSaved) setIsSaved(false);
  };

  const handleStudentClick = (groupIdx: number, sIdx: number) => {
    // Solo se permite reubicar si el docente activó el escudo en secreto
    if (!result || !isTeacherUnlocked) return;
    
    if (!selectedStudent) {
      setSelectedStudent({ groupIdx, sIdx });
    } else {
      // Si toca al mismo alumno, deseleccionar
      if (selectedStudent.groupIdx === groupIdx && selectedStudent.sIdx === sIdx) {
        setSelectedStudent(null);
        return;
      }

      // Reubicar discretamente los dos alumnos
      const newResult = [...result].map(arr => [...arr]);
      const temp = newResult[selectedStudent.groupIdx][selectedStudent.sIdx];
      newResult[selectedStudent.groupIdx][selectedStudent.sIdx] = newResult[groupIdx][sIdx];
      newResult[groupIdx][sIdx] = temp;
      
      setResult(newResult);
      setSelectedStudent(null);
      showToast('Estudiantes reubicados');
      // Si estaba guardado previamente, permitir volver a guardar la nueva distribución
      if (isSaved) {
        setIsSaved(false);
      }
    }
  };

  const save = () => {
    if (!result || isSaved) return;
    const finalNames = result.map((_, i) => groupNames[i] || `Grupo ${i + 1}`);
    saveHistory({
      id: uuidv4(),
      courseId,
      date: Date.now(),
      config,
      groups: result,
      groupNames: finalNames
    });
    setIsSaved(true);
    setSelectedStudent(null);
    setEditingGroupIdx(null);
    showToast('💾 ¡Grupos guardados exitosamente!');
  };

  return (
    <div className="flex-1 flex flex-col bg-[#080c14] min-h-screen text-slate-100">
      <header className="bg-[#090d16]/95 backdrop-blur-md px-4 py-4 flex items-center justify-between border-b border-slate-800/90 sticky top-0 z-10">
        <button 
          onClick={() => onNavigate('home')} 
          className="p-2 -ml-2 text-slate-400 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-7 h-7" />
        </button>
        <div className="flex-1 px-3 flex items-center justify-center gap-2.5 min-w-0">
          <img 
            src={owlLogo} 
            onError={(e) => { (e.target as HTMLImageElement).src = '/logo.jpg'; }}
            alt="OWL VISION PRO" 
            className="w-9 h-9 rounded-xl object-cover border border-amber-400/80 ring-1 ring-emerald-400/50 shadow-sm shrink-0 bg-black"
          />
          <div className="text-center min-w-0">
            <h1 className="text-lg sm:text-xl font-black text-white truncate">
              Sorteo de Grupos
            </h1>
            <p className="text-xs font-bold text-amber-400 uppercase tracking-wider">{course.name}</p>
          </div>
        </div>
        <button 
          onClick={() => {
            setIsTeacherUnlocked(prev => !prev);
            setSelectedStudent(null);
          }}
          className={cn(
            "p-2 rounded-xl transition-all active:scale-95 border",
            isTeacherUnlocked 
              ? "bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-md shadow-amber-500/20" 
              : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-300"
          )}
          aria-label="Seguridad"
        >
          <Shield className="w-5 h-5" />
        </button>
      </header>

      {!result ? (
        <div className="p-6 space-y-7 pb-20">
          
          <div className="bg-[#0b101b] rounded-3xl p-6 border border-slate-800 shadow-xl space-y-6">
            <div>
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-4">¿Cómo dividir?</label>
              <div className="flex bg-slate-950 p-1 rounded-2xl mb-4 border border-slate-800">
                <button 
                  onClick={() => setConfig({...config, type: 'by_count'})}
                  className={`flex-1 py-3 text-sm font-black rounded-xl transition-all ${config.type === 'by_count' ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30 neon-glow-green-sm' : 'text-slate-400 hover:text-white'}`}
                >
                  <LayoutGrid className="w-4 h-4 inline-block mr-2" /> Cantidad
                </button>
                <button 
                  onClick={() => setConfig({...config, type: 'by_size'})}
                  className={`flex-1 py-3 text-sm font-black rounded-xl transition-all ${config.type === 'by_size' ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30 neon-glow-green-sm' : 'text-slate-400 hover:text-white'}`}
                >
                  <Users className="w-4 h-4 inline-block mr-2" /> Por Grupo
                </button>
              </div>

              <div className="flex items-center gap-4">
                <button onClick={() => setConfig({...config, value: Math.max(1, config.value - 1)})} className="w-14 h-14 bg-slate-900 border border-slate-800 rounded-2xl text-2xl font-black text-slate-200 hover:border-amber-400/60 active:bg-slate-800 transition-colors">-</button>
                <div className="flex-1 text-center font-black text-5xl text-white tracking-tight">{config.value}</div>
                <button onClick={() => setConfig({...config, value: config.value + 1})} className="w-14 h-14 bg-slate-900 border border-slate-800 rounded-2xl text-2xl font-black text-slate-200 hover:border-amber-400/60 active:bg-slate-800 transition-colors">+</button>
              </div>
              <div className="text-center mt-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                {config.type === 'by_count' ? 'Grupos en total' : 'Estudiantes por grupo'}
              </div>
            </div>
            
            <hr className="border-slate-800/80" />

            <div>
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-4">Modo de distribución</label>
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => setConfig({...config, mode: 'random'})}
                  className={`p-3 rounded-xl text-sm font-black border transition-colors ${config.mode === 'random' ? 'bg-emerald-500 border-emerald-400 text-slate-950 shadow-md shadow-emerald-500/30 neon-glow-green-sm' : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'}`}
                >Azar</button>
                <button 
                  onClick={() => setConfig({...config, mode: 'balanced_mixed'})}
                  className={`p-3 rounded-xl text-sm font-black border transition-colors ${config.mode === 'balanced_mixed' ? 'bg-amber-500 border-amber-400 text-slate-950 shadow-md shadow-amber-500/30' : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'}`}
                >Equitativo</button>
                <button 
                  onClick={() => setConfig({...config, mode: 'men_only'})}
                  className={`p-3 rounded-xl text-sm font-black border transition-colors ${config.mode === 'men_only' ? 'bg-cyan-500 border-cyan-400 text-slate-950 shadow-md shadow-cyan-500/30' : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'}`}
                >Solo Hombres</button>
                <button 
                  onClick={() => setConfig({...config, mode: 'women_only'})}
                  className={`p-3 rounded-xl text-sm font-black border transition-colors ${config.mode === 'women_only' ? 'bg-pink-600 border-pink-500 text-white shadow-md shadow-pink-600/30' : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'}`}
                >Solo Mujeres</button>
                <button 
                  onClick={() => setConfig({...config, mode: 'separated_gender'})}
                  className={`p-3 rounded-xl text-sm font-black border transition-colors col-span-2 ${config.mode === 'separated_gender' ? 'bg-purple-600 border-purple-500 text-white shadow-md shadow-purple-600/30' : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'}`}
                >Separar Hombres de Mujeres</button>
              </div>
            </div>

          </div>

          <div className="alert bg-gradient-to-r from-[#140e06] to-[#0a1017] border border-amber-500/40 p-4 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-300 shadow-md">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 flex-shrink-0 mt-0.5 text-amber-400" />
              <div className="text-sm font-medium leading-snug">
                <p>
                  Participan: <b className="text-white font-black">{activeStudents.length} estudiantes presentes</b>
                  {course.students.length > activeStudents.length && (
                    <span className="text-amber-400/80 font-bold"> (de {course.students.length} en total)</span>
                  )}
                </p>
                {course.students.length > activeStudents.length ? (
                  <p className="text-xs text-amber-300/90 mt-0.5">
                    Hay {course.students.length - activeStudents.length} estudiantes apagados de la clase anterior.
                  </p>
                ) : (
                  <p className="text-xs text-slate-400 mt-0.5">
                    Asegúrate de desactivar ausentes antes del sorteo si alguno faltó hoy.
                  </p>
                )}
              </div>
            </div>

            {course.students.length > activeStudents.length && (
              <button 
                type="button"
                onClick={() => {
                  setAllStudentsActive(courseId, true);
                  showToast('✅ ¡Todos los estudiantes reactivados!');
                }}
                className="flex items-center gap-2 text-xs font-black bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-3.5 py-2 rounded-2xl transition-all active:scale-95 flex-shrink-0 cursor-pointer shadow-md shadow-emerald-500/30 neon-glow-green-sm self-end sm:self-auto"
                title="Reactivar todos los estudiantes para este sorteo"
              >
                <span className="w-7 h-3.5 rounded-full bg-slate-950/40 flex items-center relative box-border">
                  <span className="w-2.5 h-2.5 bg-white rounded-full transition-all absolute left-0.5" />
                </span>
                <span>Reactivar todos</span>
              </button>
            )}
          </div>

          <button 
            onClick={generate}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-3xl py-5 text-xl sm:text-2xl font-black shadow-xl shadow-emerald-500/30 neon-glow-green active:scale-95 transition-all tracking-wider cursor-pointer"
          >
            !CREAR GRUPOS!
          </button>

        </div>
      ) : (
        <div className="flex-1 flex flex-col p-4">
          {/* Toast Notification */}
          {toastMessage && (
            <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 border border-slate-700 text-white px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs sm:text-sm font-bold animate-in fade-in slide-in-from-top-4 backdrop-blur-md max-w-sm w-full mx-auto justify-center">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>{toastMessage}</span>
            </div>
          )}

          {/* BARRA DE ACCIÓN */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4 mt-2">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-black text-white">Resultado Oficial</h2>
                {isSaved && (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-950/70 border border-emerald-800/60 text-emerald-400 text-xs font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Guardado
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                {result.length} grupos • {result.reduce((acc, g) => acc + g.length, 0)} estudiantes asignados
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Compartir por WhatsApp / Portapapeles */}
              <button
                onClick={shareGroups}
                title="Compartir o copiar grupos para WhatsApp"
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2.5 rounded-2xl text-xs font-black flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
              >
                <Share2 className="w-4 h-4" />
                <span className="hidden sm:inline">WhatsApp</span>
              </button>

              {(!isSaved || isTeacherUnlocked) && (
                <button
                  onClick={assignRandomNamesAll}
                  title="Asignar nombres deportivos al azar a todos los grupos"
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-3 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wide flex items-center gap-1.5 shadow-md shadow-amber-500/25 active:scale-95 transition-all border border-amber-300"
                >
                  <Dices className="w-4 h-4 text-slate-950" />
                  <span className="hidden sm:inline">Nombres</span>
                </button>
              )}

              <button 
                onClick={generate} 
                title="Regenerar grupos"
                className="bg-slate-900 border border-slate-800 p-2.5 rounded-2xl text-slate-300 hover:text-emerald-400 hover:border-emerald-500/40 shadow-sm transition-all active:scale-95"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Indicador discreto si hay un alumno seleccionado para mover */}
          {selectedStudent && isTeacherUnlocked && (
            <div className="bg-slate-900/90 border border-amber-500/50 rounded-2xl px-4 py-2.5 mb-4 flex items-center justify-between text-xs text-slate-200 animate-in fade-in shadow-md">
              <span className="truncate">
                Seleccionado: <b className="text-amber-300">{result[selectedStudent.groupIdx]?.[selectedStudent.sIdx]?.name}</b> — toca otro para reubicar
              </span>
              <button 
                onClick={() => setSelectedStudent(null)}
                className="text-[11px] font-bold text-slate-400 hover:text-white ml-2 underline flex-shrink-0"
              >
                Cancelar
              </button>
            </div>
          )}

          {/* BUSCADOR DE ALUMNO (Facilita que cada alumno encuentre su grupo sin tocar la pantalla) */}
          <div className="mb-4 relative">
            <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-400 pointer-events-none" />
            <input 
              type="text"
              value={searchStudentTerm}
              onChange={e => setSearchStudentTerm(e.target.value)}
              placeholder="¿En qué equipo estoy? Escribe tu nombre para encontrarlo rápido..."
              className="w-full bg-[#0b101b] border border-slate-800 rounded-2xl pl-11 pr-10 py-3 text-xs sm:text-sm font-bold text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-colors"
            />
            {searchStudentTerm && (
              <button 
                onClick={() => setSearchStudentTerm('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                title="Limpiar búsqueda"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* LISTA DE GRUPOS EN GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 pb-36 overflow-y-auto">
            {result.map((group, groupIdx) => {
              const currentGroupName = groupNames[groupIdx] || `Grupo ${groupIdx + 1}`;
              const isEditing = editingGroupIdx === groupIdx;
              const normalizedSearch = searchStudentTerm.trim().toLowerCase();
              const hasMatchingStudent = normalizedSearch.length > 0 && group.some(s => s.name.toLowerCase().includes(normalizedSearch));

              return (
                <div 
                  key={groupIdx} 
                  className={cn(
                    "bg-[#0b101b] border rounded-3xl p-4 shadow-lg flex flex-col transition-all",
                    hasMatchingStudent 
                      ? "border-amber-400 ring-2 ring-amber-400/50 bg-[#120f09] shadow-xl shadow-amber-500/20 scale-[1.01]" 
                      : "border-slate-800/90 hover:border-amber-400/40"
                  )}
                >
                  {/* Cabecera del Grupo */}
                  <div className="border-b border-slate-800/80 pb-3 mb-3 px-1 min-h-[38px] flex items-center">
                    {isEditing ? (
                      <div className="flex items-center gap-1.5 w-full" onClick={e => e.stopPropagation()}>
                        <input 
                          type="text" 
                          autoFocus
                          value={editingNameValue}
                          onChange={e => setEditingNameValue(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') saveEditingName(groupIdx);
                            if (e.key === 'Escape') setEditingGroupIdx(null);
                          }}
                          onBlur={() => saveEditingName(groupIdx)}
                          placeholder={`Grupo ${groupIdx + 1}`}
                          className="w-full bg-slate-950 border border-emerald-400 rounded-xl px-2.5 py-1 text-xs font-bold text-white outline-none focus:ring-1 focus:ring-emerald-400 placeholder:text-slate-600"
                        />
                        <button
                          type="button"
                          onMouseDown={e => { e.preventDefault(); saveEditingName(groupIdx); }}
                          className="p-1.5 rounded-lg bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition-colors flex-shrink-0 font-black"
                          title="Guardar nombre"
                        >
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-2 w-full group">
                        <div 
                          onClick={() => {
                            if (!isSaved || isTeacherUnlocked) startEditingName(groupIdx, currentGroupName);
                          }}
                          className={cn(
                            "flex items-center gap-2 min-w-0 flex-1 py-1",
                            (!isSaved || isTeacherUnlocked) ? "cursor-pointer hover:opacity-90" : "cursor-default"
                          )}
                          title={(!isSaved || isTeacherUnlocked) ? "Clic para renombrar este grupo" : currentGroupName}
                        >
                          <span className={cn(
                            "text-base sm:text-lg font-black break-words leading-tight tracking-wide",
                            hasMatchingStudent ? "text-amber-300" : "text-white"
                          )}>
                            {currentGroupName}
                          </span>
                          {(!isSaved || isTeacherUnlocked) && (
                            <Pencil className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400 transition-colors flex-shrink-0 opacity-50 group-hover:opacity-100" />
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {(!isSaved || isTeacherUnlocked) && (
                            <button
                              type="button"
                              onClick={(e) => assignRandomNameSingle(groupIdx, e)}
                              className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-xl transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center"
                              title="Nombre al azar para este grupo"
                            >
                              <Dices className="w-4 h-4" />
                            </button>
                          )}
                          <span className={cn(
                            "text-xs font-black px-2.5 py-1 rounded-full border",
                            hasMatchingStudent 
                              ? "bg-amber-400/20 text-amber-300 border-amber-400/50" 
                              : "bg-slate-800/80 text-emerald-400 border-emerald-500/30"
                          )}>
                            {group.length}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Lista de Jugadores / Estudiantes del Grupo con Nombres Completos */}
                  <div className="space-y-2.5 flex-1">
                    {group.map((student, sIdx) => {
                       const isSelected = selectedStudent?.groupIdx === groupIdx && selectedStudent?.sIdx === sIdx;
                       const isStudentMatch = normalizedSearch.length > 0 && student.name.toLowerCase().includes(normalizedSearch);

                       return (
                         <div 
                           key={student.id} 
                           onClick={() => handleStudentClick(groupIdx, sIdx)}
                           className={cn(
                             "py-3 px-3.5 rounded-2xl text-sm sm:text-base font-bold flex items-start sm:items-center gap-3 transition-all select-none border min-h-[48px]",
                             isStudentMatch 
                               ? "bg-amber-400 text-slate-950 font-black border-amber-300 shadow-lg shadow-amber-400/30 ring-2 ring-amber-300 scale-[1.02] cursor-default" 
                               : isSelected
                                 ? "bg-amber-500 text-slate-950 border-amber-400 shadow-md ring-2 ring-amber-300 cursor-pointer font-black"
                                 : isTeacherUnlocked
                                   ? "bg-slate-850/90 text-slate-200 border-slate-750 hover:border-amber-400/40 cursor-pointer"
                                   : "bg-slate-850/90 text-slate-200 border-slate-800/80 cursor-default"
                           )}
                           title={student.name}
                         >
                           <span className={cn(
                             "w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-lg text-xs relative font-black mt-0.5 sm:mt-0",
                             isStudentMatch
                               ? "bg-slate-950 text-amber-300"
                               : isSelected 
                                 ? "bg-slate-950 text-amber-400" 
                                 : student.gender === 'M' 
                                   ? "bg-blue-950 text-blue-400 border border-blue-800/60" 
                                   : student.gender === 'F' 
                                     ? "bg-pink-950 text-pink-400 border border-pink-800/60" 
                                     : "bg-slate-700 text-slate-300"
                           )}>
                             {student.gender}
                           </span>
                           {/* Nombre Completo visible sin recortar */}
                           <span className="break-words leading-snug flex-1 select-text text-left">
                             {student.name}
                           </span>
                         </div>
                       );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* BARRA INFERIOR / ACCIONES */}
          <div className="fixed bottom-4 pb-safe left-0 right-0 max-w-lg mx-auto px-4 sm:px-6 z-20">
             <div className="grid grid-cols-2 gap-3">
               <button 
                 onClick={save} 
                 disabled={isSaved}
                 className={cn(
                   "border p-4 sm:p-5 rounded-2xl sm:rounded-3xl font-black text-base flex items-center justify-center gap-2 shadow-xl transition-all min-h-[50px] cursor-pointer",
                   isSaved
                     ? "bg-[#07130b] text-emerald-400 border-emerald-500/40 cursor-default shadow-[0_0_15px_rgba(16,233,86,0.15)]"
                     : "bg-slate-900 hover:bg-slate-800 text-white border-slate-700 active:scale-95"
                 )}
               >
                 {isSaved ? (
                   <>
                     <CheckCircle2 className="w-5 h-5 text-emerald-400" /> Guardado
                   </>
                 ) : (
                   <>
                     <Save className="w-5 h-5 text-emerald-400" /> Guardar
                   </>
                 )}
               </button>
               <button
                 onClick={() => {
                   if (!result) return;
                   const teams = result.map((g, i) => ({
                     name: groupNames[i] || `Grupo ${i + 1}`,
                     memberIds: g.map(s => s.id)
                   }));
                   onNavigate('tournament', courseId, teams);
                 }}
                 className="bg-amber-500 hover:bg-amber-400 text-slate-950 p-4 sm:p-5 rounded-2xl sm:rounded-3xl font-black text-base flex items-center justify-center gap-2 shadow-xl shadow-amber-500/25 active:scale-95 transition-all min-h-[50px] cursor-pointer"
               >
                 <Trophy className="w-5 h-5 fill-slate-950" /> Iniciar Torneo
               </button>
             </div>
          </div>

        </div>
      )}
    </div>
  );
}
