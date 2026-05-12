import React, { useState, useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import { ChevronLeft, RefreshCw, Save, Replace, Shield, Copy, AlertCircle, LayoutGrid, Users, Lock, Unlock, Sparkles, Star, Trophy } from 'lucide-react';
import { View } from '../App';
import { Student, GroupConfig, GroupResult } from '../types';
import { cn } from '../lib/utils';
import { v4 as uuidv4 } from 'uuid';

interface GroupGeneratorProps {
  courseId: string;
  onNavigate: (view: View, courseId?: string, extra?: any) => void;
}

export function GroupGenerator({ courseId, onNavigate }: GroupGeneratorProps) {
  const { courses, saveHistory, histories } = useAppStore();
  const course = courses.find(c => c.id === courseId);
  const courseHistories = useMemo(() => histories.filter(h => h.courseId === courseId).sort((a,b) => b.date - a.date), [histories, courseId]);
  const activeStudents = useMemo(() => course?.students.filter(s => s.isActive) || [], [course]);
  const specialCount = useMemo(() => activeStudents.filter(s => s.reservedGroup && s.reservedGroup > 0).length, [activeStudents]);

  const [isTeacherMode, setIsTeacherMode] = useState(false);
  const [config, setConfig] = useState<GroupConfig>({
    mode: 'random',
    type: 'by_count',
    value: 2
  });

  const [result, setResult] = useState<Student[][] | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<{groupIdx: number, sIdx: number} | null>(null);
  const [isLocked, setIsLocked] = useState(false);

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

    setResult(groups.filter(g => g.length > 0));
    setSelectedStudent(null);
    setIsLocked(false);
  };

  const handleStudentClick = (groupIdx: number, sIdx: number) => {
    if (isLocked) return;
    
    if (!selectedStudent) {
      setSelectedStudent({ groupIdx, sIdx });
    } else {
      // Swap
      if (selectedStudent.groupIdx === groupIdx && selectedStudent.sIdx === sIdx) {
        setSelectedStudent(null); // toggle off
        return;
      }

      const newResult = [...result!].map(arr => [...arr]);
      const temp = newResult[selectedStudent.groupIdx][selectedStudent.sIdx];
      newResult[selectedStudent.groupIdx][selectedStudent.sIdx] = newResult[groupIdx][sIdx];
      newResult[groupIdx][sIdx] = temp;
      
      setResult(newResult);
      setSelectedStudent(null);
    }
  };

  const save = () => {
    if (!result) return;
    saveHistory({
      id: uuidv4(),
      courseId,
      date: Date.now(),
      config,
      groups: result
    });
    alert('Grupos guardados en el historial');
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50 min-h-screen">
      <header className="bg-white px-4 py-4 flex items-center justify-between border-b border-slate-100 sticky top-0 z-10">
        <button onClick={() => onNavigate('home')} className="p-2 -ml-2 text-slate-500 hover:text-slate-900 transition-colors">
          <ChevronLeft className="w-7 h-7" />
        </button>
        <div className="flex-1 px-4 text-center">
          <h1 className="text-xl font-bold text-slate-900 truncate">Generador</h1>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{course.name}</p>
        </div>
        <button 
          onClick={() => setIsTeacherMode(!isTeacherMode)} 
          className={cn(
            "p-2 rounded-xl transition-all active:scale-95",
            isTeacherMode ? "bg-blue-600 text-white shadow-md shadow-blue-200" : "bg-slate-100 text-slate-400 hover:text-slate-600"
          )}
          title="Modo Reservado"
        >
          <Shield className="w-6 h-6" />
        </button>
      </header>

      {!result ? (
        <div className="p-6 space-y-8 pb-20">
          
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-4">¿Cómo dividir?</label>
              <div className="flex bg-slate-100 p-1 rounded-2xl mb-4">
                <button 
                  onClick={() => setConfig({...config, type: 'by_count'})}
                  className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${config.type === 'by_count' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
                >
                  <LayoutGrid className="w-4 h-4 inline-block mr-2" /> Cantidad
                </button>
                <button 
                  onClick={() => setConfig({...config, type: 'by_size'})}
                  className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${config.type === 'by_size' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
                >
                  <Users className="w-4 h-4 inline-block mr-2" /> Por Grupo
                </button>
              </div>

              <div className="flex items-center gap-4">
                <button onClick={() => setConfig({...config, value: Math.max(1, config.value - 1)})} className="w-14 h-14 bg-slate-100 rounded-2xl text-2xl font-bold text-slate-600 active:bg-slate-200">-</button>
                <div className="flex-1 text-center font-black text-5xl text-slate-900">{config.value}</div>
                <button onClick={() => setConfig({...config, value: config.value + 1})} className="w-14 h-14 bg-slate-100 rounded-2xl text-2xl font-bold text-slate-600 active:bg-slate-200">+</button>
              </div>
              <div className="text-center mt-2 text-sm text-slate-500 font-medium">
                {config.type === 'by_count' ? 'Grupos en total' : 'Estudiantes por grupo'}
              </div>
            </div>
            
            <hr className="border-slate-100" />

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-4">Modo de distribución</label>
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => setConfig({...config, mode: 'random'})}
                  className={`p-3 rounded-xl text-sm font-bold border transition-colors ${config.mode === 'random' ? 'bg-slate-800 border-slate-900 text-white shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >Azar</button>
                <button 
                  onClick={() => setConfig({...config, mode: 'balanced_mixed'})}
                  className={`p-3 rounded-xl text-sm font-bold border transition-colors ${config.mode === 'balanced_mixed' ? 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >Equitativo</button>
                <button 
                  onClick={() => setConfig({...config, mode: 'men_only'})}
                  className={`p-3 rounded-xl text-sm font-bold border transition-colors ${config.mode === 'men_only' ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >Solo Hombres</button>
                <button 
                  onClick={() => setConfig({...config, mode: 'women_only'})}
                  className={`p-3 rounded-xl text-sm font-bold border transition-colors ${config.mode === 'women_only' ? 'bg-pink-50 border-pink-200 text-pink-700 shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >Solo Mujeres</button>
                <button 
                  onClick={() => setConfig({...config, mode: 'separated_gender'})}
                  className={`p-3 rounded-xl text-sm font-bold border transition-colors col-span-2 ${config.mode === 'separated_gender' ? 'bg-purple-50 border-purple-200 text-purple-700 shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >Separar Hombres de Mujeres</button>
              </div>
            </div>

          </div>

          <div className="alert bg-amber-50 border border-amber-200 p-4 rounded-3xl flex items-start gap-3 text-amber-700">
            <AlertCircle className="w-6 h-6 flex-shrink-0 mt-0.5 opacity-60" />
            <p className="text-sm font-medium leading-snug text-balance">
              Participan: <b>{activeStudents.length} estudiantes presentes</b><br/>
              Asegúrate de haber desactivado a los ausentes en la pantalla anterior.
            </p>
          </div>

          {isTeacherMode && specialCount > 0 && (
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-3xl flex items-start gap-3 text-blue-700 animate-in fade-in slide-in-from-bottom-2">
              <Sparkles className="w-6 h-6 flex-shrink-0 mt-0.5 opacity-60" />
              <div className="text-sm font-medium leading-snug">
                <p><b>Configuración Avanzada:</b> {specialCount} alumnos marcados serán repartidos equitativamente.</p>
                <p className="mt-1 opacity-80 border-t border-blue-200 pt-1">Optimizando distribución según historial de clases anteriores.</p>
                <div className="flex gap-3 pt-2 text-[10px] uppercase font-black opacity-70">
                  <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-rose-500" /> C1</span>
                  <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-blue-500" /> C2</span>
                  <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> C3</span>
                  <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-amber-500" /> C4</span>
                </div>
              </div>
            </div>
          )}

          <button 
            onClick={generate}
            className="w-full bg-slate-900 text-white rounded-3xl py-5 text-xl font-black shadow-lg shadow-slate-900/20 active:scale-95 transition-all"
          >
            !CREAR GRUPOS!
          </button>

        </div>
      ) : (
        <div className="flex-1 flex flex-col p-4">
          <div className="flex items-center justify-between mb-4 mt-2">
            <h2 className="text-2xl font-black text-slate-900">Resultado</h2>
            <div className="flex gap-2">
              <button 
                onClick={generate} 
                title="Regenerar"
                className="bg-white border border-slate-200 p-3 rounded-2xl text-slate-600 hover:text-blue-600 shadow-sm transition-colors active:scale-95"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
              <button 
                onClick={() => setIsLocked(!isLocked)} 
                title={isLocked ? "Desbloquear" : "Bloquear cambios"}
                className={cn(
                  "p-3 rounded-2xl transition-all shadow-sm border active:scale-95",
                  isLocked ? "bg-emerald-500 text-white border-emerald-500" : "bg-white border-slate-200 text-slate-600"
                )}
              >
                {isLocked ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {selectedStudent && (
             <div className="bg-blue-600 text-white p-3 rounded-2xl text-center mb-4 text-sm font-bold inline-flex items-center justify-center gap-2 animate-in fade-in slide-in-from-top-2 w-full mx-auto container shadow-md shadow-blue-600/20">
               <Replace className="w-4 h-4" /> Selecciona a otro para intercambiar
             </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 pb-32 overflow-y-auto">
            {result.map((group, groupIdx) => (
              <div key={groupIdx} className={`bg-white border rounded-3xl p-3 shadow-sm flex flex-col ${isLocked ? 'border-slate-200' : 'border-slate-200'}`}>
                <div className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 mb-2 px-1">
                  Grupo {groupIdx + 1} <span className="float-right bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{group.length}</span>
                </div>
                <div className="space-y-1.5 flex-1">
                  {group.map((student, sIdx) => {
                     const isSelected = selectedStudent?.groupIdx === groupIdx && selectedStudent?.sIdx === sIdx;
                     return (
                       <div 
                         key={student.id} 
                         onClick={() => handleStudentClick(groupIdx, sIdx)}
                         className={`py-2 px-3 rounded-xl text-sm font-bold flex items-center gap-2 transition-all cursor-pointer select-none
                           ${isSelected ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'}
                           ${isLocked ? 'pointer-events-none' : ''}`}
                       >
                         <span className={`w-5 h-5 flex items-center justify-center rounded-md text-[10px] relative
                            ${isSelected ? 'bg-white/20' : student.gender === 'M' ? 'bg-blue-200/50 text-blue-700' : student.gender === 'F' ? 'bg-pink-200/50 text-pink-700' : 'bg-slate-200 text-slate-600'}`}>
                           {student.gender}
                           {isTeacherMode && student.reservedGroup && student.reservedGroup > 0 && (
                             <div className={cn(
                               "absolute -top-1 -right-1 w-2 h-2 rounded-full border border-white animate-in zoom-in",
                               student.reservedGroup === 1 && "bg-rose-500",
                               student.reservedGroup === 2 && "bg-blue-500",
                               student.reservedGroup === 3 && "bg-emerald-500",
                               student.reservedGroup === 4 && "bg-amber-500"
                             )} />
                           )}
                         </span>
                         <span className="truncate">{student.name}</span>
                       </div>
                     )
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Fab To Save Area */}
          <div className="fixed bottom-6 left-0 right-0 max-w-lg mx-auto px-6 z-20">
             <div className="grid grid-cols-2 gap-3">
               <button onClick={save} className="bg-slate-900 text-white p-5 rounded-3xl font-black text-base flex items-center justify-center gap-2 shadow-xl active:scale-95 transition-transform">
                 <Save className="w-5 h-5" /> Guardar
               </button>
               <button
                 onClick={() => {
                   if (!result) return;
                   const teams = result.map((g, i) => ({
                     name: `Equipo ${i + 1}`,
                     memberIds: g.map(s => s.id)
                   }));
                   onNavigate('tournament', courseId, teams);
                 }}
                 className="bg-amber-500 text-white p-5 rounded-3xl font-black text-base flex items-center justify-center gap-2 shadow-xl active:scale-95 transition-transform"
               >
                 <Trophy className="w-5 h-5 fill-white" /> Iniciar Torneo
               </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
