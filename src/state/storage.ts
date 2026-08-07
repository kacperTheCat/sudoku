import type { Difficulty, GameState, Settings, Stats } from '../sudoku/types';

const GAME_KEY = 'sudoku:v1:game';
const SETTINGS_KEY = 'sudoku:v1:settings';
const STATS_KEY = 'sudoku:v1:stats';
const DAILY_GAME_KEY = 'sudoku:v1:daily-game';
const DAILY_STREAK_KEY = 'sudoku:v1:daily-streak';

export function loadGame(): GameState | null {
  try {
    const raw = localStorage.getItem(GAME_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<GameState>;
    // Older saves (pre move-tracking) lack moveCount — default it in rather
    // than let it stay undefined and poison the +1 arithmetic in applyCellChange.
    return { moveCount: 0, ...parsed } as GameState;
  } catch {
    return null;
  }
}

export function saveGame(state: GameState): void {
  try {
    localStorage.setItem(GAME_KEY, JSON.stringify(state));
  } catch {
    // localStorage unavailable (private mode, full quota) — game stays playable this session
  }
}

export function clearGame(): void {
  try {
    localStorage.removeItem(GAME_KEY);
  } catch {
    // ignore
  }
}

function systemTheme(): Settings['theme'] {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function defaultSettings(): Settings {
  return { showRemaining: true, colorAssists: true, theme: systemTheme() };
}

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return defaultSettings();
    return { ...defaultSettings(), ...(JSON.parse(raw) as Partial<Settings>) };
  } catch {
    return defaultSettings();
  }
}

export function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
}

function defaultStats(): Stats {
  const empty = { gamesCompleted: 0, totalSeconds: 0, totalMoves: 0, bestSeconds: null };
  return { easy: { ...empty }, medium: { ...empty }, hard: { ...empty }, expert: { ...empty } };
}

export function loadStats(): Stats {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return defaultStats();
    const parsed = JSON.parse(raw) as Partial<Record<Difficulty, Partial<Stats[Difficulty]>>>;
    const defaults = defaultStats();
    const merged = defaultStats();
    for (const difficulty of Object.keys(defaults) as Difficulty[]) {
      merged[difficulty] = { ...defaults[difficulty], ...parsed[difficulty] };
    }
    return merged;
  } catch {
    return defaultStats();
  }
}

export function saveStats(stats: Stats): void {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch {
    // ignore
  }
}

export interface StoredDailyGame {
  date: string;
  game: GameState;
}

export function loadDailyGame(): StoredDailyGame | null {
  try {
    const raw = localStorage.getItem(DAILY_GAME_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { date?: string; game?: Partial<GameState> };
    if (!parsed.date || !parsed.game) return null;
    return { date: parsed.date, game: { moveCount: 0, ...parsed.game } as GameState };
  } catch {
    return null;
  }
}

export function saveDailyGame(entry: StoredDailyGame): void {
  try {
    localStorage.setItem(DAILY_GAME_KEY, JSON.stringify(entry));
  } catch {
    // ignore
  }
}

export interface DailyStreak {
  currentStreak: number;
  longestStreak: number;
  lastCompletedDate: string | null;
}

function defaultDailyStreak(): DailyStreak {
  return { currentStreak: 0, longestStreak: 0, lastCompletedDate: null };
}

export function loadDailyStreak(): DailyStreak {
  try {
    const raw = localStorage.getItem(DAILY_STREAK_KEY);
    if (!raw) return defaultDailyStreak();
    return { ...defaultDailyStreak(), ...(JSON.parse(raw) as Partial<DailyStreak>) };
  } catch {
    return defaultDailyStreak();
  }
}

export function saveDailyStreak(streak: DailyStreak): void {
  try {
    localStorage.setItem(DAILY_STREAK_KEY, JSON.stringify(streak));
  } catch {
    // ignore
  }
}
