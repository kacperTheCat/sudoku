import { useEffect, useState, useCallback } from 'react';
import type { GameState } from '../sudoku/types';
import { generatePuzzle } from '../sudoku/generator';
import { DAILY_DIFFICULTY, todayDateKey, yesterdayDateKey } from '../sudoku/daily';
import {
  loadDailyGame,
  saveDailyGame,
  loadDailyStreak,
  saveDailyStreak,
  type DailyStreak,
} from './storage';
import { CELL_COUNT } from './gameLogic';
import { useGameSession } from './useGameSession';

/**
 * One fixed-difficulty puzzle per calendar day, generated once and persisted
 * — reopening the app the same day resumes it rather than generating a new
 * board. Kept as an independent save slot from the regular game (own
 * localStorage keys, own history/notes/moveCount) so playing the daily
 * challenge never disturbs an in-progress regular game or vice versa.
 */
export function useDailyChallenge(colorAssists: boolean, isActive: boolean) {
  const [today] = useState(todayDateKey);
  const [game, setGame] = useState<GameState | null>(() => {
    const stored = loadDailyGame();
    return stored && stored.date === today ? stored.game : null;
  });
  const [isGenerating, setIsGenerating] = useState(() => game === null);
  const [streak, setStreak] = useState<DailyStreak>(() => loadDailyStreak());

  // Streak tracking only needs today's date, not the completed game itself.
  const handleComplete = useCallback(
    (_next: GameState) => {
      setStreak((s) => {
        if (s.lastCompletedDate === today) return s;
        const yesterday = yesterdayDateKey();
        const currentStreak = s.lastCompletedDate === yesterday ? s.currentStreak + 1 : 1;
        return {
          currentStreak,
          longestStreak: Math.max(s.longestStreak, currentStreak),
          lastCompletedDate: today,
        };
      });
    },
    [today],
  );

  const session = useGameSession({ game, setGame, colorAssists, isActive, onComplete: handleComplete });

  // Generates today's puzzle once, only if nothing usable was loaded for
  // today's date above. Deferred like the regular newGame() so the
  // "generating" UI can paint before the synchronous backtracking search.
  useEffect(() => {
    if (game !== null) return;
    const timer = window.setTimeout(() => {
      const { givens, solution } = generatePuzzle(DAILY_DIFFICULTY, 'classic');
      const fresh: GameState = {
        difficulty: DAILY_DIFFICULTY,
        variant: 'classic',
        givens,
        solution,
        values: givens.slice(),
        notes: Array.from({ length: CELL_COUNT }, () => []),
        selected: null,
        history: [],
        notesMode: false,
        elapsedSeconds: 0,
        moveCount: 0,
        mistakeCount: 0,
        isComplete: false,
        startedAt: Date.now(),
      };
      setGame(fresh);
      setIsGenerating(false);
      session.resetCombo();
    }, 30);
    return () => window.clearTimeout(timer);
    // Deliberately runs once on mount only, not on every `game` change —
    // it's a one-time "generate if nothing usable was loaded" check, not a
    // reactive sync. session.resetCombo is a stable reference regardless
    // (its own useCallback inside useGameSession has no deps).
  }, []);

  useEffect(() => {
    if (game) saveDailyGame({ date: today, game });
  }, [game, today]);

  useEffect(() => {
    saveDailyStreak(streak);
  }, [streak]);

  return {
    game,
    isGenerating,
    streak,
    ...session,
  };
}
