export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';

export interface HistoryEntry {
  index: number;
  prevValue: number;
  prevNotes: number[];
}

export interface GameState {
  difficulty: Difficulty;
  givens: number[];
  solution: number[];
  values: number[];
  notes: number[][];
  selected: number | null;
  history: HistoryEntry[];
  notesMode: boolean;
  elapsedSeconds: number;
  isComplete: boolean;
  startedAt: number;
}

export type Theme = 'light' | 'dark';

export interface Settings {
  showRemaining: boolean;
  colorAssists: boolean;
  theme: Theme;
}
