import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Course, Student, GroupResult, Gender } from '../types';
import { v4 as uuidv4 } from 'uuid';
import initialData from './initialData.json';

interface AppState {
  courses: Course[];
  histories: GroupResult[];
  
  // Courses
  addCourse: (name: string) => void;
  updateCourseName: (id: string, name: string) => void;
  deleteCourse: (id: string) => void;
  duplicateCourse: (id: string) => void;
  
  // Students
  addStudent: (courseId: string, student: Omit<Student, 'id' | 'isActive'>) => void;
  addMultipleStudents: (courseId: string, students: Omit<Student, 'id' | 'isActive'>[]) => void;
  updateStudent: (courseId: string, studentId: string, updates: Partial<Student>) => void;
  deleteStudent: (courseId: string, studentId: string) => void;
  toggleStudentActive: (courseId: string, studentId: string) => void;
  
  // History
  saveHistory: (history: GroupResult) => void;
  deleteHistory: (historyId: string) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      courses: initialData.courses as Course[] || [],
      histories: initialData.histories as GroupResult[] || [],

      addCourse: (name: string) => set((state) => ({
        courses: [...state.courses, { id: uuidv4(), name, students: [], createdAt: Date.now() }]
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
      }))
    }),
    {
      name: 'edu-groups-storage',
    }
  )
);
