import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Plus, Search, User, ChevronRight } from 'lucide-react';

export default function CoachAthletes() {
  const { athletes, addAthlete, user } = useAppStore();
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newAthlete, setNewAthlete] = useState({ name: '', category: '' });

  const filteredAthletes = athletes.filter(a => 
    a.name.toLowerCase().includes(search.toLowerCase()) || 
    a.category?.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAthlete.name) return;
    
    addAthlete({
      coachId: user?.uid || 'unknown',
      name: newAthlete.name,
      category: newAthlete.category
    });
    setNewAthlete({ name: '', category: '' });
    setShowAdd(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Atletas</h1>
        <button 
          onClick={() => setShowAdd(true)}
          className="bg-emerald-600 hover:bg-emerald-500 text-white w-10 h-10 rounded-full flex items-center justify-center transition-colors"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>

      {showAdd && (
        <div className="bg-neutral-900 border border-emerald-500/30 rounded-2xl p-5">
          <h2 className="text-lg font-medium text-white mb-4">Nuevo Atleta</h2>
          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <label className="block text-sm text-neutral-400 mb-1">Nombre completo</label>
              <input 
                type="text" 
                value={newAthlete.name}
                onChange={e => setNewAthlete({...newAthlete, name: e.target.value})}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
                placeholder="Ej. Carlos Silva"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-neutral-400 mb-1">Categoría / Grupo (Opcional)</label>
              <input 
                type="text" 
                value={newAthlete.category}
                onChange={e => setNewAthlete({...newAthlete, category: e.target.value})}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
                placeholder="Ej. Sub 15"
              />
            </div>
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
          placeholder="Buscar atleta..."
          className="w-full bg-neutral-900 border border-neutral-800 rounded-2xl pl-12 pr-4 py-4 text-white focus:outline-none focus:border-emerald-500 transition-colors"
        />
      </div>

      <div className="space-y-3">
        {filteredAthletes.length === 0 ? (
          <div className="text-center py-10 text-neutral-500">
            No se encontraron atletas.
          </div>
        ) : (
          filteredAthletes.map(athlete => (
            <div key={athlete.id} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex items-center gap-4 active:scale-[0.98] transition-transform cursor-pointer">
              <div className="w-12 h-12 rounded-full bg-neutral-800 flex items-center justify-center text-neutral-400 shrink-0">
                <User className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-medium truncate">{athlete.name}</h3>
                {athlete.category && (
                  <p className="text-sm text-neutral-400 truncate">{athlete.category}</p>
                )}
              </div>
              <ChevronRight className="w-5 h-5 text-neutral-600" />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
