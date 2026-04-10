export type Role = 'coach' | 'athlete';

export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: Role;
  photoURL: string | null;
}

export interface Athlete {
  id: string;
  coachId: string;
  name: string;
  email?: string;
  birthDate?: string;
  category?: string;
  createdAt: number;
}

export type ExerciseType = 'Físico' | 'Técnico' | 'Táctico' | 'Mixto';
export type ExerciseLevel = 'Principiante' | 'Intermedio' | 'Avanzado';

export interface Exercise {
  id: string;
  coachId: string;
  name: string;
  description: string;
  type: ExerciseType;
  level: ExerciseLevel;
  durationOrReps: string;
  videoUrl?: string;
  createdAt: number;
}

export interface Session {
  id: string;
  coachId: string;
  athleteId: string;
  title: string;
  date: number;
  exercises: {
    exerciseId: string;
    order: number;
    notes?: string;
  }[];
  completed: boolean;
  createdAt: number;
}

export interface Challenge {
  id: string;
  coachId: string;
  title: string;
  description: string;
  level: number;
  videoUrl?: string;
  createdAt: number;
}

export interface Tournament {
  id: string;
  coachId: string;
  name: string;
  status: 'active' | 'completed';
  players: {
    athleteId: string;
    points: number;
  }[];
  matches: {
    id: string;
    date: number;
    description: string;
    player1Id: string;
    player2Id: string;
    winnerId?: string; // 'draw' if tie, or athleteId
    status: 'pending' | 'completed';
  }[];
  createdAt: number;
}
