import type { GameState, Settings, Stats } from '../sudoku/types';

const GAME_KEY = 'sudoku:v1:game';
const SETTINGS_KEY = 'sudoku:v1:settings';
const STATS_KEY = 'sudoku:v1:stats';

export function loadGame(): GameState | null {
  try {
    const raw = localStorage.getItem(GAME_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as GameState;
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
  const empty = { gamesCompleted: 0, totalSeconds: 0 };
  return { easy: { ...empty }, medium: { ...empty }, hard: { ...empty }, expert: { ...empty } };
}

export function loadStats(): Stats {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return defaultStats();
    return { ...defaultStats(), ...(JSON.parse(raw) as Partial<Stats>) };
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
