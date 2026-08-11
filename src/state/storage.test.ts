import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  loadGame,
  saveGame,
  loadSettings,
  saveSettings,
  loadStats,
  saveStats,
  loadDailyGame,
  saveDailyGame,
  loadDailyStreak,
  saveDailyStreak,
} from './storage';
import type { GameState, Stats } from '../sudoku/types';

/** Minimal in-memory Storage implementation — no jsdom needed for this. */
class MemoryStorage implements Storage {
  private store = new Map<string, string>();
  get length() {
    return this.store.size;
  }
  clear(): void {
    this.store.clear();
  }
  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  key(index: number): string | null {
    return [...this.store.keys()][index] ?? null;
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

const originalLocalStorage = globalThis.localStorage;

beforeEach(() => {
  Object.defineProperty(globalThis, 'localStorage', {
    value: new MemoryStorage(),
    configurable: true,
    writable: true,
  });
});

afterEach(() => {
  Object.defineProperty(globalThis, 'localStorage', {
    value: originalLocalStorage,
    configurable: true,
    writable: true,
  });
});

function makeGame(overrides: Partial<GameState> = {}): GameState {
  return {
    difficulty: 'easy',
    variant: 'classic',
    givens: new Array(81).fill(0),
    solution: new Array(81).fill(1),
    values: new Array(81).fill(0),
    notes: Array.from({ length: 81 }, () => []),
    selected: null,
    history: [],
    notesMode: false,
    elapsedSeconds: 0,
    moveCount: 3,
    isComplete: false,
    startedAt: 0,
    ...overrides,
  };
}

describe('game persistence', () => {
  it('returns null when nothing is saved', () => {
    expect(loadGame()).toBeNull();
  });

  it('round-trips a saved game', () => {
    const game = makeGame({ moveCount: 7 });
    saveGame(game);
    expect(loadGame()).toEqual(game);
  });

  it('defaults moveCount to 0 for saves from before it existed', () => {
    const { moveCount, ...legacy } = makeGame();
    void moveCount;
    localStorage.setItem('sudoku:v1:game', JSON.stringify(legacy));
    expect(loadGame()?.moveCount).toBe(0);
  });

  it('returns null for corrupted JSON instead of throwing', () => {
    localStorage.setItem('sudoku:v1:game', '{not valid json');
    expect(loadGame()).toBeNull();
  });

  it('swallows a setItem failure (e.g. quota exceeded) instead of throwing', () => {
    const throwingStorage = {
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    } as unknown as Storage;
    Object.defineProperty(globalThis, 'localStorage', { value: throwingStorage, configurable: true });
    expect(() => saveGame(makeGame())).not.toThrow();
  });
});

describe('settings persistence', () => {
  it('defaults to hints on, counters on when nothing is saved', () => {
    const settings = loadSettings();
    expect(settings.colorAssists).toBe(true);
    expect(settings.showRemaining).toBe(true);
  });

  it('merges a partial saved value over the defaults', () => {
    localStorage.setItem('sudoku:v1:settings', JSON.stringify({ colorAssists: false }));
    const settings = loadSettings();
    expect(settings.colorAssists).toBe(false);
    expect(settings.showRemaining).toBe(true); // untouched default survives
  });

  it('round-trips through save/load', () => {
    saveSettings({ showRemaining: false, colorAssists: false, theme: 'dark' });
    expect(loadSettings()).toEqual({ showRemaining: false, colorAssists: false, theme: 'dark' });
  });
});

describe('stats persistence', () => {
  it('defaults every difficulty to zeroed stats with no best time', () => {
    const stats = loadStats();
    for (const difficulty of ['easy', 'medium', 'hard', 'expert'] as const) {
      expect(stats[difficulty]).toEqual({
        gamesCompleted: 0,
        totalSeconds: 0,
        totalMoves: 0,
        bestSeconds: null,
      });
    }
  });

  it('merges per-difficulty, not shallowly across the whole object', () => {
    // Simulates a save from before totalMoves/bestSeconds existed: only
    // "easy" is present, and it's missing the newer fields entirely.
    const legacy = { easy: { gamesCompleted: 3, totalSeconds: 450 } };
    localStorage.setItem('sudoku:v1:stats', JSON.stringify(legacy));

    const stats = loadStats();
    // The old fields for "easy" must survive...
    expect(stats.easy.gamesCompleted).toBe(3);
    expect(stats.easy.totalSeconds).toBe(450);
    // ...and the fields that didn't exist yet must default in, not stay
    // undefined (a shallow `{...defaults, ...parsed}` would have replaced
    // the whole "easy" object and lost this).
    expect(stats.easy.totalMoves).toBe(0);
    expect(stats.easy.bestSeconds).toBeNull();
    // Difficulties absent from the saved blob entirely still default fully.
    expect(stats.medium).toEqual({
      gamesCompleted: 0,
      totalSeconds: 0,
      totalMoves: 0,
      bestSeconds: null,
    });
  });

  it('round-trips through save/load', () => {
    const stats: Stats = {
      easy: { gamesCompleted: 1, totalSeconds: 100, totalMoves: 20, bestSeconds: 100 },
      medium: { gamesCompleted: 0, totalSeconds: 0, totalMoves: 0, bestSeconds: null },
      hard: { gamesCompleted: 0, totalSeconds: 0, totalMoves: 0, bestSeconds: null },
      expert: { gamesCompleted: 0, totalSeconds: 0, totalMoves: 0, bestSeconds: null },
    };
    saveStats(stats);
    expect(loadStats()).toEqual(stats);
  });
});

describe('daily challenge persistence', () => {
  it('returns null when nothing is saved', () => {
    expect(loadDailyGame()).toBeNull();
  });

  it('round-trips date + game', () => {
    const entry = { date: '2026-08-10', game: makeGame() };
    saveDailyGame(entry);
    expect(loadDailyGame()).toEqual(entry);
  });

  it('defaults moveCount to 0 for a legacy daily save', () => {
    const { moveCount, ...legacyGame } = makeGame();
    void moveCount;
    localStorage.setItem('sudoku:v1:daily-game', JSON.stringify({ date: '2026-08-10', game: legacyGame }));
    expect(loadDailyGame()?.game.moveCount).toBe(0);
  });

  it('returns null when the stored entry is missing date or game', () => {
    localStorage.setItem('sudoku:v1:daily-game', JSON.stringify({ date: '2026-08-10' }));
    expect(loadDailyGame()).toBeNull();
  });

  it('defaults an empty streak with no completions', () => {
    expect(loadDailyStreak()).toEqual({
      currentStreak: 0,
      longestStreak: 0,
      lastCompletedDate: null,
    });
  });

  it('round-trips the streak', () => {
    const streak = { currentStreak: 5, longestStreak: 12, lastCompletedDate: '2026-08-10' };
    saveDailyStreak(streak);
    expect(loadDailyStreak()).toEqual(streak);
  });
});
