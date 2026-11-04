import { useEffect, useMemo, useState, useCallback } from 'react';
import type { GameState } from '../sudoku/types';
import { generatePuzzle } from '../sudoku/generator';
import { DAILY_DIFFICULTY, applyDailyCompletion, liveCurrentStreak, todayDateKey } from '../sudoku/daily';
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
  // "Today" is re-read whenever the app comes back to the foreground: an
  // installed PWA can sit suspended in the background overnight and resume
  // with all its JS state intact, so a date captured once at mount would go
  // stale and keep serving yesterday's puzzle.
  const [today, setToday] = useState(todayDateKey);
  const [initial] = useState(() => {
    const stored = loadDailyGame();
    return stored && stored.date === today ? stored : null;
  });
  const [game, setGame] = useState<GameState | null>(initial?.game ?? null);
  // The day the puzzle in `game` belongs to. Saving and streak credit use
  // this, not `today`, so a puzzle is always filed under its own day.
  const [gameDate, setGameDate] = useState<string | null>(initial?.date ?? null);
  const [streak, setStreak] = useState<DailyStreak>(() => loadDailyStreak());

  // True from mount until today's puzzle exists, and again right after the
  // date rolls over until the new day's puzzle has been generated.
  const needsPuzzle = gameDate !== today;

  useEffect(() => {
    const refreshDate = () => {
      if (document.visibilityState === 'visible') setToday(todayDateKey());
    };
    document.addEventListener('visibilitychange', refreshDate);
    window.addEventListener('focus', refreshDate);
    return () => {
      document.removeEventListener('visibilitychange', refreshDate);
      window.removeEventListener('focus', refreshDate);
    };
  }, []);

  const handleComplete = useCallback(() => {
    if (gameDate === null) return;
    setStreak((s) => applyDailyCompletion(s, gameDate));
  }, [gameDate]);

  const session = useGameSession({ game, setGame, colorAssists, isActive, onComplete: handleComplete });
  const { resetCombo } = session;

  // Generates the puzzle for `today` whenever the slot doesn't hold one yet:
  // on first launch of the day, and after a date rollover. Deferred like the
  // regular newGame() so the "generating" UI can paint before the
  // synchronous backtracking search.
  useEffect(() => {
    if (!needsPuzzle) return;
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
      setGameDate(today);
      resetCombo();
    }, 30);
    return () => window.clearTimeout(timer);
  }, [needsPuzzle, today, resetCombo]);

  useEffect(() => {
    if (game && gameDate) saveDailyGame({ date: gameDate, game });
  }, [game, gameDate]);

  useEffect(() => {
    saveDailyStreak(streak);
  }, [streak]);

  // What the menu shows: the stored streak is only reset on the next
  // completion, so after a missed day it would otherwise keep displaying a
  // streak that is already broken.
  const displayedStreak = useMemo<DailyStreak>(
    () => ({ ...streak, currentStreak: liveCurrentStreak(streak.currentStreak, streak.lastCompletedDate, today) }),
    [streak, today],
  );

  return {
    ...session,
    // A previous day's board is never exposed: while the new day's puzzle is
    // being generated the screen shows the loading state and the menu no
    // longer marks the challenge as done.
    game: needsPuzzle ? null : game,
    isGenerating: needsPuzzle,
    streak: displayedStreak,
  };
}
