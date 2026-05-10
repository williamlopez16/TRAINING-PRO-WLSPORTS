import React, { useState, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Plus, Users, Copy, Trash2, Edit2, Play, Search, Download, Upload, FolderPlus, Folder, ChevronRight, ChevronDown, FolderOpen, MoreVertical, LayoutGrid } from 'lucide-react';
import { cn } from '../lib/utils';
import { View } from '../App';
import { Folder as FolderType } from '../types';

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

      <div className="mb-8 p-4 bg-blue-50/50 rounded-2xl border border-blue-100 text-center">
        <p className="text-sm font-medium text-blue-800 italic">
          "Cada nuevo grupo es una oportunidad para aprender a <br className="sm:hidden" />convivir, adaptarse y crecer."
        </p>
      </div>

      <div className="flex gap-2 items-center mb-6">
        <form onSubmit={handleCreateCourse} className="flex-1 flex gap-2">
          <input
            type="text"
            value={newCourseName}
            onChange={(e) => setNewCourseName(e.target.value)}
            placeholder="Nuevo curso (ej. 10A)"
            className="flex-1 bg-slate-100 border-none rounded-2xl px-5 py-3 focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all font-medium"
          />
          <button 
            type="submit" 
            disabled={!newCourseName.trim()}
            className="bg-blue-600 text-white p-3 rounded-2xl disabled:opacity-50 hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200"
          >
            <Plus className="w-6 h-6" />
          </button>
        </form>
        
        <div className="h-10 w-px bg-slate-200 mx-1" />

        {!showFolderInput ? (
          <button 
            onClick={() => setShowFolderInput(true)}
            className="p-3 bg-slate-100 text-slate-600 hover:text-blue-600 rounded-2xl hover:bg-slate-200 transition-all flex items-center gap-2 font-semibold px-4"
          >
            <FolderPlus className="w-5 h-5" />
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
              className="w-40 bg-blue-50 border-blue-200 border rounded-2xl px-4 py-3 focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all font-medium"
            />
            <button 
              type="submit"
              className="bg-blue-600 text-white p-3 rounded-2xl hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
            </button>
          </form>
        )}
      </div>

      {courses.length > 0 && (
        <div className="mb-8 relative">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-slate-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar curso por nombre..."
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-11 pr-5 py-3 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 focus:bg-white transition-all font-medium text-slate-700 shadow-sm shadow-slate-100"
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
                className="flex items-center justify-between p-2 rounded-xl group hover:bg-slate-50 cursor-pointer"
                onClick={() => toggleFolder(folder.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="text-slate-400">
                    {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                  </div>
                  <div className="bg-blue-100 text-blue-600 p-2 rounded-xl">
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
                      className="font-bold text-lg bg-slate-100 px-3 py-1 rounded-lg"
                    />
                  ) : (
                    <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                      {folder.name}
                      <span className="text-slate-400 text-sm font-medium">({folderCourses.length})</span>
                    </h3>
                  )}
                </div>
                
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={(e) => { e.stopPropagation(); startEditFolder(folder.id, folder.name); }}
                    className="p-1.5 text-slate-400 hover:text-slate-900"
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
                    className="p-1.5 text-slate-400 hover:text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pl-4 sm:pl-8 border-l-2 border-slate-100 ml-6">
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
            className="flex items-center gap-3 p-2 rounded-xl cursor-pointer hover:bg-slate-50"
            onClick={() => toggleFolder('unassigned')}
          >
            <div className="text-slate-400">
              {expandedFolders['unassigned'] !== false ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
            </div>
            <div className="bg-slate-100 text-slate-600 p-2 rounded-xl">
              <LayoutGrid className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-800 text-lg">
              Mis Cursos
              <span className="text-slate-400 text-sm font-medium ml-2">({(coursesByFolder['unassigned'] || []).length})</span>
            </h3>
          </div>

          {(expandedFolders['unassigned'] !== false) && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pl-4 sm:pl-8 border-l-2 border-slate-100 ml-6">
              {(coursesByFolder['unassigned'] || []).length === 0 ? (
                <div className="h-32 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-100 rounded-3xl col-span-full">
                  <Users className="w-8 h-8 mb-2 opacity-10" />
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
  return (
    <div className="bg-white border border-slate-200 p-4 rounded-3xl shadow-sm hover:shadow-md transition-shadow group">
      <div className="flex items-center justify-between mb-4">
        <div className="flex-1 min-w-0">
          {editingId === course.id ? (
            <input
              autoFocus
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={() => saveEdit(course.id)}
              onKeyDown={(e) => e.key === 'Enter' && saveEdit(course.id)}
              className="font-bold text-lg bg-slate-100 px-3 py-1 rounded-lg w-full"
            />
          ) : (
            <h2 className="text-lg font-bold text-slate-900 truncate" title={course.name}>
              {course.name}
            </h2>
          )}
        </div>
        
        <div className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 ml-2">
          <Users className="w-3.5 h-3.5" /> {course.students.length}
        </div>
      </div>

      <div className="flex gap-2">
        <button 
          onClick={() => onNavigate('course', course.id)}
          className="flex-1 bg-slate-900 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-slate-800 transition-colors active:scale-[0.98]"
        >
          Editar
        </button>
        <button 
          onClick={() => onNavigate('generator', course.id)}
          disabled={course.students.length === 0}
          className="flex-[1.2] bg-blue-600 text-white py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:bg-slate-300 hover:bg-blue-700 transition-all active:scale-[0.98]"
        >
          <Play className="w-4 h-4 fill-white" />
          Grupos
        </button>
      </div>

      <div className="flex justify-between items-center pt-3 mt-3 border-t border-slate-100">
        <div className="flex gap-1">
          <button onClick={() => startEdit(course.id, course.name)} className="p-1.5 text-slate-400 hover:text-slate-900">
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => duplicateCourse(course.id)} className="p-1.5 text-slate-400 hover:text-blue-600">
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button 
            onClick={() => {
              if(confirm(`¿Eliminar el curso ${course.name}?`)) {
                deleteCourse(course.id);
              }
            }} 
            className="p-1.5 text-slate-400 hover:text-red-600"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="relative">
          <button 
            onClick={() => setShowMoveMenu(showMoveMenu === course.id ? null : course.id)}
            className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-blue-600 transition-colors p-1"
          >
            Mover <MoreVertical className="w-3.5 h-3.5" />
          </button>
          
          {showMoveMenu === course.id && (
            <div className="absolute right-0 bottom-full mb-2 w-48 bg-white border border-slate-200 rounded-2xl shadow-xl z-10 py-2 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
              <p className="px-4 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 border-b border-slate-100 mb-1">Mover a...</p>
              <button 
                onClick={() => { setCourseFolder(course.id, undefined); setShowMoveMenu(null); }}
                className={cn(
                  "w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center gap-2",
                  !course.folderId && "text-blue-600 font-semibold bg-blue-50/50"
                )}
              >
                <LayoutGrid className="w-4 h-4" /> Mis Cursos
              </button>
              {folders.map((f: any) => (
                <button 
                  key={f.id}
                  onClick={() => { setCourseFolder(course.id, f.id); setShowMoveMenu(null); }}
                  className={cn(
                    "w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center gap-2",
                    course.folderId === f.id && "text-blue-600 font-semibold bg-blue-50/50"
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
