import type { GameState, Settings } from '../sudoku/types';

const GAME_KEY = 'sudoku:v1:game';
const SETTINGS_KEY = 'sudoku:v1:settings';

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

const DEFAULT_SETTINGS: Settings = { showRemaining: true, colorAssists: true };

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
}
