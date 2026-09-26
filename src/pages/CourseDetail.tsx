import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { ChevronLeft, Plus, FileUp, Edit2, Check, User, Trash2, X, AlertCircle, History, Sparkles, Loader2, Shield, Star, Trophy, Users, Share2, CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { View } from '../App';
import { Gender, Student } from '../types';
import Papa from 'papaparse';
import * as pdfjsLib from 'pdfjs-dist';
import PdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?worker';
import owlLogo from '../assets/logo.jpg';

const worker = new PdfWorker();
pdfjsLib.GlobalWorkerOptions.workerPort = worker;

interface CourseDetailProps {
  courseId: string;
  onNavigate: (view: View, courseId?: string) => void;
}

export function CourseDetail({ courseId, onNavigate }: CourseDetailProps) {
  const { courses, folders, addStudent, updateStudent, deleteStudent, toggleStudentActive, setAllStudentsActive, addMultipleStudents } = useAppStore();
  const course = courses.find(c => c.id === courseId);
  const folder = folders?.find(f => f.id === course?.folderId);
  
  const [isTeacherMode, setIsTeacherMode] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [importText, setImportText] = useState('');
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [previewStudents, setPreviewStudents] = useState<Pick<Student, 'name'|'gender'|'notes'>[]>([]);
  
  const [newMode, setNewMode] = useState(false);
  const [name, setName] = useState('');
  const [gender, setGender] = useState<Gender>('O');
  const [studentToDelete, setStudentToDelete] = useState<{id: string, name: string} | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(curr => curr === msg ? null : curr);
    }, 3000);
  };

  if (!course) {
    return <div className="p-8">Curso no encontrado.</div>;
  }

  const handleManualAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    addStudent(courseId, { name: name.trim(), gender });
    setName('');
    setNewMode(false);
  };

  const handleTextImport = () => {
    if (!importText.trim()) return;
    Papa.parse(importText.trim(), {
      complete: (results) => {
        const newStudents: Pick<Student, 'name'|'gender'|'notes'>[] = [];
        results.data.forEach((row: any) => {
          if (!row || row.length === 0 || !row[0]) return;
          const sName = String(row[0]).trim();
          let sGender: Gender = 'O';
          if (row.length > 1 && row[1]) {
            const g = String(row[1]).trim().toUpperCase();
            if (g === 'M' || g === 'F') sGender = g as Gender;
            if (g === 'H' || g === 'V') sGender = 'M';
          }
          if (sName) {
            newStudents.push({ name: sName, gender: sGender, notes: row[2] ? String(row[2]).trim() : undefined });
          }
        });
        if (newStudents.length > 0) {
          setPreviewStudents(newStudents);
        }
      }
    });
  };

  const extractTextFromPDF = async (file: File) => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let text = '';
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const strings = content.items.map((item: any) => item.str);
        text += strings.join(' ') + '\n';
    }
    return text;
  };

  const extractTextFromExcel = async (file: File) => {
    const arrayBuffer = await file.arrayBuffer();
    const xlsx = await import('xlsx');
    const workbook = xlsx.read(arrayBuffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    return xlsx.utils.sheet_to_csv(sheet);
  };

  const extractTextFromWord = async (file: File) => {
    const arrayBuffer = await file.arrayBuffer();
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessingAI(true);
      let text = '';
      const ext = file.name.split('.').pop()?.toLowerCase();

      if (ext === 'pdf') {
         text = await extractTextFromPDF(file);
      } else if (ext === 'xlsx' || ext === 'xls') {
         text = await extractTextFromExcel(file);
      } else if (ext === 'docx') {
         text = await extractTextFromWord(file);
      } else if (ext === 'txt' || ext === 'csv') {
         text = await file.text();
      } else {
         alert('Formato de archivo no soportado. Usa PDF, Word, Excel o Texto.');
         setIsProcessingAI(false);
         return;
      }

      await processAIImport(text);

    } catch (error) {
      console.error('Error handling file:', error);
      alert('Error al leer el contenido del archivo.');
    } finally {
      setIsProcessingAI(false);
    }
    e.target.value = ''; // reset
  };

  const processAIImport = async (text: string) => {
    setIsProcessingAI(true);
    try {
      let currentApiKey = localStorage.getItem('user_gemini_api_key') || undefined;
      let retry = true;
      let data = null;

      while (retry) {
        retry = false;
        
        const payload: any = { text };
        if (currentApiKey && currentApiKey !== 'null' && currentApiKey !== 'undefined') {
          payload.apiKey = currentApiKey;
        }

        const res = await fetch('/api/parse-students', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!res.ok) {
          let errJson = { error: 'Unknown server error', message: '' };
          try { errJson = await res.json(); } catch(e) {}
          
          if (errJson.error === 'API_KEY_INVALID' || errJson.error === 'API_KEY_MISSING') {
             localStorage.removeItem('user_gemini_api_key');
             const newKey = window.prompt("Ingresa una API Key de Gemini válida para continuar (se guardará localmente):");
             if (newKey) {
                currentApiKey = newKey;
                localStorage.setItem('user_gemini_api_key', currentApiKey);
                retry = true;
                continue;
             } else {
                throw new Error("Se requiere una API Key válida para la IA.");
             }
          }
          throw new Error(errJson.message || errJson.error);
        }
        
        data = await res.json();
      }
      
      if (data && data.students && Array.isArray(data.students)) {
         setPreviewStudents(data.students.filter((s:any) => s.name));
      } else {
         throw new Error("El modelo no devolvió una lista válida de estudiantes.");
      }
    } catch (err: any) {
      alert("Hubo un error contactando a la Inteligencia Artificial.\nDetalles: " + err.message);
    } finally {
      setIsProcessingAI(false);
    }
  };

  const savePreview = () => {
    if (previewStudents.length > 0) {
      addMultipleStudents(courseId, previewStudents);
      setShowImport(false);
      setPreviewStudents([]);
      setImportText('');
    }
  };

  const activeCount = course.students.filter(s => s.isActive).length;
  const totalCount = course.students.length;
  const allActive = totalCount > 0 && activeCount === totalCount;
  const inactiveCount = totalCount - activeCount;

  return (
    <div className="flex-1 flex flex-col bg-[#0d111c] min-h-screen text-slate-100">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 border border-slate-700 text-white px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs sm:text-sm font-bold animate-in fade-in slide-in-from-top-4 backdrop-blur-md max-w-sm w-full mx-auto justify-center">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      <header className="bg-[#090d16]/95 backdrop-blur-md px-4 py-4 flex items-center justify-between border-b border-slate-800/90 sticky top-0 z-10">
        <button onClick={() => onNavigate('home')} className="p-2 -ml-2 text-slate-400 hover:text-white transition-colors">
          <ChevronLeft className="w-7 h-7" />
        </button>
        <div className="flex-1 px-3 flex items-center gap-3 min-w-0">
          <img 
            src={owlLogo} 
            onError={(e) => { (e.target as HTMLImageElement).src = '/logo.jpg'; }}
            alt="OWL VISION PRO" 
            className="w-10 h-10 rounded-xl object-cover border border-amber-400/80 ring-1 ring-emerald-400/50 shadow-md shrink-0 bg-black"
          />
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-black text-white truncate flex items-center gap-2">
              {course.name}
              {folder && <span className="text-[10px] bg-amber-950/60 border border-amber-500/40 text-amber-300 px-2 py-0.5 rounded-lg font-black uppercase tracking-wider">{folder.name}</span>}
            </h1>
            <p className="text-xs font-bold text-emerald-400 tracking-wide flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#22c55e]" />
              <span>{activeCount} presentes</span>
              <span className="text-slate-500">/</span>
              <span className="text-slate-400">{course.students.length} total</span>
            </p>
          </div>
        </div>
        <div className="flex gap-2 items-center flex-shrink-0">
          <button 
            onClick={() => setIsTeacherMode(!isTeacherMode)} 
            className={cn(
              "p-2 rounded-xl transition-all active:scale-95 border",
              isTeacherMode 
                ? "bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-md shadow-amber-500/20" 
                : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
            )}
            title="Opciones avanzadas"
            aria-label="Opciones avanzadas"
          >
            <Shield className="w-5 h-5" />
          </button>
          <button 
            onClick={() => onNavigate('tournament', courseId)} 
            className="p-2 bg-amber-500/20 text-amber-400 border border-amber-500/40 rounded-xl hover:bg-amber-500/30 transition-colors shadow-sm"
            title="Crear Torneo / Fixture"
          >
            <Trophy className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setNewMode(!newMode)} 
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black p-2 rounded-xl transition-transform active:scale-95 shadow-md shadow-emerald-500/30 neon-glow-green-sm"
          >
            {newMode ? <X className="w-5 h-5 stroke-[3]" /> : <Plus className="w-5 h-5 stroke-[3]" />}
          </button>
        </div>
      </header>

      {/* Selector de Tabs */}
      <div className="flex bg-[#090d16] border-b border-slate-800">
         <button 
           onClick={() => setShowHistory(false)} 
           className={`flex-1 py-3 text-sm font-black border-b-2 transition-colors ${!showHistory ? 'border-emerald-400 text-emerald-400' : 'border-transparent text-slate-400 hover:text-slate-300'}`}
         >
           Estudiantes ({course.students.length})
         </button>
         <button 
           onClick={() => setShowHistory(true)} 
           className={`flex-1 py-3 text-sm font-black border-b-2 transition-colors flex items-center justify-center gap-2 ${showHistory ? 'border-amber-400 text-amber-400' : 'border-transparent text-slate-400 hover:text-slate-300'}`}
         >
           <History className="w-4 h-4"/> Historial Grupos
         </button>
      </div>

      {!showHistory && newMode && (
        <div className="bg-slate-900 p-4 border-b border-slate-800 shadow-sm">
          <form onSubmit={handleManualAdd} className="space-y-4">
            <input
              autoFocus
              type="text"
              placeholder="Nombre del estudiante"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-white placeholder-slate-500 rounded-xl px-4 py-3 font-medium focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setGender('M')}
                className={`flex-1 py-3 rounded-xl font-semibold border ${gender === 'M' ? 'bg-blue-950/80 border-blue-500 text-blue-400' : 'bg-slate-800 border-slate-700 text-slate-400'}`}
              >
                M
              </button>
              <button
                type="button"
                onClick={() => setGender('F')}
                className={`flex-1 py-3 rounded-xl font-semibold border ${gender === 'F' ? 'bg-pink-950/80 border-pink-500 text-pink-400' : 'bg-slate-800 border-slate-700 text-slate-400'}`}
              >
                F
              </button>
              <button
                type="submit"
                disabled={!name.trim()}
                className="flex-[2] bg-blue-600 text-white py-3 rounded-xl font-bold disabled:opacity-40 hover:bg-blue-500 transition-colors shadow-md shadow-blue-600/30"
              >
                Agregar
              </button>
            </div>
            
            <div className="pt-2">
              <button type="button" onClick={() => {setShowImport(true); setNewMode(false);}} className="w-full py-3 text-sm font-semibold text-slate-300 border border-slate-700 rounded-xl flex justify-center items-center gap-2 hover:bg-slate-800 active:bg-slate-700 transition-colors">
                <FileUp className="w-4 h-4 text-blue-400" /> Importar Lista (Excel / Texto)
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Import Modal */}
      {showImport && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm p-4 flex items-center justify-center">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm flex flex-col shadow-2xl overflow-hidden max-h-[90vh] text-slate-100">
            <div className="flex justify-between items-center p-4 border-b border-slate-800 flex-shrink-0">
              <h3 className="font-bold text-white">Importar Estudiantes</h3>
              <button onClick={() => { setShowImport(false); setPreviewStudents([]); setImportText(''); }} className="p-2 text-slate-400 hover:text-white bg-slate-800 rounded-full transition-colors active:scale-95">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {previewStudents.length > 0 ? (
              <div className="flex-1 overflow-y-auto p-4 flex flex-col bg-slate-950/50">
                <div className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  Revisa y corrige ({previewStudents.length} encontrados)
                </div>
                <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden divide-y divide-slate-800">
                  {previewStudents.map((ps, idx) => (
                    <div key={idx} className="p-3 flex items-center gap-3">
                      <div className="flex-1">
                        <input 
                           type="text" 
                           value={ps.name}
                           onChange={(e) => {
                             const nw = [...previewStudents];
                             nw[idx].name = e.target.value;
                             setPreviewStudents(nw);
                           }}
                           className="w-full text-sm font-semibold outline-none bg-transparent text-white focus:text-blue-400 transition-colors"
                        />
                      </div>
                      <select 
                         value={ps.gender || 'O'} 
                         onChange={(e) => {
                             const nw = [...previewStudents];
                             nw[idx].gender = e.target.value as Gender;
                             setPreviewStudents(nw);
                         }}
                         className="text-xs font-bold bg-slate-800 text-white border border-slate-700 rounded-lg py-2 px-1 outline-none cursor-pointer focus:ring-2 focus:ring-blue-500"
                      >
                         <option value="M">M</option>
                         <option value="F">F</option>
                         <option value="O">O</option>
                      </select>
                      <button 
                        onClick={() => {
                          const nw = [...previewStudents];
                          nw.splice(idx, 1);
                          setPreviewStudents(nw);
                        }}
                        className="text-slate-500 hover:text-red-400 p-1 transition-colors"
                      >
                        <Trash2 className="w-4 h-4"/>
                      </button>
                    </div>
                  ))}
                </div>
                <div className="mt-4 sticky bottom-0 bg-slate-950/90 pt-2 pb-1">
                  <button 
                    onClick={savePreview}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white rounded-xl py-4 font-bold active:scale-95 transition-transform shadow-xl shadow-blue-600/30"
                  >
                    Confirmar Importación
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 space-y-4 overflow-y-auto">
                <div className="bg-blue-950/40 border border-blue-900/60 rounded-2xl p-4 relative overflow-hidden">
                   <div className="absolute -top-4 -right-4 p-3 opacity-10">
                      <Sparkles className="w-24 h-24 text-blue-400" />
                   </div>
                   <h4 className="font-black text-blue-300 mb-1 text-sm flex items-center gap-2 relative z-10">
                     <Sparkles className="w-4 h-4" /> Importación Inteligente
                   </h4>
                   <p className="text-xs text-blue-200 font-medium leading-relaxed max-w-[85%] relative z-10">
                     Sube un <span className="font-bold text-white">PDF, Word, Excel o Texto</span>. La IA extraerá los nombres y asignará el género automáticamente.
                   </p>
                   
                   <label className={`mt-4 relative z-10 flex items-center justify-center p-3 bg-blue-900/60 rounded-xl border border-blue-700/80 cursor-pointer font-bold text-sm text-blue-200 shadow-sm transition-all hover:bg-blue-800 ${isProcessingAI ? 'opacity-50 pointer-events-none' : 'active:scale-95'}`}>
                      {isProcessingAI ? (
                         <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analizando Archivo...</>
                      ) : (
                         <><FileUp className="w-4 h-4 mr-2"/> Elegir Archivo</>
                      )}
                      <input type="file" accept=".pdf,.txt,.csv,.xlsx,.xls,.docx" className="hidden" disabled={isProcessingAI} onChange={handleFileUpload} />
                   </label>
                </div>
                
                <div className="flex items-center gap-4 my-2">
                  <div className="flex-1 h-px bg-slate-800"></div>
                  <div className="text-center font-bold text-slate-400 text-xs uppercase tracking-widest">O pega el texto</div>
                  <div className="flex-1 h-px bg-slate-800"></div>
                </div>

                <div className="space-y-3">
                  <textarea 
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-2xl p-3 h-32 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500 font-mono resize-none transition-all placeholder:text-slate-600"
                    placeholder="Juan Perez, M&#10;Ana Gomez, F&#10;..."
                    value={importText}
                    onChange={e => setImportText(e.target.value)}
                  />
                  <button 
                    onClick={handleTextImport}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white rounded-xl py-3 font-bold active:scale-95 transition-all shadow-md shadow-blue-600/30"
                  >
                    Extraer de Texto
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {!showHistory && (
        <div className="flex-1 p-4 pb-24 overflow-y-auto">
          {course.students.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 py-12">
              <User className="w-12 h-12 mb-3 opacity-20" />
              <p className="font-medium">No hay estudiantes en la lista.</p>
              <button onClick={() => setNewMode(true)} className="mt-4 text-blue-400 font-semibold underline">Agregar Estudiantes</button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* INTERRUPTOR PRINCIPAL PARA REACTIVAR TODOS LOS ESTUDIANTES */}
              <div className={cn(
                "p-4 rounded-3xl border transition-all shadow-md flex items-center justify-between gap-4",
                inactiveCount > 0 
                  ? "bg-[#140e06] border-amber-500/40 shadow-amber-950/20" 
                  : "bg-[#07130b] border-emerald-500/40 shadow-[0_0_20px_rgba(16,233,86,0.12)]"
              )}>
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className={cn(
                    "w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 transition-colors border",
                    allActive 
                      ? "bg-emerald-500/20 border-emerald-500/60 text-emerald-400 shadow-[0_0_12px_rgba(16,233,86,0.3)]" 
                      : "bg-amber-500/20 border-amber-500/60 text-amber-400"
                  )}>
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm sm:text-base font-black text-white">
                        {allActive ? "Todos los estudiantes presentes" : "Reactivar todos los estudiantes"}
                      </span>
                      {inactiveCount > 0 ? (
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/25 text-amber-300 font-black border border-amber-500/40">
                          {inactiveCount} apagados
                        </span>
                      ) : (
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-black border border-emerald-500/40 shadow-[0_0_8px_rgba(16,233,86,0.2)]">
                          {activeCount}/{totalCount} presentes
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {inactiveCount > 0 
                        ? "Toca el interruptor para reactivar a todos después de haberlos apagado" 
                        : "Todos los estudiantes están activos para el sorteo"}
                    </p>
                  </div>
                </div>

                <button 
                  type="button"
                  onClick={() => {
                    const nextState = !allActive;
                    setAllStudentsActive(courseId, nextState);
                    showToast(nextState ? '✅ ¡Todos los estudiantes reactivados!' : 'Todos los estudiantes apagados');
                  }}
                  className={cn(
                    "w-14 h-8 rounded-full transition-all flex items-center relative box-border flex-shrink-0 cursor-pointer shadow-md active:scale-95",
                    allActive ? "bg-emerald-500 neon-glow-green" : "bg-slate-800 border border-slate-700 hover:border-slate-500"
                  )}
                  title={allActive ? "Apagar todos los estudiantes" : "Reactivar todos los estudiantes"}
                  aria-label="Interruptor para reactivar todos los estudiantes"
                >
                  <span className={cn(
                    "w-6 h-6 bg-white rounded-full transition-all absolute shadow-md",
                    allActive ? "left-7" : "left-1"
                  )} />
                </button>
              </div>

              <div>
                <div className="px-1 pb-2 flex justify-between items-center">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">
                    Estudiantes ({totalCount})
                  </span>
                  <div className="flex items-center gap-2 pr-1">
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      {allActive ? 'Todos activos' : `${activeCount}/${totalCount}`}
                    </span>
                    <button 
                      type="button"
                      onClick={() => {
                        const nextState = !allActive;
                        setAllStudentsActive(courseId, nextState);
                        showToast(nextState ? '✅ ¡Todos los estudiantes reactivados!' : 'Todos los estudiantes apagados');
                      }}
                      className={cn(
                        "w-12 h-6 rounded-full transition-colors flex items-center relative box-border cursor-pointer shadow-inner active:scale-95",
                        allActive ? "bg-emerald-500 neon-glow-green-sm" : "bg-slate-800 border border-slate-700"
                      )}
                      title={allActive ? "Apagar todos" : "Reactivar todos los estudiantes"}
                      aria-label="Reactivar todos los estudiantes"
                    >
                      <span className={cn(
                        "w-4 h-4 bg-white rounded-full transition-all absolute shadow-sm",
                        allActive ? "left-7" : "left-1"
                      )} />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {course.students.map((student, i) => (
                  <div 
                    key={student.id} 
                    onClick={() => {
                      if (isTeacherMode) {
                        const current = student.reservedGroup || 0;
                        const isLeader = student.leaderCandidate || false;
                        
                        // Ciclo: 0(None) -> 1 -> 2 -> 3 -> 4 -> 5(Leader) -> 0
                        if (!isLeader && current < 4) {
                          updateStudent(courseId, student.id, { reservedGroup: (current + 1) as any, leaderCandidate: false });
                        } else if (!isLeader && current === 4) {
                          updateStudent(courseId, student.id, { reservedGroup: 0, leaderCandidate: true });
                        } else {
                          updateStudent(courseId, student.id, { reservedGroup: 0, leaderCandidate: false });
                        }
                      }
                    }}
                    className={cn(
                      "flex items-center justify-between p-4 border rounded-2xl transition-all cursor-default relative overflow-hidden",
                      !student.isActive ? 'bg-slate-950/50 opacity-40 border-slate-900' : 'bg-[#0b101b] border-slate-800/90 shadow-sm hover:border-amber-400/40',
                      isTeacherMode && (student.reservedGroup || student.leaderCandidate) ? 'border-amber-500 ring-1 ring-amber-500/50 bg-amber-950/20' : ''
                    )}
                  >
                    {isTeacherMode && student.leaderCandidate && (
                      <div className="absolute top-0 right-0 p-1 bg-amber-500 text-slate-950 font-bold rounded-bl-lg">
                        <Star className="w-3 h-3 fill-slate-950" />
                      </div>
                    )}
                    
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className={`relative flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-xs font-black ${student.gender === 'M' ? 'bg-blue-950 text-blue-400 border border-blue-800/60' : student.gender === 'F' ? 'bg-pink-950 text-pink-400 border border-pink-800/60' : 'bg-slate-800 text-slate-300 border border-slate-700'}`}>
                        {student.gender}
                        {isTeacherMode && student.reservedGroup && student.reservedGroup > 0 && (
                          <div className={cn(
                            "absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full border border-slate-900 animate-in zoom-in",
                            student.reservedGroup === 1 && "bg-rose-500",
                            student.reservedGroup === 2 && "bg-blue-500",
                            student.reservedGroup === 3 && "bg-emerald-500",
                            student.reservedGroup === 4 && "bg-amber-500"
                          )} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0 pr-2">
                        <div className={`text-base font-bold break-words leading-snug ${!student.isActive ? 'text-slate-500 line-through decoration-slate-600' : 'text-slate-100'}`}>{student.name}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 flex-shrink-0 pl-2">
                      <button 
                        onClick={() => setStudentToDelete({ id: student.id, name: student.name })}
                        className="p-2.5 -mr-1 text-slate-500 hover:text-red-400 transition-colors rounded-xl hover:bg-slate-800 min-w-[40px] min-h-[40px] flex items-center justify-center"
                        title="Eliminar estudiante"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => toggleStudentActive(courseId, student.id)}
                        className={`w-13 h-7 rounded-full transition-colors flex items-center relative box-border ${student.isActive ? 'bg-emerald-500 neon-glow-green-sm' : 'bg-slate-800 border border-slate-700'}`}
                        title={student.isActive ? "Desactivar (ausente/lesionado)" : "Activar estudiante"}
                      >
                        <span className={`w-5 h-5 bg-white rounded-full transition-all absolute shadow-sm ${student.isActive ? 'left-7' : 'left-1'}`} />
                      </button>
                    </div>

                  </div>
                ))}
                </div>
              </div>

              {isTeacherMode && (
            <div className="flex gap-2 p-3 mt-4 bg-blue-950/40 rounded-2xl border border-blue-900/60 text-blue-300 items-start animate-in fade-in slide-in-from-top-2">
               <Shield className="w-5 h-5 flex-shrink-0 mt-0.5 text-blue-400" />
               <div className="text-xs font-medium space-y-1">
                 <p><b className="text-white">Modo Reservado:</b> Haz clic en los alumnos para asignarles un color. Los estudiantes del mismo color se intentarán separar en grupos diferentes.</p>
                 <div className="flex flex-wrap gap-3 pt-1">
                   <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-rose-500" /> Célula 1</span>
                   <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500" /> Célula 2</span>
                   <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500" /> Célula 3</span>
                   <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-500" /> Célula 4</span>
                   <span className="flex items-center gap-1 border-l pl-3 ml-1 border-blue-800"><Star className="w-3 h-3 text-amber-400 fill-amber-400" /> Capitán</span>
                 </div>
               </div>
            </div>
          )}
          
          <div className="flex gap-2 p-3 mt-4 bg-amber-950/30 rounded-2xl border border-amber-900/60 text-amber-300 items-start">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-400" />
            <div className="text-xs font-medium leading-relaxed flex-1">
              <p>Apaga el interruptor verde para excluir temporalmente a estudiantes que estén ausentes o lesionados hoy. <b className="text-white">No</b> se borrarán de la lista, pero no entrarán al sorteo.</p>
              {inactiveCount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setAllStudentsActive(courseId, true);
                    showToast('✅ ¡Todos los estudiantes reactivados!');
                  }}
                  className="mt-2 text-xs font-bold text-emerald-400 hover:text-emerald-300 underline flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Reactivar todos los estudiantes ({inactiveCount} apagados)
                </button>
              )}
            </div>
          </div>

          {/* Botón flotante para generar grupos */}
          <div className="sticky bottom-0 bg-gradient-to-t from-[#080c14] via-[#080c14]/95 to-transparent pt-4 pb-2 mt-4">
            <button 
              onClick={() => onNavigate('generator', courseId)}
              disabled={activeCount === 0}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 py-4 px-6 rounded-2xl font-black text-base sm:text-lg flex items-center justify-center gap-2.5 shadow-xl shadow-emerald-500/30 neon-glow-green active:scale-[0.98] transition-all disabled:opacity-30 disabled:bg-slate-800 disabled:text-slate-500 min-h-[52px] cursor-pointer"
            >
              <Users className="w-5 h-5 stroke-[2.5]" />
              <span>Sorteo de Grupos ({activeCount} Presentes)</span>
            </button>
          </div>
        </div>
      )}

          {/* Dialogo de eliminación */}
          {studentToDelete && (
            <div className="fixed inset-0 z-[60] bg-slate-950/80 backdrop-blur-sm p-4 flex items-center justify-center">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm p-6 shadow-2xl animate-in fade-in zoom-in-95 text-slate-100">
                <div className="w-12 h-12 bg-red-950/60 border border-red-800/60 text-red-400 rounded-full flex items-center justify-center mb-4 mx-auto">
                  <Trash2 className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-center text-white mb-2">Eliminar estudiante</h3>
                <p className="text-slate-400 text-center mb-6 text-sm">
                  ¿Estás seguro de que deseas eliminar a <span className="font-bold text-white">{studentToDelete.name}</span>? Esta acción no se puede deshacer.
                </p>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setStudentToDelete(null)}
                    className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-colors border border-slate-700"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={() => {
                      deleteStudent(courseId, studentToDelete.id);
                      setStudentToDelete(null);
                    }}
                    className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-colors shadow-lg shadow-red-600/30"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {showHistory && <HistoryView courseId={courseId} />}
    </div>
  );
}

function HistoryView({ courseId }: { courseId: string }) {
  const { histories, deleteHistory, courses } = useAppStore();
  const [historyToDelete, setHistoryToDelete] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const course = courses.find(c => c.id === courseId);
  const courseHistories = histories.filter(h => h.courseId === courseId);

  const handleShareHistory = async (history: any) => {
    const courseName = course?.name || 'Curso';
    const dateStr = new Date(history.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    let text = `⚽ *GRUPOS GUARDADOS - ${courseName.toUpperCase()}*\n📅 ${dateStr} • ${history.groups.length} Equipos\n\n`;
    
    history.groups.forEach((g: any[], i: number) => {
      const name = history.groupNames?.[i] || `Grupo ${i + 1}`;
      text += `🏆 *${name}* (${g.length} integrantes):\n`;
      g.forEach((student: any) => {
        text += `  • ${student.name}\n`;
      });
      text += `\n`;
    });

    text += `Generado con WLSPORTS Groups`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Grupos - ${courseName}`,
          text: text
        });
        return;
      } catch (err) {
        // Fallback
      }
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(history.id);
      setTimeout(() => setCopiedId(null), 2500);
    } catch (e) {
      // ignore
    }
  };

  if (courseHistories.length === 0) {
    return (
      <div className="flex-1 p-8 flex flex-col items-center justify-center text-slate-500 text-center">
        <History className="w-12 h-12 mb-3 opacity-20" />
        <p className="font-medium">No hay historial guardado para este curso.</p>
      </div>
    );
  }

  return (
    <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-24 overflow-y-auto bg-[#0d111c] flex-1">
      {courseHistories.map(history => (
        <div key={history.id} className="bg-slate-900 rounded-3xl p-4 border border-slate-800 shadow-md">
          <div className="flex justify-between items-start mb-3 border-b border-slate-800 pb-3">
             <div>
               <div className="font-bold text-white">{new Date(history.date).toLocaleDateString()} {new Date(history.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
               <div className="text-xs text-blue-400 uppercase mt-1 tracking-wider font-semibold">{history.groups.length} Grupos • Modo: {history.config.mode.replace('_', ' ')}</div>
             </div>
             <div className="flex items-center gap-1">
               <button 
                 onClick={() => handleShareHistory(history)} 
                 className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-xl transition-colors"
                 title="Compartir o copiar por WhatsApp"
               >
                 {copiedId === history.id ? (
                   <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                 ) : (
                   <Share2 className="w-4 h-4" />
                 )}
               </button>
               <button 
                 onClick={() => setHistoryToDelete(history.id)} 
                 className="p-2 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded-xl transition-colors"
                 title="Eliminar del historial"
               >
                 <Trash2 className="w-4 h-4" />
               </button>
             </div>
          </div>
          
          <div className="space-y-3">
            {history.groups.map((g, i) => (
              <div key={i}>
                <div className="text-xs font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                  {history.groupNames?.[i] || `Grupo ${i + 1}`}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {g.map(s => (
                    <span key={s.id} className="inline-block bg-slate-800 text-slate-200 border border-slate-700/60 text-xs px-2.5 py-1 rounded-lg font-medium">
                      {s.name}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Dialogo de eliminación de historial */}
      {historyToDelete && (
        <div className="fixed inset-0 z-[60] bg-slate-950/80 backdrop-blur-sm p-4 flex items-center justify-center">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm p-6 shadow-2xl animate-in fade-in zoom-in-95 text-slate-100">
            <div className="w-12 h-12 bg-red-950/60 border border-red-800/60 text-red-400 rounded-full flex items-center justify-center mb-4 mx-auto">
               <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-center text-white mb-2">Eliminar registro</h3>
            <p className="text-slate-400 text-center mb-6 text-sm">
              ¿Estás seguro de que deseas eliminar este registro del historial? Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3">
               <button 
                 onClick={() => setHistoryToDelete(null)}
                 className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-colors border border-slate-700"
               >
                 Cancelar
               </button>
               <button 
                 onClick={() => {
                   deleteHistory(historyToDelete);
                   setHistoryToDelete(null);
                 }}
                 className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-colors shadow-lg shadow-red-600/30"
               >
                 Eliminar
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
