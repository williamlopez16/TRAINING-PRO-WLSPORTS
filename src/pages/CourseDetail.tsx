import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { ChevronLeft, Plus, FileUp, Edit2, Check, User, Trash2, X, AlertCircle, History, Sparkles, Loader2 } from 'lucide-react';
import { View } from '../App';
import { Gender, Student } from '../types';
import Papa from 'papaparse';
import * as pdfjsLib from 'pdfjs-dist';
import PdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?worker';

const worker = new PdfWorker();
pdfjsLib.GlobalWorkerOptions.workerPort = worker;

interface CourseDetailProps {
  courseId: string;
  onNavigate: (view: View, courseId?: string) => void;
}

export function CourseDetail({ courseId, onNavigate }: CourseDetailProps) {
  const { courses, folders, addStudent, updateStudent, deleteStudent, toggleStudentActive, addMultipleStudents } = useAppStore();
  const course = courses.find(c => c.id === courseId);
  const folder = folders?.find(f => f.id === course?.folderId);
  
  const [showImport, setShowImport] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [importText, setImportText] = useState('');
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [previewStudents, setPreviewStudents] = useState<Pick<Student, 'name'|'gender'|'notes'>[]>([]);
  
  const [newMode, setNewMode] = useState(false);
  const [name, setName] = useState('');
  const [gender, setGender] = useState<Gender>('O');
  const [studentToDelete, setStudentToDelete] = useState<{id: string, name: string} | null>(null);

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

  return (
    <div className="flex-1 flex flex-col bg-slate-50 min-h-screen">
      <header className="bg-white px-4 py-4 flex items-center justify-between border-b border-slate-100 sticky top-0 z-10">
        <button onClick={() => onNavigate('home')} className="p-2 -ml-2 text-slate-500 hover:text-slate-900 transition-colors">
          <ChevronLeft className="w-7 h-7" />
        </button>
        <div className="flex-1 px-4">
          <h1 className="text-xl font-bold text-slate-900 truncate flex items-center gap-2">
            {course.name}
            {folder && <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">{folder.name}</span>}
          </h1>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{activeCount} presentes / {course.students.length} total</p>
        </div>
        <button onClick={() => setNewMode(!newMode)} className="bg-slate-900 text-white p-2 rounded-xl transition-transform active:scale-95">
          {newMode ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
        </button>
      </header>

      {/* Selector de Tabs Básido */}
      <div className="flex bg-white border-b border-slate-200">
         <button onClick={() => setShowHistory(false)} className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${!showHistory ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400'}`}>Estudiantes</button>
         <button onClick={() => setShowHistory(true)} className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors flex items-center justify-center gap-2 ${showHistory ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400'}`}><History className="w-4 h-4"/> Historial Grupos</button>
      </div>

      {!showHistory && newMode && (
        <div className="bg-white p-4 border-b border-slate-200 shadow-sm">
          <form onSubmit={handleManualAdd} className="space-y-4">
            <input
              autoFocus
              type="text"
              placeholder="Nombre del estudiante"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-100 border-none rounded-xl px-4 py-3 font-medium focus:ring-2 focus:ring-slate-900"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setGender('M')}
                className={`flex-1 py-3 rounded-xl font-semibold border ${gender === 'M' ? 'bg-blue-100 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-500'}`}
              >
                M
              </button>
              <button
                type="button"
                onClick={() => setGender('F')}
                className={`flex-1 py-3 rounded-xl font-semibold border ${gender === 'F' ? 'bg-pink-100 border-pink-200 text-pink-700' : 'bg-white border-slate-200 text-slate-500'}`}
              >
                F
              </button>
              <button
                type="submit"
                disabled={!name.trim()}
                className="flex-[2] bg-slate-900 text-white py-3 rounded-xl font-bold disabled:opacity-50"
              >
                Agregar
              </button>
            </div>
            
            <div className="pt-2">
              <button type="button" onClick={() => {setShowImport(true); setNewMode(false);}} className="w-full py-3 text-sm font-semibold text-slate-500 border border-slate-200 rounded-xl flex justify-center items-center gap-2 hover:bg-slate-50 active:bg-slate-100">
                <FileUp className="w-4 h-4" /> Importar Lista (Excel / Texto)
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Import Modal */}
      {showImport && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm p-4 flex items-center justify-center">
          <div className="bg-white rounded-3xl w-full max-w-sm flex flex-col shadow-2xl overflow-hidden max-h-[90vh]">
            <div className="flex justify-between items-center p-4 border-b border-slate-100 flex-shrink-0">
              <h3 className="font-bold text-slate-900">Importar Estudiantes</h3>
              <button onClick={() => { setShowImport(false); setPreviewStudents([]); setImportText(''); }} className="p-2 text-slate-400 hover:text-slate-900 bg-slate-100 rounded-full transition-colors active:scale-95">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {previewStudents.length > 0 ? (
              <div className="flex-1 overflow-y-auto p-4 flex flex-col bg-slate-50">
                <div className="text-sm font-medium text-slate-500 mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-500" />
                  Revisa y corrige ({previewStudents.length} encontrados)
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
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
                           className="w-full text-sm font-semibold outline-none text-slate-900 focus:text-blue-600 transition-colors"
                        />
                      </div>
                      <select 
                         value={ps.gender || 'O'} 
                         onChange={(e) => {
                             const nw = [...previewStudents];
                             nw[idx].gender = e.target.value as Gender;
                             setPreviewStudents(nw);
                         }}
                         className="text-xs font-bold bg-slate-100 border-none rounded-lg py-2 px-1 outline-none cursor-pointer focus:ring-2 focus:ring-slate-900"
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
                        className="text-slate-300 hover:text-red-500 p-1 transition-colors"
                      >
                        <Trash2 className="w-4 h-4"/>
                      </button>
                    </div>
                  ))}
                </div>
                <div className="mt-4 sticky bottom-0 bg-slate-50 pt-2 pb-1">
                  <button 
                    onClick={savePreview}
                    className="w-full bg-slate-900 text-white rounded-xl py-4 font-bold active:scale-95 transition-transform shadow-xl shadow-slate-900/20"
                  >
                    Confirmar Importación
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 space-y-4 overflow-y-auto">
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 relative overflow-hidden">
                   <div className="absolute -top-4 -right-4 p-3 opacity-10">
                      <Sparkles className="w-24 h-24 text-blue-600" />
                   </div>
                   <h4 className="font-black text-blue-900 mb-1 text-sm flex items-center gap-2 relative z-10">
                     <Sparkles className="w-4 h-4" /> Importación Inteligente
                   </h4>
                   <p className="text-xs text-blue-800 font-medium leading-relaxed max-w-[85%] relative z-10">
                     Sube un <span className="font-bold">PDF, Word, Excel o Texto</span>. La IA extraerá los nombres y asignará el género automáticamente.
                   </p>
                   
                   <label className={`mt-4 relative z-10 flex items-center justify-center p-3 bg-white rounded-xl border border-blue-200 cursor-pointer font-bold text-sm text-blue-700 shadow-sm transition-all hover:bg-blue-100 ${isProcessingAI ? 'opacity-50 pointer-events-none' : 'active:scale-95 hover:border-blue-300'}`}>
                      {isProcessingAI ? (
                         <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analizando Archivo...</>
                      ) : (
                         <><FileUp className="w-4 h-4 mr-2"/> Elegir Archivo</>
                      )}
                      <input type="file" accept=".pdf,.txt,.csv,.xlsx,.xls,.docx" className="hidden" disabled={isProcessingAI} onChange={handleFileUpload} />
                   </label>
                </div>
                
                <div className="flex items-center gap-4 my-2">
                  <div className="flex-1 h-px bg-slate-100"></div>
                  <div className="text-center font-bold text-slate-300 text-[10px] uppercase tracking-widest">O pega el texto</div>
                  <div className="flex-1 h-px bg-slate-100"></div>
                </div>

                <div className="space-y-3">
                  <textarea 
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 h-32 text-sm outline-none focus:ring-2 focus:ring-slate-900 font-mono resize-none transition-all placeholder:text-slate-300"
                    placeholder="Juan Perez, M&#10;Ana Gomez, F&#10;..."
                    value={importText}
                    onChange={e => setImportText(e.target.value)}
                  />
                  <button 
                    onClick={handleTextImport}
                    className="w-full bg-slate-900 text-white rounded-xl py-3 font-bold active:scale-95 transition-transform"
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
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <User className="w-12 h-12 mb-3 opacity-20" />
              <p className="font-medium">No hay estudiantes en la lista.</p>
              <button onClick={() => setNewMode(true)} className="mt-4 text-slate-900 font-semibold unerline">Agregar Estudiantes</button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="px-1 pb-2 flex justify-between items-center bg-slate-50">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Estudiante</span>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest pr-2">Presente</span>
              </div>
              <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                {course.students.map((student, i) => (
                  <div key={student.id} className={`flex items-center justify-between p-4 border-b border-slate-100 last:border-0 ${!student.isActive ? 'bg-slate-50' : 'bg-white'}`}>
                    
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${student.gender === 'M' ? 'bg-blue-100 text-blue-700' : student.gender === 'F' ? 'bg-pink-100 text-pink-700' : 'bg-slate-200 text-slate-600'}`}>
                        {student.gender}
                      </div>
                      <div className="flex-1 truncate">
                        <div className={`font-semibold truncate ${!student.isActive ? 'text-slate-400 line-through decoration-slate-300' : 'text-slate-900'}`}>{student.name}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 flex-shrink-0 pl-2">
                      <button 
                        onClick={() => setStudentToDelete({ id: student.id, name: student.name })}
                        className="p-2 -mr-2 text-slate-300 hover:text-red-500 transition-colors"
                        title="Eliminar estudiante"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => toggleStudentActive(courseId, student.id)}
                        className={`w-12 h-7 rounded-full transition-colors flex items-center relative box-border ${student.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`}
                      >
                        <span className={`w-5 h-5 bg-white rounded-full transition-all absolute shadow-sm ${student.isActive ? 'left-6' : 'left-1'}`} />
                      </button>
                    </div>

                  </div>
                ))}
              </div>
              <div className="flex gap-2 p-2 mt-4 bg-amber-50 rounded-2xl border border-amber-200 text-amber-700 items-start">
                 <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 opacity-60" />
                 <p className="text-xs font-medium">Apaga el interruptor verde para excluir temporalmente a estudiantes que estén ausentes o lesionados hoy. <b>No</b> se borrarán de la lista, pero no entrarán al sorteo.</p>
              </div>
            </div>
          )}

          {/* Dialogo de eliminación */}
          {studentToDelete && (
            <div className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm p-4 flex items-center justify-center">
              <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl animate-in fade-in zoom-in-95">
                <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4 mx-auto">
                  <Trash2 className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-center text-slate-900 mb-2">Eliminar estudiante</h3>
                <p className="text-slate-500 text-center mb-6">
                  ¿Estás seguro de que deseas eliminar a <span className="font-bold text-slate-700">{studentToDelete.name}</span>? Esta acción no se puede deshacer.
                </p>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setStudentToDelete(null)}
                    className="flex-1 py-3 px-4 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={() => {
                      deleteStudent(courseId, studentToDelete.id);
                      setStudentToDelete(null);
                    }}
                    className="flex-1 py-3 px-4 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20"
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
  const { histories, deleteHistory } = useAppStore();
  const [historyToDelete, setHistoryToDelete] = useState<string | null>(null);
  const courseHistories = histories.filter(h => h.courseId === courseId);

  if (courseHistories.length === 0) {
    return (
      <div className="flex-1 p-8 flex flex-col items-center justify-center text-slate-400 text-center">
        <History className="w-12 h-12 mb-3 opacity-20" />
        <p className="font-medium">No hay historial guardado para este curso.</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 pb-24 overflow-y-auto bg-slate-50 flex-1">
      {courseHistories.map(history => (
        <div key={history.id} className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-3 border-b border-slate-100 pb-3">
             <div>
               <div className="font-bold text-slate-900">{new Date(history.date).toLocaleDateString()} {new Date(history.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
               <div className="text-xs text-slate-500 uppercase mt-1 tracking-wider font-semibold">{history.groups.length} Grupos • Modo: {history.config.mode.replace('_', ' ')}</div>
             </div>
             <button onClick={() => setHistoryToDelete(history.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
               <Trash2 className="w-4 h-4" />
             </button>
          </div>
          
          <div className="space-y-3">
            {history.groups.map((g, i) => (
              <div key={i}>
                <div className="text-xs font-bold text-slate-400 mb-1">Grupo {i + 1}</div>
                <div className="flex flex-wrap gap-1.5">
                  {g.map(s => (
                    <span key={s.id} className="inline-block bg-slate-100 text-slate-700 text-xs px-2 py-1 rounded-lg font-medium">
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
        <div className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm p-4 flex items-center justify-center">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4 mx-auto">
               <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-center text-slate-900 mb-2">Eliminar registro</h3>
            <p className="text-slate-500 text-center mb-6">
              ¿Estás seguro de que deseas eliminar este registro del historial? Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3">
               <button 
                 onClick={() => setHistoryToDelete(null)}
                 className="flex-1 py-3 px-4 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
               >
                 Cancelar
               </button>
               <button 
                 onClick={() => {
                   deleteHistory(historyToDelete);
                   setHistoryToDelete(null);
                 }}
                 className="flex-1 py-3 px-4 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20"
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
