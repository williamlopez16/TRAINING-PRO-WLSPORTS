import { create } from 'zustand';
import { User, Athlete, Exercise, Session, Challenge, Tournament } from '../types';
import { db } from '../lib/firebase';
import { collection, onSnapshot, query, where, addDoc, updateDoc, doc, setDoc } from 'firebase/firestore';

interface AppState {
  user: User | null;
  athletes: Athlete[];
  exercises: Exercise[];
  sessions: Session[];
  challenges: Challenge[];
  tournaments: Tournament[];
  
  setUser: (user: User | null) => void;
  initListeners: (uid: string, role: 'coach' | 'athlete') => () => void;
  
  addAthlete: (athlete: Omit<Athlete, 'id' | 'createdAt'>) => Promise<void>;
  addExercise: (exercise: Omit<Exercise, 'id' | 'createdAt'>) => Promise<void>;
  addSession: (session: Omit<Session, 'id' | 'createdAt'>) => Promise<void>;
  addChallenge: (challenge: Omit<Challenge, 'id' | 'createdAt'>) => Promise<void>;
  addTournament: (tournament: Omit<Tournament, 'id' | 'createdAt'>) => Promise<void>;
  updateTournament: (id: string, updates: Partial<Tournament>) => Promise<void>;
}

// Initial mock data for testing (used only if Firebase is not configured)
const mockExercises: Exercise[] = [
  { id: '1', coachId: 'coach1', name: 'Pase corto', description: 'Pase a 5 metros con borde interno', type: 'Técnico', level: 'Principiante', durationOrReps: '10 min', createdAt: Date.now() },
  { id: '2', coachId: 'coach1', name: 'Sprint 20m', description: 'Aceleración máxima', type: 'Físico', level: 'Intermedio', durationOrReps: '5 reps', createdAt: Date.now() },
];

const mockAthletes: Athlete[] = [
  { id: 'a1', coachId: 'coach1', name: 'Juan Pérez', category: 'Sub 15', createdAt: Date.now() },
  { id: 'a2', coachId: 'coach1', name: 'María Gómez', category: 'Sub 17', createdAt: Date.now() },
];

export const useAppStore = create<AppState>((set, get) => ({
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
  
  initListeners: (uid, role) => {
    if (!db) return () => {}; // Fallback to mock data if no DB

    const unsubs: (() => void)[] = [];
    
    // If coach, listen to their own data. If athlete, listen to their coach's data (simplified for now, athlete listens to all or specific coach)
    // For this implementation, we'll query by coachId for coaches, and for athletes we'll just fetch everything for demo purposes (in production, athlete needs a coachId assigned)
    const coachQuery = role === 'coach' ? where('coachId', '==', uid) : where('coachId', '!=', '');

    unsubs.push(onSnapshot(query(collection(db, 'athletes'), coachQuery), (snap) => {
      set({ athletes: snap.docs.map(d => ({ id: d.id, ...d.data() } as Athlete)) });
    }));
    
    unsubs.push(onSnapshot(query(collection(db, 'exercises'), coachQuery), (snap) => {
      set({ exercises: snap.docs.map(d => ({ id: d.id, ...d.data() } as Exercise)) });
    }));

    unsubs.push(onSnapshot(query(collection(db, 'challenges'), coachQuery), (snap) => {
      set({ challenges: snap.docs.map(d => ({ id: d.id, ...d.data() } as Challenge)) });
    }));

    unsubs.push(onSnapshot(query(collection(db, 'tournaments'), coachQuery), (snap) => {
      set({ tournaments: snap.docs.map(d => ({ id: d.id, ...d.data() } as Tournament)) });
    }));

    return () => unsubs.forEach(unsub => unsub());
  },
  
  addAthlete: async (athlete) => {
    if (db) {
      await addDoc(collection(db, 'athletes'), { ...athlete, createdAt: Date.now() });
    } else {
      set((state) => ({ athletes: [...state.athletes, { ...athlete, id: Math.random().toString(36).substr(2, 9), createdAt: Date.now() }] }));
    }
  },
  
  addExercise: async (exercise) => {
    if (db) {
      await addDoc(collection(db, 'exercises'), { ...exercise, createdAt: Date.now() });
    } else {
      set((state) => ({ exercises: [...state.exercises, { ...exercise, id: Math.random().toString(36).substr(2, 9), createdAt: Date.now() }] }));
    }
  },

  addSession: async (session) => {
    if (db) {
      await addDoc(collection(db, 'sessions'), { ...session, createdAt: Date.now() });
    } else {
      set((state) => ({ sessions: [...state.sessions, { ...session, id: Math.random().toString(36).substr(2, 9), createdAt: Date.now() }] }));
    }
  },

  addChallenge: async (challenge) => {
    if (db) {
      await addDoc(collection(db, 'challenges'), { ...challenge, createdAt: Date.now() });
    } else {
      set((state) => ({ challenges: [...state.challenges, { ...challenge, id: Math.random().toString(36).substr(2, 9), createdAt: Date.now() }] }));
    }
  },

  addTournament: async (tournament) => {
    if (db) {
      await addDoc(collection(db, 'tournaments'), { ...tournament, createdAt: Date.now() });
    } else {
      set((state) => ({ tournaments: [...state.tournaments, { ...tournament, id: Math.random().toString(36).substr(2, 9), createdAt: Date.now() }] }));
    }
  },

  updateTournament: async (id, updates) => {
    if (db) {
      await updateDoc(doc(db, 'tournaments', id), updates);
    } else {
      set((state) => ({ tournaments: state.tournaments.map(t => t.id === id ? { ...t, ...updates } : t) }));
    }
  },
}));
