import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Course, Student, GroupResult, Gender, Folder, Tournament, Match } from '../types';
import { v4 as uuidv4 } from 'uuid';
import initialData from './initialData.json';

interface AppState {
  courses: Course[];
  histories: GroupResult[];
  folders: Folder[];
  tournaments: Tournament[];
  
  // Folders
  addFolder: (name: string) => void;
  updateFolderName: (id: string, name: string) => void;
  deleteFolder: (id: string) => void;

  // Courses
  addCourse: (name: string, folderId?: string) => void;
  updateCourseName: (id: string, name: string) => void;
  deleteCourse: (id: string) => void;
  duplicateCourse: (id: string) => void;
  setCourseFolder: (courseId: string, folderId?: string) => void;
  
  // Students
  addStudent: (courseId: string, student: Omit<Student, 'id' | 'isActive'>) => void;
  addMultipleStudents: (courseId: string, students: Omit<Student, 'id' | 'isActive'>[]) => void;
  updateStudent: (courseId: string, studentId: string, updates: Partial<Student>) => void;
  deleteStudent: (courseId: string, studentId: string) => void;
  toggleStudentActive: (courseId: string, studentId: string) => void;
  
  // History
  saveHistory: (history: GroupResult) => void;
  deleteHistory: (historyId: string) => void;

  // Tournaments
  addTournament: (tournament: Tournament) => void;
  updateMatch: (tournamentId: string, matchId: string, updates: Partial<Match>) => void;
  deleteTournament: (id: string) => void;

  // Import Data
  importData: (courses: Course[], histories: GroupResult[], folders?: Folder[]) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      courses: initialData.courses as Course[] || [],
      histories: initialData.histories as GroupResult[] || [],
      folders: [],
      tournaments: [],

      addFolder: (name: string) => set((state) => ({
        folders: [...(state.folders || []), { id: uuidv4(), name, createdAt: Date.now() }]
      })),

      updateFolderName: (id: string, name: string) => set((state) => ({
        folders: (state.folders || []).map(f => f.id === id ? { ...f, name } : f)
      })),

      deleteFolder: (id: string) => set((state) => ({
        folders: (state.folders || []).filter(f => f.id !== id),
        courses: state.courses.map(c => c.folderId === id ? { ...c, folderId: undefined } : c)
      })),

      addCourse: (name: string, folderId?: string) => set((state) => ({
        courses: [...state.courses, { id: uuidv4(), name, students: [], createdAt: Date.now(), folderId }]
      })),
      
      updateCourseName: (id: string, name: string) => set((state) => ({
        courses: state.courses.map(c => c.id === id ? { ...c, name } : c)
      })),

      deleteCourse: (id: string) => set((state) => ({
        courses: state.courses.filter(c => c.id !== id),
        histories: state.histories.filter(h => h.courseId !== id)
      })),

      duplicateCourse: (id: string) => set((state) => {
        const course = state.courses.find(c => c.id === id);
        if (!course) return state;
        const newCourse: Course = {
          ...course,
          id: uuidv4(),
          name: `${course.name} (Copia)`,
          createdAt: Date.now(),
          students: course.students.map(s => ({ ...s, id: uuidv4() }))
        };
        return { courses: [...state.courses, newCourse] };
      }),

      setCourseFolder: (courseId: string, folderId?: string) => set((state) => ({
        courses: state.courses.map(c => c.id === courseId ? { ...c, folderId } : c)
      })),

      addStudent: (courseId: string, student) => set((state) => ({
        courses: state.courses.map(c => {
          if (c.id === courseId) {
            return {
              ...c,
              students: [...c.students, { ...student, id: uuidv4(), isActive: true }]
            };
          }
          return c;
        })
      })),

      addMultipleStudents: (courseId: string, newStudents) => set((state) => ({
        courses: state.courses.map(c => {
          if (c.id === courseId) {
            const added = newStudents.map(s => ({ ...s, id: uuidv4(), isActive: true }));
            return {
              ...c,
              students: [...c.students, ...added]
            };
          }
          return c;
        })
      })),

      updateStudent: (courseId: string, studentId: string, updates: Partial<Student>) => set((state) => ({
        courses: state.courses.map(c => {
          if (c.id === courseId) {
            return {
              ...c,
              students: c.students.map(s => s.id === studentId ? { ...s, ...updates } : s)
            };
          }
          return c;
        })
      })),

      deleteStudent: (courseId: string, studentId: string) => set((state) => ({
        courses: state.courses.map(c => {
          if (c.id === courseId) {
            return {
              ...c,
              students: c.students.filter(s => s.id !== studentId)
            };
          }
          return c;
        })
      })),

      toggleStudentActive: (courseId: string, studentId: string) => set((state) => ({
        courses: state.courses.map(c => {
          if (c.id === courseId) {
            return {
              ...c,
              students: c.students.map(s => s.id === studentId ? { ...s, isActive: !s.isActive } : s)
            };
          }
          return c;
        })
      })),

      saveHistory: (history: GroupResult) => set((state) => ({
        histories: [history, ...state.histories]
      })),
      
      deleteHistory: (historyId: string) => set((state) => ({
        histories: state.histories.filter(h => h.id !== historyId)
      })),

      addTournament: (tournament: Tournament) => set((state) => ({
        tournaments: [...state.tournaments, tournament]
      })),

      updateMatch: (tournamentId: string, matchId: string, updates: Partial<Match>) => set((state) => ({
        tournaments: state.tournaments.map(t => {
          if (t.id === tournamentId) {
            return {
              ...t,
              matches: t.matches.map(m => m.id === matchId ? { ...m, ...updates } : m)
            };
          }
          return t;
        })
      })),

      deleteTournament: (id: string) => set((state) => ({
        tournaments: state.tournaments.filter(t => t.id !== id)
      })),

      importData: (courses, histories, folders) => set({ courses, histories, folders: folders || [] })
    }),
    {
      name: 'edu-groups-storage',
    }
  )
);
