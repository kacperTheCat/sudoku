export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';

export type Variant = 'classic' | 'x';

export interface HistoryEntry {
  index: number;
  prevValue: number;
  prevNotes: number[];
}

export interface GameState {
  difficulty: Difficulty;
  variant: Variant;
  givens: number[];
  solution: number[];
  values: number[];
  notes: number[][];
  selected: number | null;
  history: HistoryEntry[];
  notesMode: boolean;
  elapsedSeconds: number;
  moveCount: number;
  isComplete: boolean;
  startedAt: number;
}

export type Theme = 'light' | 'dark';

export interface Settings {
  showRemaining: boolean;
  colorAssists: boolean;
  theme: Theme;
}

export interface DifficultyStats {
  gamesCompleted: number;
  totalSeconds: number;
  totalMoves: number;
}

export type Stats = Record<Difficulty, DifficultyStats>;
