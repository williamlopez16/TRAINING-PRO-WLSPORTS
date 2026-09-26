import React, { useState, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Plus, Users, Copy, Trash2, Edit2, Play, Search, Download, Upload, FolderPlus, Folder, ChevronRight, ChevronDown, FolderOpen, MoreVertical, LayoutGrid, RotateCw } from 'lucide-react';
import { cn } from '../lib/utils';
import { View } from '../App';
import { Folder as FolderType } from '../types';
import { PWAInstallButton } from '../components/PWAInstallButton';
import { InstallAppBanner } from '../components/InstallAppModal';

interface HomeProps {
  onNavigate: (view: View, courseId?: string) => void;
}

export function Home({ onNavigate }: HomeProps) {
  const { 
    courses, 
    folders,
    addFolder,
    updateFolderName,
    deleteFolder,
    addCourse, 
    deleteCourse, 
    duplicateCourse, 
    updateCourseName, 
    setCourseFolder,
    setAllStudentsActive,
    importData: storeImportData 
  } = useAppStore();
  
  const [newCourseName, setNewCourseName] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [showFolderInput, setShowFolderInput] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editFolderName, setEditFolderName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({ 'unassigned': true });
  const [showMoveMenu, setShowMoveMenu] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCreateCourse = (e: React.FormEvent, folderId?: string) => {
    e.preventDefault();
    if (!newCourseName.trim()) return;
    addCourse(newCourseName.trim(), folderId);
    setNewCourseName('');
  };

  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    addFolder(newFolderName.trim());
    setNewFolderName('');
    setShowFolderInput(false);
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

  const startEditFolder = (id: string, name: string) => {
    setEditingFolderId(id);
    setEditFolderName(name);
  };

  const saveEditFolder = (id: string) => {
    if (editFolderName.trim()) {
      updateFolderName(id, editFolderName.trim());
    }
    setEditingFolderId(null);
  };

  const toggleFolder = (id: string) => {
    setExpandedFolders(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const exportData = async () => {
    const data = localStorage.getItem('edu-groups-storage');
    if (!data) return alert('No hay datos para exportar.');
    
    try {
      const parsedData = JSON.parse(data);
      const stateToSave = parsedData.state || { courses: [], histories: [], folders: [] };
      await fetch('/api/save-initial-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stateToSave)
      });
    } catch (e) {
      console.error('No se pudo sincronizar con el backend:', e);
    }

    try {
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
      
      alert('Tus grupos han sido guardados internamente.');
    } catch(err) {
      alert('Los datos se han sincronizado con éxito para Github.');
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
          storeImportData(
            parsed.state.courses || [], 
            parsed.state.histories || [],
            parsed.state.folders || []
          );
          alert('¡Datos importados con éxito!');
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

  const forceUpdateApp = async () => {
    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          await reg.unregister();
        }
      }
      if ('caches' in window) {
        const keys = await caches.keys();
        for (const key of keys) {
          await caches.delete(key);
        }
      }
    } catch (e) {
      console.error(e);
    }
    window.location.href = window.location.origin + '?t=' + Date.now();
  };

  const filteredCourses = courses.filter(course => 
    course.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const coursesByFolder: Record<string, typeof courses> = {};
  filteredCourses.forEach(course => {
    const fid = course.folderId || 'unassigned';
    if (!coursesByFolder[fid]) coursesByFolder[fid] = [];
    coursesByFolder[fid].push(course);
  });

  return (
    <div className="flex-1 flex flex-col pt-8 pb-20 px-4 sm:px-6 bg-[#080c14]">
      <header className="mb-7 flex justify-between items-start">
        <div className="flex items-center gap-3.5">
          <div className="relative">
            <img 
              src="/logo.jpg" 
              alt="WLSPORTS • OWL VISION PRO" 
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover shadow-2xl border-2 border-amber-400/70 ring-2 ring-emerald-400/50 neon-glow-green-sm bg-black"
              referrerPolicy="no-referrer"
            />
            <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-slate-950 flex items-center justify-center shadow-[0_0_8px_#22c55e]">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white font-sans">
                WLSPORTS
              </h1>
              <span className="text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-400/40 font-mono">
                PRO
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="gold-gradient-text font-serif font-black text-xs sm:text-sm tracking-wider uppercase">
                OWL VISION PRO
              </span>
              <span className="text-slate-500 text-xs">·</span>
              <span className="text-emerald-400 font-bold text-xs tracking-wide flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#22c55e]" />
                Grupos Inteligentes
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <PWAInstallButton />
          <button 
            onClick={forceUpdateApp}
            title="Recargar y actualizar versión limpia"
            className="p-2.5 bg-slate-900/90 text-slate-300 hover:text-white rounded-xl hover:bg-slate-800 border border-slate-800 hover:border-amber-500/40 transition-all"
          >
            <RotateCw className="w-5 h-5" />
          </button>
          <button 
            onClick={exportData}
            title="Exportar base de datos"
            className="p-2.5 bg-slate-900/90 text-slate-300 hover:text-amber-300 rounded-xl hover:bg-slate-800 border border-slate-800 hover:border-amber-500/40 transition-all"
          >
            <Download className="w-5 h-5" />
          </button>
          <button 
            onClick={() => fileInputRef.current?.click()}
            title="Importar base de datos"
            className="p-2.5 bg-slate-900/90 text-slate-300 hover:text-emerald-400 rounded-xl hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/40 transition-all"
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

      <InstallAppBanner />

      {/* Frase motivacional con estilo Oro y Neón */}
      <div className="mb-7 p-4 bg-gradient-to-r from-slate-950 via-[#0d131f] to-slate-950 rounded-2xl border border-amber-500/30 text-center relative overflow-hidden shadow-lg">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-500/5 via-emerald-500/5 to-transparent pointer-events-none" />
        <p className="text-xs sm:text-sm font-semibold text-slate-200 italic relative z-10">
          "Cada nuevo grupo es una oportunidad para aprender a <br className="sm:hidden" />convivir, adaptarse y crecer."
        </p>
        <div className="flex items-center justify-center gap-1.5 mt-1.5 relative z-10">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#22c55e]" />
          <span className="text-[11px] font-black uppercase tracking-widest text-amber-400 font-serif">OWL VISION PRO • WLSPORTS</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#22c55e]" />
        </div>
      </div>

      <div className="flex gap-2 items-center mb-6">
        <form onSubmit={handleCreateCourse} className="flex-1 flex gap-2">
          <input
            type="text"
            value={newCourseName}
            onChange={(e) => setNewCourseName(e.target.value)}
            placeholder="Nuevo curso (ej. 10A, Fútbol 11)"
            className="flex-1 bg-slate-900/90 border border-slate-800 text-white placeholder-slate-500 rounded-2xl px-5 py-3 focus:ring-2 focus:ring-emerald-400 focus:border-amber-400 transition-all font-medium"
          />
          <button 
            type="submit" 
            disabled={!newCourseName.trim()}
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black p-3.5 rounded-2xl disabled:opacity-30 disabled:bg-slate-800 disabled:text-slate-500 transition-all shadow-lg shadow-emerald-500/30 neon-glow-green-sm active:scale-95 cursor-pointer"
            title="Crear nuevo curso"
          >
            <Plus className="w-6 h-6 stroke-[3]" />
          </button>
        </form>
        
        <div className="h-10 w-px bg-slate-800 mx-1" />

        {!showFolderInput ? (
          <button 
            onClick={() => setShowFolderInput(true)}
            className="p-3 bg-slate-900/90 text-slate-300 hover:text-amber-300 border border-slate-800 hover:border-amber-500/40 rounded-2xl hover:bg-slate-800 transition-all flex items-center gap-2 font-semibold px-4 min-h-[48px]"
          >
            <FolderPlus className="w-5 h-5 text-amber-400" />
            <span className="hidden sm:inline">Nueva Carpeta</span>
          </button>
        ) : (
          <form onSubmit={handleCreateFolder} className="flex gap-2">
            <input
              autoFocus
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onBlur={() => !newFolderName.trim() && setShowFolderInput(false)}
              placeholder="Nombre carpeta"
              className="w-40 bg-slate-900 border-amber-400/80 border text-white placeholder-slate-500 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-emerald-400 transition-all font-medium"
            />
            <button 
              type="submit" 
              className="bg-amber-500 text-slate-950 font-black p-3 rounded-2xl hover:bg-amber-400 transition-colors shadow-md shadow-amber-500/30"
            >
              <Plus className="w-5 h-5 stroke-[3]" />
            </button>
          </form>
        )}
      </div>

      {courses.length > 0 && (
        <div className="mb-7 relative">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-amber-400/80" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar curso por nombre..."
            className="w-full bg-slate-900/90 border border-slate-800 text-white placeholder-slate-500 rounded-2xl pl-11 pr-5 py-3 focus:ring-2 focus:ring-emerald-400 focus:border-amber-400 transition-all font-medium shadow-sm"
          />
        </div>
      )}

      <div className="flex-1 space-y-8">
        {/* Folders first */}
        {folders?.map(folder => {
          const folderCourses = coursesByFolder[folder.id] || [];
          const isExpanded = expandedFolders[folder.id] !== false;
          
          return (
            <div key={folder.id} className="space-y-4">
              <div 
                className="flex items-center justify-between p-2 rounded-xl group hover:bg-slate-800/60 cursor-pointer"
                onClick={() => toggleFolder(folder.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="text-slate-400">
                    {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                  </div>
                  <div className="bg-amber-950/40 text-amber-400 p-2 rounded-xl border border-amber-600/40">
                    <FolderOpen className="w-5 h-5" />
                  </div>
                  {editingFolderId === folder.id ? (
                    <input
                      autoFocus
                      value={editFolderName}
                      onChange={(e) => setEditFolderName(e.target.value)}
                      onBlur={() => saveEditFolder(folder.id)}
                      onKeyDown={(e) => e.key === 'Enter' && saveEditFolder(folder.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="font-bold text-lg bg-slate-800 text-white border border-slate-700 px-3 py-1 rounded-lg"
                    />
                  ) : (
                    <h3 className="font-bold text-slate-100 text-lg flex items-center gap-2">
                      {folder.name}
                      <span className="text-slate-400 text-sm font-medium">({folderCourses.length})</span>
                    </h3>
                  )}
                </div>
                
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={(e) => { e.stopPropagation(); startEditFolder(folder.id, folder.name); }}
                    className="p-1.5 text-slate-400 hover:text-white"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      if(confirm(`¿Eliminar la carpeta "${folder.name}"? Los cursos pasarán a "Mis Cursos".`)) {
                        deleteFolder(folder.id);
                      }
                    }} 
                    className="p-1.5 text-slate-400 hover:text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4 pl-2.5 sm:pl-6 border-l-2 border-slate-800 ml-2 sm:ml-4">
                  {folderCourses.length === 0 ? (
                    <p className="text-slate-400 text-sm italic py-2">Carpeta vacía.</p>
                  ) : (
                    folderCourses.map(course => (
                      <CourseCard 
                        key={course.id} 
                        course={course} 
                        onNavigate={onNavigate}
                        startEdit={startEdit}
                        editingId={editingId}
                        editName={editName}
                        setEditName={setEditName}
                        saveEdit={saveEdit}
                        duplicateCourse={duplicateCourse}
                        deleteCourse={deleteCourse}
                        setCourseFolder={setCourseFolder}
                        folders={folders}
                        showMoveMenu={showMoveMenu}
                        setShowMoveMenu={setShowMoveMenu}
                      />
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Unassigned Courses */}
        <div className="space-y-4">
          <div 
            className="flex items-center gap-3 p-2 rounded-xl cursor-pointer hover:bg-slate-800/60"
            onClick={() => toggleFolder('unassigned')}
          >
            <div className="text-slate-400">
              {expandedFolders['unassigned'] !== false ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
            </div>
            <div className="bg-slate-850 text-amber-300 p-2 rounded-xl border border-amber-500/30">
              <LayoutGrid className="w-5 h-5 text-amber-400" />
            </div>
            <h3 className="font-bold text-slate-100 text-lg">
              Mis Cursos
              <span className="text-slate-400 text-sm font-medium ml-2">({(coursesByFolder['unassigned'] || []).length})</span>
            </h3>
          </div>

          {(expandedFolders['unassigned'] !== false) && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4 pl-2.5 sm:pl-6 border-l-2 border-slate-800 ml-2 sm:ml-4">
              {(coursesByFolder['unassigned'] || []).length === 0 ? (
                <div className="h-32 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-800 rounded-3xl col-span-full">
                  <Users className="w-8 h-8 mb-2 opacity-20" />
                  <p className="text-sm font-medium">No hay cursos sin asignar.</p>
                </div>
              ) : (
                coursesByFolder['unassigned'].map(course => (
                  <CourseCard 
                    key={course.id} 
                    course={course} 
                    onNavigate={onNavigate}
                    startEdit={startEdit}
                    editingId={editingId}
                    editName={editName}
                    setEditName={setEditName}
                    saveEdit={saveEdit}
                    duplicateCourse={duplicateCourse}
                    deleteCourse={deleteCourse}
                    setCourseFolder={setCourseFolder}
                    folders={folders}
                    showMoveMenu={showMoveMenu}
                    setShowMoveMenu={setShowMoveMenu}
                  />
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Subcomponent for Cleaner code
function CourseCard({ 
  course, onNavigate, startEdit, editingId, editName, setEditName, saveEdit, duplicateCourse, deleteCourse, setCourseFolder, folders, showMoveMenu, setShowMoveMenu 
}: any) {
  const { setAllStudentsActive } = useAppStore();
  const activeCount = course.students.filter((s: any) => s.isActive).length;
  const totalCount = course.students.length;
  const inactiveCount = totalCount - activeCount;

  return (
    <div className="bg-[#0b101b] border border-slate-800/90 hover:border-amber-400/40 p-4 sm:p-5 rounded-3xl shadow-lg hover:shadow-[0_0_24px_rgba(212,175,55,0.12)] transition-all group">
      <div className="flex items-center justify-between mb-4">
        <div className="flex-1 min-w-0">
          {editingId === course.id ? (
            <input
              autoFocus
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={() => saveEdit(course.id)}
              onKeyDown={(e) => e.key === 'Enter' && saveEdit(course.id)}
              className="font-bold text-lg bg-slate-800 text-white border border-slate-700 px-3 py-1.5 rounded-xl w-full"
            />
          ) : (
            <h2 className="text-xl font-black text-slate-100 truncate tracking-tight group-hover:text-amber-300 transition-colors" title={course.name}>
              {course.name}
            </h2>
          )}
        </div>
        
        <div className={cn(
          "px-3 py-1 rounded-full text-xs font-black flex items-center gap-1.5 ml-2 shrink-0 border transition-colors",
          inactiveCount > 0 
            ? "bg-amber-950/40 text-amber-300 border-amber-500/40" 
            : "bg-emerald-950/50 text-emerald-400 border-emerald-500/40 shadow-[0_0_8px_rgba(16,233,86,0.15)]"
        )}>
          <Users className="w-3.5 h-3.5 text-amber-400" />
          <span>{inactiveCount > 0 ? `${activeCount}/${totalCount}` : totalCount}</span>
        </div>
      </div>

      {inactiveCount > 0 && (
        <div className="mb-3.5 px-3 py-2 bg-amber-950/25 border border-amber-500/35 rounded-2xl flex items-center justify-between text-xs">
          <span className="text-amber-300 font-bold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            {inactiveCount} {inactiveCount === 1 ? 'apagado' : 'apagados'}
          </span>
          <button 
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setAllStudentsActive(course.id, true);
            }}
            className="flex items-center gap-1.5 text-xs font-black bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-2.5 py-1 rounded-xl transition-all shadow-md shadow-emerald-500/30 neon-glow-green-sm active:scale-95 cursor-pointer"
            title="Reactivar todos los estudiantes de este grupo"
          >
            <span className="w-7 h-3.5 rounded-full bg-slate-950/40 flex items-center relative box-border">
              <span className="w-2.5 h-2.5 bg-white rounded-full transition-all absolute left-0.5" />
            </span>
            <span>Reactivar</span>
          </button>
        </div>
      )}

      <div className="flex gap-2.5">
        <button 
          onClick={() => onNavigate('course', course.id)}
          className="flex-1 bg-slate-900 text-slate-200 border border-slate-800 hover:border-slate-700 py-3 rounded-2xl text-sm font-bold hover:bg-slate-800 hover:text-white transition-all active:scale-[0.98] min-h-[44px]"
        >
          Editar
        </button>
        <button 
          onClick={() => onNavigate('generator', course.id)}
          disabled={course.students.length === 0}
          className="flex-[1.3] bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-3 rounded-2xl text-sm flex items-center justify-center gap-2 disabled:opacity-30 disabled:bg-slate-800 disabled:text-slate-500 transition-all shadow-lg shadow-emerald-500/25 neon-glow-green-sm active:scale-[0.98] min-h-[44px] cursor-pointer"
        >
          <Play className="w-4 h-4 fill-slate-950" />
          Grupos
        </button>
      </div>

      <div className="flex justify-between items-center pt-3.5 mt-3.5 border-t border-slate-800/80">
        <div className="flex gap-1.5">
          <button onClick={() => startEdit(course.id, course.name)} className="p-2 text-slate-400 hover:text-amber-300 rounded-xl hover:bg-slate-800/60 min-w-[36px] min-h-[36px] flex items-center justify-center transition-colors" title="Renombrar">
            <Edit2 className="w-4 h-4" />
          </button>
          <button onClick={() => duplicateCourse(course.id)} className="p-2 text-slate-400 hover:text-amber-400 rounded-xl hover:bg-slate-800/60 min-w-[36px] min-h-[36px] flex items-center justify-center transition-colors" title="Duplicar">
            <Copy className="w-4 h-4" />
          </button>
          <button 
            onClick={() => {
              if(confirm(`¿Eliminar el curso ${course.name}?`)) {
                deleteCourse(course.id);
              }
            }} 
            className="p-2 text-slate-400 hover:text-red-400 rounded-xl hover:bg-slate-800/60 min-w-[36px] min-h-[36px] flex items-center justify-center transition-colors"
            title="Eliminar"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        <div className="relative">
          <button 
            onClick={() => setShowMoveMenu(showMoveMenu === course.id ? null : course.id)}
            className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-amber-400 transition-colors p-2 rounded-xl hover:bg-slate-800/60 min-h-[36px]"
          >
            Mover <MoreVertical className="w-4 h-4" />
          </button>
          
          {showMoveMenu === course.id && (
            <div className="absolute right-0 bottom-full mb-2 w-48 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-10 py-2 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
              <p className="px-4 py-2 text-xs font-bold text-slate-300 uppercase tracking-widest bg-slate-950/60 border-b border-slate-800 mb-1">Mover a...</p>
              <button 
                onClick={() => { setCourseFolder(course.id, undefined); setShowMoveMenu(null); }}
                className={cn(
                  "w-full text-left px-4 py-2 text-sm hover:bg-slate-800 flex items-center gap-2 text-slate-200",
                  !course.folderId && "text-amber-400 font-semibold bg-amber-950/40"
                )}
              >
                <LayoutGrid className="w-4 h-4" /> Mis Cursos
              </button>
              {folders.map((f: any) => (
                <button 
                  key={f.id}
                  onClick={() => { setCourseFolder(course.id, f.id); setShowMoveMenu(null); }}
                  className={cn(
                    "w-full text-left px-4 py-2 text-sm hover:bg-slate-800 flex items-center gap-2 text-slate-200",
                    course.folderId === f.id && "text-amber-400 font-semibold bg-amber-950/40"
                  )}
                >
                  <Folder className="w-4 h-4" /> {f.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
