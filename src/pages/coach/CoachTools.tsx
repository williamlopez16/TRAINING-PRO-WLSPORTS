import { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { BookOpen, Timer, Activity, Video, FileText, ChevronRight, Plus, Search } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function CoachTools() {
  const [activeTool, setActiveTool] = useState<string | null>(null);

  const tools = [
    { id: 'banco', icon: BookOpen, title: 'Banco de Ejercicios', desc: 'Crea y gestiona ejercicios', color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { id: 'timer', icon: Timer, title: 'Tabata Timer', desc: 'Cronómetro de intervalos', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { id: 'zonas', icon: Activity, title: 'Zonas Cardíacas', desc: 'Calculadora de FC Max', color: 'text-red-500', bg: 'bg-red-500/10' },
    { id: 'video', icon: Video, title: 'Análisis de Video', desc: 'Links a análisis externos', color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { id: 'informes', icon: FileText, title: 'Informes', desc: 'Historial y reportes', color: 'text-amber-500', bg: 'bg-amber-500/10' },
  ];

  if (activeTool === 'banco') {
    return <ExerciseBank onBack={() => setActiveTool(null)} />;
  }

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
  const { exercises } = useAppStore();
  const [search, setSearch] = useState('');

  const filtered = exercises.filter(e => e.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 -ml-2 text-neutral-400 hover:text-white">
          <ChevronRight className="w-6 h-6 rotate-180" />
        </button>
        <h1 className="text-2xl font-bold text-white">Banco de Ejercicios</h1>
        <div className="flex-1" />
        <button className="bg-emerald-600 hover:bg-emerald-500 text-white w-10 h-10 rounded-full flex items-center justify-center transition-colors">
          <Plus className="w-6 h-6" />
        </button>
      </div>

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
