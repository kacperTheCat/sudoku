import { useEffect, useState, useCallback } from 'react';
import type { Difficulty, GameState, Settings, Stats, Variant } from '../sudoku/types';
import { generatePuzzle } from '../sudoku/generator';
import { loadGame, saveGame, loadSettings, saveSettings, loadStats, saveStats } from './storage';
import { CELL_COUNT } from './gameLogic';
import { useGameSession } from './useGameSession';

export function useGame(isActive: boolean) {
  const [game, setGame] = useState<GameState | null>(() => loadGame());
  const [settings, setSettings] = useState<Settings>(() => loadSettings());
  const [stats, setStats] = useState<Stats>(() => loadStats());
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (game) saveGame(game);
  }, [game]);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    saveStats(stats);
  }, [stats]);

  // index.html has an inline script setting this attribute before first
  // paint (avoiding a flash of the wrong theme); this effect keeps it in
  // sync for changes made after load, e.g. tapping the theme toggle.
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme);
  }, [settings.theme]);

  const handleComplete = useCallback((next: GameState) => {
    setStats((s) => {
      const prev = s[next.difficulty];
      const bestSeconds =
        prev.bestSeconds === null ? next.elapsedSeconds : Math.min(prev.bestSeconds, next.elapsedSeconds);
      return {
        ...s,
        [next.difficulty]: {
          gamesCompleted: prev.gamesCompleted + 1,
          totalSeconds: prev.totalSeconds + next.elapsedSeconds,
          totalMoves: prev.totalMoves + next.moveCount,
          bestSeconds,
        },
      };
    });
  }, []);

  const session = useGameSession({
    game,
    setGame,
    colorAssists: settings.colorAssists,
    isActive,
    onComplete: handleComplete,
  });

  const newGame = useCallback(
    (difficulty: Difficulty, variant: Variant = 'classic') => {
      setIsGenerating(true);
      // Deferred so the UI can paint the "generating" state before the
      // (occasionally ~0.5s) synchronous backtracking search runs.
      window.setTimeout(() => {
        const { givens, solution } = generatePuzzle(difficulty, variant);
        const fresh: GameState = {
          difficulty,
          variant,
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
    },
    // session.resetCombo is a stable reference (its own useCallback inside
    // useGameSession has no deps) — depending on the whole `session` object
    // instead (as the linter suggests) would be wrong, since that object
    // literal is recreated every render.
    [session.resetCombo],
  );

  const toggleShowRemaining = useCallback(() => {
    setSettings((s) => ({ ...s, showRemaining: !s.showRemaining }));
  }, []);

  const toggleColorAssists = useCallback(() => {
    setSettings((s) => ({ ...s, colorAssists: !s.colorAssists }));
  }, []);

  const toggleTheme = useCallback(() => {
    setSettings((s) => ({ ...s, theme: s.theme === 'dark' ? 'light' : 'dark' }));
  }, []);

  return {
    game,
    settings,
    stats,
    isGenerating,
    ...session,
    newGame,
    toggleShowRemaining,
    toggleColorAssists,
    toggleTheme,
  };
}
