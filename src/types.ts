export type Gender = 'M' | 'F' | 'O';

export interface Student {
  id: string;
  name: string;
  gender: Gender;
  listNumber?: string;
  notes?: string;
  isActive: boolean; // Controla si está excluido temporalmente
  reservedGroup?: number; // 0=None, 1=Red, 2=Blue, 3=Green, 4=Yellow
  leaderCandidate?: boolean; // Para "Anti-Capitanes"
}

export interface Match {
  id: string;
  teamA: string; // ID del Grupo o nombre
  teamB: string;
  scoreA?: number;
  scoreB?: number;
  winnerId?: string;
  round?: number; // Para eliminatorias
  status: 'pending' | 'finished';
}

export interface Tournament {
  id: string;
  courseId: string;
  name: string;
  type: 'round_robin' | 'elimination' | 'groups_playoffs';
  teams: { id: string; name: string; memberIds: string[] }[];
  matches: Match[];
  createdAt: number;
  config?: {
    rounds: number;
    groups?: number;
    advancingCount?: number;
  };
}

export interface Course {
  id: string;
  name: string;
  students: Student[];
  createdAt: number;
  folderId?: string;
}

export interface Folder {
  id: string;
  name: string;
  createdAt: number;
}

export interface GroupConfig {
  mode: 'random' | 'balanced_mixed' | 'men_only' | 'women_only' | 'balanced_gender' | 'separated_gender';
  type: 'by_count' | 'by_size';
  value: number;
}

export interface GroupResult {
  id: string;
  courseId: string;
  date: number;
  config: GroupConfig;
  groups: Student[][];
}
