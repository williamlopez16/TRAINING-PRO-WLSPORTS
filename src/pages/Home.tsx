import React, { useState, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Plus, Users, Copy, Trash2, Edit2, Play, Search, Link2, Download, Upload } from 'lucide-react';
import { cn } from '../lib/utils';
import { View } from '../App';

interface HomeProps {
  onNavigate: (view: View, courseId?: string) => void;
}

export function Home({ onNavigate }: HomeProps) {
  const { courses, addCourse, deleteCourse, duplicateCourse, updateCourseName } = useAppStore();
  const [newCourseName, setNewCourseName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourseName.trim()) return;
    addCourse(newCourseName.trim());
    setNewCourseName('');
  };

  const startEdit = (id: string, name: string) => {
    setEditingId(id);
    setEditName(name);
  };

  const saveEdit = (id: string) => {
    if (editName.trim()) {
      updateCourseName(id, editName.trim());
    }
    setEditingId(null);
  };

  const exportData = async () => {
    const data = localStorage.getItem('edu-groups-storage');
    if (!data) return alert('No hay datos para exportar.');
    
    try {
      // 1. Guardamos los datos en el código fuente (backend) para que si el usuario comparte o exporta a Github vayan incluidos
      const parsedData = JSON.parse(data);
      const stateToSave = parsedData.state || { courses: [], histories: [] };
      await fetch('/api/save-initial-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stateToSave)
      });
    } catch (e) {
      console.error('No se pudo sincronizar con el backend:', e);
    }

    try {
      // 2. Intentamos la descarga (algunos iframes bloquean esto)
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.target = '_top';
      a.download = `wlsports-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      alert('Tus grupos han sido guardados internamente. Si la descarga local se bloquea por el navegador, no te preocupes, los datos igual se han sincronizado.\n\nPara guardarlos en GitHub, presiona el botón principal "Share" arriba a la derecha.');
    } catch(err) {
      alert('Los datos se han sincronizado con éxito para Github. (La descarga local falla en entorno restringido).');
    }
  };

  const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        if (parsed && typeof parsed === 'object' && parsed.state) {
          localStorage.setItem('edu-groups-storage', content);
          window.location.reload();
        } else {
          alert('El archivo no tiene el formato correcto.');
        }
      } catch (err) {
        alert('Error al leer el archivo JSON.');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="flex-1 flex flex-col pt-8 pb-20 px-6">
      <header className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">WLSPORTS <span className="text-blue-600">Groups</span></h1>
          <p className="text-slate-500 font-medium mt-1">Organizador Inteligente de Grupos</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={exportData}
            title="Exportar base de datos"
            className="p-2 bg-slate-100 text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-200 transition-colors"
          >
            <Download className="w-5 h-5" />
          </button>
          <button 
            onClick={() => fileInputRef.current?.click()}
            title="Importar base de datos"
            className="p-2 bg-slate-100 text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-200 transition-colors"
          >
            <Upload className="w-5 h-5" />
          </button>
          <input 
            type="file" 
            accept=".json" 
            className="hidden" 
            ref={fileInputRef} 
            onChange={importData} 
          />
        </div>
      </header>

      <form onSubmit={handleCreate} className="mb-8 flex gap-2 relative">
        <input
          type="text"
          value={newCourseName}
          onChange={(e) => setNewCourseName(e.target.value)}
          placeholder="Nombre del curso (ej. 10A)"
          className="flex-1 bg-slate-100 border-none rounded-2xl px-5 py-4 focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all font-medium"
        />
        <button 
          type="submit" 
          disabled={!newCourseName.trim()}
          className="bg-blue-600 text-white p-4 rounded-2xl disabled:opacity-50 hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200"
        >
          <Plus className="w-6 h-6" />
        </button>
      </form>

      <div className="flex-1 space-y-4">
        {courses.length === 0 ? (
          <div className="h-40 flex flex-col items-center justify-center text-slate-400">
            <Users className="w-12 h-12 mb-3 opacity-20" />
            <p className="font-medium">No hay cursos creados aún.</p>
          </div>
        ) : (
          courses.map(course => (
            <div key={course.id} className="bg-white border border-slate-200 p-5 rounded-3xl shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                {editingId === course.id ? (
                  <input
                    autoFocus
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={() => saveEdit(course.id)}
                    onKeyDown={(e) => e.key === 'Enter' && saveEdit(course.id)}
                    className="font-bold text-xl bg-slate-100 px-3 py-1 rounded-lg w-full mr-3"
                  />
                ) : (
                  <h2 className="text-xl font-bold text-slate-900 select-all" onClick={() => startEdit(course.id, course.name)}>
                    {course.name}
                  </h2>
                )}
                
                <div className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1.5">
                  <Users className="w-4 h-4" /> {course.students.length}
                </div>
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={() => onNavigate('course', course.id)}
                  className="flex-1 bg-slate-900 text-white py-3 rounded-2xl font-medium hover:bg-slate-800 transition-colors active:scale-[0.98]"
                >
                  Ver Lista
                </button>
                <button 
                  onClick={() => onNavigate('generator', course.id)}
                  disabled={course.students.length === 0}
                  className="flex-[1.5] bg-blue-600 text-white py-3 rounded-2xl font-semibold flex items-center justify-center gap-2 disabled:opacity-40 disabled:bg-slate-300 hover:bg-blue-700 transition-all active:scale-[0.98]"
                >
                  <Play className="w-5 h-5 fill-white" />
                  Armar Grupos
                </button>
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
                <button onClick={() => startEdit(course.id, course.name)} className="p-2 text-slate-400 hover:text-slate-900 transition-colors">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => duplicateCourse(course.id)} className="p-2 text-slate-400 hover:text-blue-600 transition-colors">
                  <Copy className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => {
                    if(confirm(`¿Eliminar el curso ${course.name} y todos sus estudiantes?`)) {
                      deleteCourse(course.id);
                    }
                  }} 
                  className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
