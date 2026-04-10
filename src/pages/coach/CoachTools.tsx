import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { BookOpen, Timer, Activity, Video, FileText, ChevronRight, Plus, Search, Play, Pause, RotateCcw, ExternalLink, Trash2, Zap, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function CoachTools() {
  const [activeTool, setActiveTool] = useState<string | null>(null);

  const tools = [
    { id: 'banco', icon: BookOpen, title: 'Banco de Ejercicios', desc: 'Crea y gestiona ejercicios', color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { id: 'timer', icon: Timer, title: 'Tabata Timer', desc: 'Cronómetro de intervalos', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { id: 'zonas', icon: Activity, title: 'Zonas Cardíacas', desc: 'Calculadora de FC Max', color: 'text-red-500', bg: 'bg-red-500/10' },
    { id: 'reaccion', icon: Zap, title: 'Reacción Visual', desc: 'Estímulos cognitivos', color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
    { id: 'video', icon: Video, title: 'Análisis de Video', desc: 'Links a análisis externos', color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { id: 'informes', icon: FileText, title: 'Informes', desc: 'Historial y reportes', color: 'text-amber-500', bg: 'bg-amber-500/10' },
  ];

  if (activeTool === 'banco') {
    return <ExerciseBank onBack={() => setActiveTool(null)} />;
  }
  if (activeTool === 'timer') return <TabataTimer onBack={() => setActiveTool(null)} />;
  if (activeTool === 'zonas') return <HeartRateZones onBack={() => setActiveTool(null)} />;
  if (activeTool === 'reaccion') return <ReactionTraining onBack={() => setActiveTool(null)} />;
  if (activeTool === 'video') return <VideoAnalysis onBack={() => setActiveTool(null)} />;
  if (activeTool === 'informes') return <Reports onBack={() => setActiveTool(null)} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Herramientas</h1>
        <p className="text-neutral-400">Utilidades para tu entrenamiento</p>
      </div>

      <div className="grid gap-3">
        {tools.map(tool => (
          <button
            key={tool.id}
            onClick={() => setActiveTool(tool.id)}
            className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex items-center gap-4 hover:border-neutral-700 transition-colors text-left active:scale-[0.98]"
          >
            <div className={cn("w-12 h-12 rounded-full flex items-center justify-center shrink-0", tool.bg, tool.color)}>
              <tool.icon className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-white font-medium">{tool.title}</h3>
              <p className="text-sm text-neutral-400 truncate">{tool.desc}</p>
            </div>
            <ChevronRight className="w-5 h-5 text-neutral-600" />
          </button>
        ))}
      </div>
    </div>
  );
}

function ExerciseBank({ onBack }: { onBack: () => void }) {
  const { exercises, addExercise, user } = useAppStore();
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newEx, setNewEx] = useState({ name: '', description: '', type: 'Físico' as any, level: 'Principiante' as any, durationOrReps: '' });

  const filtered = exercises.filter(e => e.name.toLowerCase().includes(search.toLowerCase()));

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEx.name) return;
    addExercise({
      coachId: user?.uid || 'unknown',
      ...newEx
    });
    setShowAdd(false);
    setNewEx({ name: '', description: '', type: 'Físico', level: 'Principiante', durationOrReps: '' });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 -ml-2 text-neutral-400 hover:text-white">
          <ChevronRight className="w-6 h-6 rotate-180" />
        </button>
        <h1 className="text-2xl font-bold text-white">Banco de Ejercicios</h1>
        <div className="flex-1" />
        <button onClick={() => setShowAdd(true)} className="bg-emerald-600 hover:bg-emerald-500 text-white w-10 h-10 rounded-full flex items-center justify-center transition-colors">
          <Plus className="w-6 h-6" />
        </button>
      </div>

      {showAdd && (
        <div className="bg-neutral-900 border border-emerald-500/30 rounded-2xl p-5">
          <h2 className="text-lg font-medium text-white mb-4">Nuevo Ejercicio</h2>
          <form onSubmit={handleAdd} className="space-y-4">
            <input 
              type="text" 
              value={newEx.name}
              onChange={e => setNewEx({...newEx, name: e.target.value})}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
              placeholder="Nombre del ejercicio"
              required
            />
            <textarea 
              value={newEx.description}
              onChange={e => setNewEx({...newEx, description: e.target.value})}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
              placeholder="Descripción"
              required
            />
            <div className="grid grid-cols-2 gap-3">
              <select 
                value={newEx.type}
                onChange={e => setNewEx({...newEx, type: e.target.value as any})}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
              >
                <option>Físico</option>
                <option>Técnico</option>
                <option>Táctico</option>
                <option>Mixto</option>
              </select>
              <select 
                value={newEx.level}
                onChange={e => setNewEx({...newEx, level: e.target.value as any})}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
              >
                <option>Principiante</option>
                <option>Intermedio</option>
                <option>Avanzado</option>
              </select>
            </div>
            <input 
              type="text" 
              value={newEx.durationOrReps}
              onChange={e => setNewEx({...newEx, durationOrReps: e.target.value})}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
              placeholder="Duración o Repeticiones (ej. 10 min, 3x15)"
              required
            />
            <div className="flex gap-3 pt-2">
              <button 
                type="button"
                onClick={() => setShowAdd(false)}
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

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
        <input 
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar ejercicio..."
          className="w-full bg-neutral-900 border border-neutral-800 rounded-2xl pl-12 pr-4 py-4 text-white focus:outline-none focus:border-emerald-500 transition-colors"
        />
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-10 text-neutral-500">
            No hay ejercicios. Crea uno nuevo.
          </div>
        ) : (
          filtered.map(ex => (
            <div key={ex.id} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-white font-medium">{ex.name}</h3>
                <span className="text-xs font-medium px-2 py-1 rounded-md bg-neutral-800 text-neutral-300">
                  {ex.type}
                </span>
              </div>
              <p className="text-sm text-neutral-400 mb-3">{ex.description}</p>
              <div className="flex items-center gap-3 text-xs text-neutral-500">
                <span className="flex items-center gap-1">
                  <Activity className="w-3.5 h-3.5" /> {ex.level}
                </span>
                <span className="flex items-center gap-1">
                  <Timer className="w-3.5 h-3.5" /> {ex.durationOrReps}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function TabataTimer({ onBack }: { onBack: () => void }) {
  const [workTime, setWorkTime] = useState(20);
  const [restTime, setRestTime] = useState(10);
  const [rounds, setRounds] = useState(8);

  const [timeLeft, setTimeLeft] = useState(workTime);
  const [currentRound, setCurrentRound] = useState(1);
  const [isWork, setIsWork] = useState(true);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    let interval: any = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft(t => t - 1), 1000);
    } else if (isActive && timeLeft === 0) {
      if (isWork) {
        setIsWork(false);
        setTimeLeft(restTime);
      } else {
        if (currentRound < rounds) {
          setCurrentRound(r => r + 1);
          setIsWork(true);
          setTimeLeft(workTime);
        } else {
          setIsActive(false);
        }
      }
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft, isWork, currentRound, rounds, workTime, restTime]);

  const toggle = () => setIsActive(!isActive);
  const reset = () => {
    setIsActive(false);
    setIsWork(true);
    setCurrentRound(1);
    setTimeLeft(workTime);
  };

  useEffect(() => {
    if (!isActive && isWork) setTimeLeft(workTime);
  }, [workTime, isActive, isWork]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 -ml-2 text-neutral-400 hover:text-white">
          <ChevronRight className="w-6 h-6 rotate-180" />
        </button>
        <h1 className="text-2xl font-bold text-white">Tabata Timer</h1>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8 text-center">
        <h2 className={cn("text-2xl font-bold mb-2", isWork ? "text-emerald-500" : "text-blue-500")}>
          {isActive ? (isWork ? "¡TRABAJO!" : "DESCANSO") : "PREPARADO"}
        </h2>
        <div className="text-7xl font-mono font-bold text-white mb-6">
          {Math.floor(timeLeft / 60).toString().padStart(2, '0')}:{(timeLeft % 60).toString().padStart(2, '0')}
        </div>
        <p className="text-neutral-400 font-medium mb-8">Ronda {currentRound} de {rounds}</p>

        <div className="flex justify-center gap-4">
          <button onClick={reset} className="w-14 h-14 rounded-full bg-neutral-800 flex items-center justify-center text-white hover:bg-neutral-700 transition-colors">
            <RotateCcw className="w-6 h-6" />
          </button>
          <button onClick={toggle} className={cn("w-14 h-14 rounded-full flex items-center justify-center text-white transition-colors", isActive ? "bg-red-500 hover:bg-red-400" : "bg-emerald-500 hover:bg-emerald-400")}>
            {isActive ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 text-center">
          <label className="block text-xs text-neutral-500 mb-2">Trabajo (s)</label>
          <input type="number" value={workTime} onChange={e => setWorkTime(Number(e.target.value))} className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-2 text-center text-white" disabled={isActive} />
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 text-center">
          <label className="block text-xs text-neutral-500 mb-2">Descanso (s)</label>
          <input type="number" value={restTime} onChange={e => setRestTime(Number(e.target.value))} className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-2 text-center text-white" disabled={isActive} />
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 text-center">
          <label className="block text-xs text-neutral-500 mb-2">Rondas</label>
          <input type="number" value={rounds} onChange={e => setRounds(Number(e.target.value))} className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-2 text-center text-white" disabled={isActive} />
        </div>
      </div>
    </div>
  );
}

function HeartRateZones({ onBack }: { onBack: () => void }) {
  const [age, setAge] = useState(25);
  const maxHr = 220 - age;

  const zones = [
    { name: 'Z5: Máximo', range: `${Math.round(maxHr * 0.9)} - ${maxHr}`, color: 'bg-red-500', desc: '90-100% - Esfuerzo máximo, muy corta duración.' },
    { name: 'Z4: Umbral', range: `${Math.round(maxHr * 0.8)} - ${Math.round(maxHr * 0.9)}`, color: 'bg-orange-500', desc: '80-90% - Mejora la capacidad anaeróbica.' },
    { name: 'Z3: Aeróbico', range: `${Math.round(maxHr * 0.7)} - ${Math.round(maxHr * 0.8)}`, color: 'bg-emerald-500', desc: '70-80% - Mejora la resistencia cardiovascular.' },
    { name: 'Z2: Quema Grasa', range: `${Math.round(maxHr * 0.6)} - ${Math.round(maxHr * 0.7)}`, color: 'bg-blue-500', desc: '60-70% - Ritmo cómodo, metabolismo de grasas.' },
    { name: 'Z1: Calentamiento', range: `${Math.round(maxHr * 0.5)} - ${Math.round(maxHr * 0.6)}`, color: 'bg-neutral-500', desc: '50-60% - Recuperación y calentamiento.' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 -ml-2 text-neutral-400 hover:text-white">
          <ChevronRight className="w-6 h-6 rotate-180" />
        </button>
        <h1 className="text-2xl font-bold text-white">Zonas Cardíacas</h1>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
        <label className="block text-sm text-neutral-400 mb-2">Edad del atleta</label>
        <div className="flex gap-4 items-center">
          <input 
            type="number" 
            value={age}
            onChange={e => setAge(Number(e.target.value))}
            className="w-24 bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white text-center focus:outline-none focus:border-emerald-500"
          />
          <div>
            <div className="text-sm text-neutral-500">FC Máxima Estimada</div>
            <div className="text-2xl font-bold text-white">{maxHr} <span className="text-sm font-normal text-neutral-400">lpm</span></div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {zones.map(z => (
          <div key={z.name} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex items-center gap-4">
            <div className={cn("w-2 h-12 rounded-full", z.color)} />
            <div className="flex-1">
              <div className="flex justify-between items-center mb-1">
                <h3 className="text-white font-medium">{z.name}</h3>
                <span className="text-white font-bold">{z.range} <span className="text-xs text-neutral-500 font-normal">lpm</span></span>
              </div>
              <p className="text-xs text-neutral-400">{z.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function VideoAnalysis({ onBack }: { onBack: () => void }) {
  const [links, setLinks] = useState<{id: number, title: string, url: string}[]>([
    { id: 1, title: 'Análisis Táctico Final 2023', url: 'https://youtube.com' }
  ]);
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  const addLink = (e: React.FormEvent) => {
    e.preventDefault();
    if(newTitle && newUrl) {
      setLinks([...links, {id: Date.now(), title: newTitle, url: newUrl}]);
      setNewTitle('');
      setNewUrl('');
      setShowAdd(false);
    }
  };

  const removeLink = (id: number) => {
    setLinks(links.filter(l => l.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 -ml-2 text-neutral-400 hover:text-white">
          <ChevronRight className="w-6 h-6 rotate-180" />
        </button>
        <h1 className="text-2xl font-bold text-white">Análisis de Video</h1>
        <div className="flex-1" />
        <button onClick={() => setShowAdd(true)} className="bg-emerald-600 hover:bg-emerald-500 text-white w-10 h-10 rounded-full flex items-center justify-center transition-colors">
          <Plus className="w-6 h-6" />
        </button>
      </div>

      <div className="bg-purple-500/10 border border-purple-500/20 rounded-2xl p-4">
        <p className="text-sm text-purple-400">
          Guarda enlaces a videos de YouTube, Vimeo o Google Drive para analizar con tus atletas. No subimos videos para mantener la plataforma gratuita y rápida.
        </p>
      </div>

      {showAdd && (
        <div className="bg-neutral-900 border border-purple-500/30 rounded-2xl p-5">
          <h2 className="text-lg font-medium text-white mb-4">Nuevo Enlace</h2>
          <form onSubmit={addLink} className="space-y-4">
            <input 
              type="text" 
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500"
              placeholder="Título del video"
              required
            />
            <input 
              type="url" 
              value={newUrl}
              onChange={e => setNewUrl(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500"
              placeholder="https://..."
              required
            />
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowAdd(false)} className="flex-1 py-3 px-4 rounded-xl font-medium text-neutral-400 hover:text-white bg-neutral-800 hover:bg-neutral-700 transition-colors">
                Cancelar
              </button>
              <button type="submit" className="flex-1 py-3 px-4 rounded-xl font-medium text-white bg-purple-600 hover:bg-purple-500 transition-colors">
                Guardar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-3">
        {links.length === 0 ? (
          <div className="text-center py-10 text-neutral-500">No hay videos guardados.</div>
        ) : (
          links.map(link => (
            <div key={link.id} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex items-center justify-between">
              <div className="flex-1 min-w-0 pr-4">
                <h3 className="text-white font-medium truncate">{link.title}</h3>
                <a href={link.url} target="_blank" rel="noreferrer" className="text-sm text-purple-400 hover:text-purple-300 truncate block mt-1 flex items-center gap-1">
                  <ExternalLink className="w-3 h-3" /> Abrir enlace
                </a>
              </div>
              <button onClick={() => removeLink(link.id)} className="p-2 text-neutral-500 hover:text-red-400 transition-colors">
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function Reports({ onBack }: { onBack: () => void }) {
  const { athletes, tournaments, challenges, exercises } = useAppStore();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 -ml-2 text-neutral-400 hover:text-white">
          <ChevronRight className="w-6 h-6 rotate-180" />
        </button>
        <h1 className="text-2xl font-bold text-white">Informes</h1>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 text-center">
          <div className="text-3xl font-bold text-white mb-1">{athletes.length}</div>
          <div className="text-sm text-neutral-400">Atletas Activos</div>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 text-center">
          <div className="text-3xl font-bold text-white mb-1">{tournaments.length}</div>
          <div className="text-sm text-neutral-400">Torneos</div>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 text-center">
          <div className="text-3xl font-bold text-white mb-1">{challenges.length}</div>
          <div className="text-sm text-neutral-400">Retos Creados</div>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 text-center">
          <div className="text-3xl font-bold text-white mb-1">{exercises.length}</div>
          <div className="text-sm text-neutral-400">Ejercicios</div>
        </div>
      </div>
    </div>
  );
}

function ReactionTraining({ onBack }: { onBack: () => void }) {
  const [mode, setMode] = useState<'colores' | 'flechas' | 'numeros' | 'mixto'>('colores');
  const [speed, setSpeed] = useState(2000);
  const [isActive, setIsActive] = useState(false);
  const [stimulus, setStimulus] = useState<{type: string, value: string} | null>(null);

  useEffect(() => {
    let interval: any;
    if (isActive) {
      const generate = () => {
        const types = mode === 'mixto' ? ['colores', 'flechas', 'numeros'] : [mode];
        const selectedType = types[Math.floor(Math.random() * types.length)];
        
        if (selectedType === 'colores') {
          const colors = ['bg-red-500', 'bg-blue-500', 'bg-emerald-500', 'bg-yellow-500', 'bg-purple-500', 'bg-orange-500'];
          setStimulus({ type: 'color', value: colors[Math.floor(Math.random() * colors.length)] });
        } else if (selectedType === 'flechas') {
          const arrows = ['up', 'down', 'left', 'right'];
          setStimulus({ type: 'arrow', value: arrows[Math.floor(Math.random() * arrows.length)] });
        } else {
          const numbers = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
          setStimulus({ type: 'number', value: numbers[Math.floor(Math.random() * numbers.length)] });
        }
      };
      
      generate();
      interval = setInterval(generate, speed);
    } else {
      setStimulus(null);
    }
    return () => clearInterval(interval);
  }, [isActive, mode, speed]);

  const renderStimulus = () => {
    if (!stimulus) return null;
    
    if (stimulus.type === 'color') {
      return <div className={cn("w-full h-full rounded-3xl transition-colors duration-200", stimulus.value)} />;
    }
    
    if (stimulus.type === 'arrow') {
      const ArrowIcon = {
        'up': ArrowUp,
        'down': ArrowDown,
        'left': ArrowLeft,
        'right': ArrowRight
      }[stimulus.value] || ArrowUp;
      
      return (
        <div className="w-full h-full flex items-center justify-center bg-neutral-800 rounded-3xl">
          <ArrowIcon className="w-40 h-40 text-white" />
        </div>
      );
    }
    
    if (stimulus.type === 'number') {
      return (
        <div className="w-full h-full flex items-center justify-center bg-neutral-800 rounded-3xl">
          <span className="text-[12rem] font-bold text-white leading-none">{stimulus.value}</span>
        </div>
      );
    }
  };

  if (isActive) {
    return (
      <div className="fixed inset-0 z-50 bg-neutral-950 flex flex-col p-6">
        <div className="flex justify-end mb-6">
          <button 
            onClick={() => setIsActive(false)}
            className="bg-neutral-800 hover:bg-neutral-700 text-white px-6 py-3 rounded-xl font-medium transition-colors"
          >
            Detener
          </button>
        </div>
        <div className="flex-1 pb-10">
          {renderStimulus()}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 -ml-2 text-neutral-400 hover:text-white">
          <ChevronRight className="w-6 h-6 rotate-180" />
        </button>
        <h1 className="text-2xl font-bold text-white">Reacción Visual</h1>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-6">
        <div>
          <label className="block text-sm font-medium text-neutral-400 mb-3">Tipo de Estímulo</label>
          <div className="grid grid-cols-2 gap-3">
            {[
              { id: 'colores', label: 'Colores' },
              { id: 'flechas', label: 'Flechas' },
              { id: 'numeros', label: 'Números' },
              { id: 'mixto', label: 'Mixto (Todos)' }
            ].map(m => (
              <button
                key={m.id}
                onClick={() => setMode(m.id as any)}
                className={cn(
                  "py-3 px-4 rounded-xl text-sm font-medium transition-colors border",
                  mode === m.id 
                    ? "bg-yellow-500/10 border-yellow-500/50 text-yellow-500" 
                    : "bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white"
                )}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-400 mb-3">Velocidad (Cambio cada...)</label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { ms: 3000, label: 'Lento (3s)' },
              { ms: 2000, label: 'Normal (2s)' },
              { ms: 1000, label: 'Rápido (1s)' },
              { ms: 700, label: 'Flash (0.7s)' }
            ].map(s => (
              <button
                key={s.ms}
                onClick={() => setSpeed(s.ms)}
                className={cn(
                  "py-3 px-2 rounded-xl text-xs font-medium transition-colors border",
                  speed === s.ms 
                    ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-500" 
                    : "bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white"
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <button 
          onClick={() => setIsActive(true)}
          className="w-full bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-4 rounded-xl transition-colors flex items-center justify-center gap-2 mt-4"
        >
          <Play className="w-5 h-5" />
          INICIAR ENTRENAMIENTO
        </button>
      </div>
    </div>
  );
}
