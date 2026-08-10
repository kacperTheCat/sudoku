import { useEffect, useRef, useState, useCallback } from 'react';
import type { Difficulty, GameState, Settings, Stats, Variant } from '../sudoku/types';
import { generatePuzzle } from '../sudoku/generator';
import { PEERS, DIAGONAL_PEERS } from '../sudoku/solver';
import { loadGame, saveGame, loadSettings, saveSettings, loadStats, saveStats } from './storage';
import { playCorrect, playIncorrect, playSuccess, playBoxComplete } from '../sudoku/sound';
import { hapticCorrect, hapticIncorrect, hapticSuccess, hapticBoxComplete } from '../sudoku/haptics';
import {
  CELL_COUNT,
  arraysEqual,
  applyCellChange,
  applyDigitPlacement,
  revertHistoryEntry,
  clearIncorrectValues,
} from './gameLogic';
import { computeLineRipple, computeBoxRipple, boxCells, type RippleCell } from '../sudoku/ripple';

const CONFLICT_PULSE_MS = 450;
const RIPPLE_LINE_STEP_MS = 35;
const RIPPLE_BOX_STEP_MS = 45;
const RIPPLE_ANIM_MS = 260;

export function useGame(isActive: boolean) {
  const [game, setGame] = useState<GameState | null>(() => loadGame());
  const [settings, setSettings] = useState<Settings>(() => loadSettings());
  const [stats, setStats] = useState<Stats>(() => loadStats());
  const [isGenerating, setIsGenerating] = useState(false);
  const [pulseCells, setPulseCells] = useState<number[]>([]);
  const pulseTimeoutRef = useRef<number | undefined>(undefined);
  const [rippleCells, setRippleCells] = useState<RippleCell[]>([]);
  const rippleTimeoutRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    return () => {
      if (pulseTimeoutRef.current) window.clearTimeout(pulseTimeoutRef.current);
      if (rippleTimeoutRef.current) window.clearTimeout(rippleTimeoutRef.current);
    };
  }, []);

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

  // Elapsed-time ticker, paused once the puzzle is solved or while the
  // player has navigated away from the game screen (e.g. back to the menu)
  // — otherwise time keeps accruing in the background, unfairly inflating
  // completion times.
  useEffect(() => {
    if (!game || game.isComplete || !isActive) return;
    const id = window.setInterval(() => {
      setGame((g) => (g ? { ...g, elapsedSeconds: g.elapsedSeconds + 1 } : g));
    }, 1000);
    return () => window.clearInterval(id);
  }, [game === null, game?.isComplete, isActive]);

  const newGame = useCallback((difficulty: Difficulty, variant: Variant = 'classic') => {
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
        isComplete: false,
        startedAt: Date.now(),
      };
      setGame(fresh);
      setIsGenerating(false);
    }, 30);
  }, []);

  const selectCell = useCallback((index: number) => {
    setGame((g) => (g ? { ...g, selected: index } : g));
  }, []);

  // Reads `game` from closure (rather than the functional setGame form) so the
  // correct/incorrect/success sounds below fire exactly once per click. The
  // functional-updater form would work too, but React's Strict Mode
  // intentionally double-invokes updater functions in dev to catch impure
  // ones, which would double-fire audio side effects.
  const setDigit = useCallback(
    (digit: number) => {
      if (!game || game.selected === null || game.isComplete) return;
      const index = game.selected;
      if (game.givens[index] !== 0) return;

      if (game.notesMode) {
        const next = applyCellChange(game, index, (notes, value) => {
          if (value !== 0) return { value, notes };
          const has = notes.includes(digit);
          const nextNotes = has
            ? notes.filter((n) => n !== digit)
            : [...notes, digit].sort((a, b) => a - b);
          return { value, notes: nextNotes };
        });
        setGame(next);
        return;
      }

      const peers = game.variant === 'x' ? DIAGONAL_PEERS : PEERS;
      const next = applyDigitPlacement(game, index, digit, peers);
      setGame(next);

      if (next !== game && next.values[index] !== 0) {
        const isWrong = next.values[index] !== next.solution[index];
        const boxComplete = !isWrong && boxCells(index).every((i) => next.values[i] !== 0);

        const triggerRipple = (targets: RippleCell[]) => {
          if (rippleTimeoutRef.current) window.clearTimeout(rippleTimeoutRef.current);
          setRippleCells(targets);
          const maxDelay = targets.reduce((m, t) => Math.max(m, t.delayMs), 0);
          rippleTimeoutRef.current = window.setTimeout(() => setRippleCells([]), maxDelay + RIPPLE_ANIM_MS);
        };

        if (settings.colorAssists) {
          if (isWrong) {
            // Wrong digit can't stick while Podpowiedzi is on — flash it
            // briefly, then bounce it back out. Guarded against the cell
            // having moved on (undo, a fix, notes toggle) before this
            // timeout fires.
            if (pulseTimeoutRef.current) window.clearTimeout(pulseTimeoutRef.current);
            setPulseCells([index]);
            pulseTimeoutRef.current = window.setTimeout(() => {
              setPulseCells([]);
              setGame((g) => {
                if (!g || g.history.length === 0) return g;
                const last = g.history[g.history.length - 1];
                if (last.index !== index || g.values[index] !== digit) return g;
                const history = g.history.slice(0, -1);
                const { values, notes } = revertHistoryEntry(g, last);
                const isComplete = arraysEqual(values, g.solution);
                return { ...g, values, notes, history, isComplete };
              });
            }, CONFLICT_PULSE_MS);

            // Ripples out along the row/column but stops at the first cell
            // already holding this digit — the conflict it's pointing at.
            triggerRipple(
              computeLineRipple(index, digit, next.values, true, RIPPLE_LINE_STEP_MS).map((t) => ({
                ...t,
                kind: 'wrong' as const,
              })),
            );
          } else {
            const duplicatePeers = peers[index].filter((p) => next.values[p] === next.values[index]);
            if (duplicatePeers.length > 0) {
              if (pulseTimeoutRef.current) window.clearTimeout(pulseTimeoutRef.current);
              setPulseCells([index, ...duplicatePeers]);
              pulseTimeoutRef.current = window.setTimeout(() => setPulseCells([]), CONFLICT_PULSE_MS);
            }

            // Correct digit: ripple all the way to the board edges, plus an
            // 8-directional ripple through the box if this was its 9th cell.
            const lineTargets = computeLineRipple(index, digit, next.values, false, RIPPLE_LINE_STEP_MS).map(
              (t) => ({ ...t, kind: 'correct' as const }),
            );
            const boxTargets = boxComplete
              ? computeBoxRipple(index, RIPPLE_BOX_STEP_MS).map((t) => ({ ...t, kind: 'box' as const }))
              : [];
            triggerRipple([...lineTargets, ...boxTargets]);
          }
        }
        // Podpowiedzi off: no pulse, no ripple, no auto-clear, no sound/
        // haptic below — wrong digits just sit there untouched until the
        // player notices themselves or switches Podpowiedzi back on (which
        // sweeps them).

        // The win fanfare always plays — it's a one-time celebration, not a
        // per-digit hint, so it shouldn't be silenced by Podpowiedzi. This
        // branch only runs once per completion: setDigit early-returns
        // whenever game.isComplete is already true.
        if (next.isComplete) {
          playSuccess();
          hapticSuccess();
          setStats((s) => {
            const prev = s[next.difficulty];
            const bestSeconds =
              prev.bestSeconds === null
                ? next.elapsedSeconds
                : Math.min(prev.bestSeconds, next.elapsedSeconds);
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
        } else if (settings.colorAssists) {
          if (isWrong) {
            playIncorrect();
            hapticIncorrect();
          } else if (boxComplete) {
            playBoxComplete();
            hapticBoxComplete();
          } else {
            playCorrect();
            hapticCorrect();
          }
        }
      }
    },
    [game, settings.colorAssists],
  );

  const erase = useCallback(() => {
    setGame((g) => {
      if (!g || g.selected === null) return g;
      const index = g.selected;
      if (g.givens[index] !== 0) return g;
      return applyCellChange(g, index, () => ({ value: 0, notes: [] }));
    });
  }, []);

  const toggleNotesMode = useCallback(() => {
    setGame((g) => (g ? { ...g, notesMode: !g.notesMode } : g));
  }, []);

  const undo = useCallback(() => {
    setGame((g) => {
      if (!g || g.history.length === 0) return g;
      const history = g.history.slice();
      const last = history.pop()!;
      const { values, notes } = revertHistoryEntry(g, last);
      const isComplete = arraysEqual(values, g.solution);
      return { ...g, values, notes, history, selected: last.index, isComplete };
    });
  }, []);

  const clearIncorrectDigits = useCallback(() => {
    setGame((g) => (g ? clearIncorrectValues(g) : g));
  }, []);

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
    pulseCells,
    rippleCells,
    newGame,
    selectCell,
    setDigit,
    erase,
    toggleNotesMode,
    undo,
    clearIncorrectDigits,
    toggleShowRemaining,
    toggleColorAssists,
    toggleTheme,
  };
}
