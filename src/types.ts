export type Gender = 'M' | 'F' | 'O';

export interface Student {
  id: string;
  name: string;
  gender: Gender;
  listNumber?: string;
  notes?: string;
  isActive: boolean; // Controla si está excluido temporalmente
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
