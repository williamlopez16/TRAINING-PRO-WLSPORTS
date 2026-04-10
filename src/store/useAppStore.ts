import { create } from 'zustand';
import { User, Athlete, Exercise, Session, Challenge, Tournament } from '../types';

interface AppState {
  user: User | null;
  athletes: Athlete[];
  exercises: Exercise[];
  sessions: Session[];
  challenges: Challenge[];
  tournaments: Tournament[];
  
  setUser: (user: User | null) => void;
  
  // Mock actions for local state (will be replaced by Firebase calls in a real environment)
  addAthlete: (athlete: Omit<Athlete, 'id' | 'createdAt'>) => void;
  addExercise: (exercise: Omit<Exercise, 'id' | 'createdAt'>) => void;
  addSession: (session: Omit<Session, 'id' | 'createdAt'>) => void;
  addChallenge: (challenge: Omit<Challenge, 'id' | 'createdAt'>) => void;
  addTournament: (tournament: Omit<Tournament, 'id' | 'createdAt'>) => void;
  updateTournament: (id: string, updates: Partial<Tournament>) => void;
}

// Initial mock data for testing
const mockExercises: Exercise[] = [
  { id: '1', coachId: 'coach1', name: 'Pase corto', description: 'Pase a 5 metros con borde interno', type: 'Técnico', level: 'Principiante', durationOrReps: '10 min', createdAt: Date.now() },
  { id: '2', coachId: 'coach1', name: 'Sprint 20m', description: 'Aceleración máxima', type: 'Físico', level: 'Intermedio', durationOrReps: '5 reps', createdAt: Date.now() },
];

const mockAthletes: Athlete[] = [
  { id: 'a1', coachId: 'coach1', name: 'Juan Pérez', category: 'Sub 15', createdAt: Date.now() },
  { id: 'a2', coachId: 'coach1', name: 'María Gómez', category: 'Sub 17', createdAt: Date.now() },
];

export const useAppStore = create<AppState>((set) => ({
  user: null,
  athletes: mockAthletes,
  exercises: mockExercises,
  sessions: [],
  challenges: [
    { id: 'c1', coachId: 'coach1', title: 'Dominadas Nivel 1', description: 'Haz 10 dominadas seguidas', level: 1, videoUrl: 'https://youtube.com/watch?v=123', createdAt: Date.now() }
  ],
  tournaments: [
    { id: 't1', coachId: 'coach1', name: 'Liga Interna', status: 'active', players: [{ athleteId: 'a1', points: 3 }, { athleteId: 'a2', points: 1 }], matches: [], createdAt: Date.now() }
  ],

  setUser: (user) => set({ user }),
  
  addAthlete: (athlete) => set((state) => ({
    athletes: [...state.athletes, { ...athlete, id: Math.random().toString(36).substr(2, 9), createdAt: Date.now() }]
  })),
  
  addExercise: (exercise) => set((state) => ({
    exercises: [...state.exercises, { ...exercise, id: Math.random().toString(36).substr(2, 9), createdAt: Date.now() }]
  })),

  addSession: (session) => set((state) => ({
    sessions: [...state.sessions, { ...session, id: Math.random().toString(36).substr(2, 9), createdAt: Date.now() }]
  })),

  addChallenge: (challenge) => set((state) => ({
    challenges: [...state.challenges, { ...challenge, id: Math.random().toString(36).substr(2, 9), createdAt: Date.now() }]
  })),

  addTournament: (tournament) => set((state) => ({
    tournaments: [...state.tournaments, { ...tournament, id: Math.random().toString(36).substr(2, 9), createdAt: Date.now() }]
  })),

  updateTournament: (id, updates) => set((state) => ({
    tournaments: state.tournaments.map(t => t.id === id ? { ...t, ...updates } : t)
  })),
}));
