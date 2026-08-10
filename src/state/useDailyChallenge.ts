import { useEffect, useRef, useState, useCallback } from 'react';
import type { GameState } from '../sudoku/types';
import { generatePuzzle } from '../sudoku/generator';
import { PEERS } from '../sudoku/solver';
import { DAILY_DIFFICULTY, todayDateKey, yesterdayDateKey } from '../sudoku/daily';
import {
  loadDailyGame,
  saveDailyGame,
  loadDailyStreak,
  saveDailyStreak,
  type DailyStreak,
} from './storage';
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
const DIGIT_EXHAUSTED_MS = 500;

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
  const [pulseCells, setPulseCells] = useState<number[]>([]);
  const pulseTimeoutRef = useRef<number | undefined>(undefined);
  const [rippleCells, setRippleCells] = useState<RippleCell[]>([]);
  const rippleTimeoutRef = useRef<number | undefined>(undefined);
  const [exhaustedDigit, setExhaustedDigit] = useState<number | null>(null);
  const exhaustedTimeoutRef = useRef<number | undefined>(undefined);
  const [combo, setCombo] = useState(0);

  useEffect(() => {
    return () => {
      if (pulseTimeoutRef.current) window.clearTimeout(pulseTimeoutRef.current);
      if (rippleTimeoutRef.current) window.clearTimeout(rippleTimeoutRef.current);
      if (exhaustedTimeoutRef.current) window.clearTimeout(exhaustedTimeoutRef.current);
    };
  }, []);

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
        isComplete: false,
        startedAt: Date.now(),
      };
      setGame(fresh);
      setIsGenerating(false);
      setCombo(0);
    }, 30);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (game) saveDailyGame({ date: today, game });
  }, [game, today]);

  useEffect(() => {
    saveDailyStreak(streak);
  }, [streak]);

  // Paused once solved or while not the active screen, same as the regular
  // game's timer.
  useEffect(() => {
    if (!game || game.isComplete || !isActive) return;
    const id = window.setInterval(() => {
      setGame((g) => (g ? { ...g, elapsedSeconds: g.elapsedSeconds + 1 } : g));
    }, 1000);
    return () => window.clearInterval(id);
  }, [game === null, game?.isComplete, isActive]);

  const selectCell = useCallback((index: number) => {
    setGame((g) => (g ? { ...g, selected: index } : g));
  }, []);

  // See useGame's setDigit for why `game` is read from closure rather than
  // the functional setGame form (Strict Mode double-invocation would
  // otherwise double-fire the audio/haptic/streak side effects below).
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

      const next = applyDigitPlacement(game, index, digit, PEERS);
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

        if (colorAssists) {
          if (isWrong) {
            setCombo(0);

            // See useGame's setDigit for the rationale: a wrong digit can't
            // stick while Podpowiedzi is on — it flashes then bounces out.
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

            triggerRipple(
              computeLineRipple(index, digit, next.values, true, RIPPLE_LINE_STEP_MS).map((t) => ({
                ...t,
                kind: 'wrong' as const,
              })),
            );
          } else {
            setCombo((c) => c + 1);

            const duplicatePeers = PEERS[index].filter((p) => next.values[p] === next.values[index]);
            if (duplicatePeers.length > 0) {
              if (pulseTimeoutRef.current) window.clearTimeout(pulseTimeoutRef.current);
              setPulseCells([index, ...duplicatePeers]);
              pulseTimeoutRef.current = window.setTimeout(() => setPulseCells([]), CONFLICT_PULSE_MS);
            }

            // Box's 9th cell plays the contained box ripple instead of the
            // line ripple, not layered with it — see useGame's setDigit.
            const rippleTargets = boxComplete
              ? computeBoxRipple(index, RIPPLE_BOX_STEP_MS).map((t) => ({ ...t, kind: 'box' as const }))
              : computeLineRipple(index, digit, next.values, false, RIPPLE_LINE_STEP_MS).map((t) => ({
                  ...t,
                  kind: 'correct' as const,
                }));
            triggerRipple(rippleTargets);

            if (next.values.filter((v) => v === digit).length === 9) {
              if (exhaustedTimeoutRef.current) window.clearTimeout(exhaustedTimeoutRef.current);
              setExhaustedDigit(digit);
              exhaustedTimeoutRef.current = window.setTimeout(
                () => setExhaustedDigit(null),
                DIGIT_EXHAUSTED_MS,
              );
            }
          }
        }
        // Podpowiedzi off: nothing — wrong digits sit untouched until the
        // player fixes them or switches Podpowiedzi back on (which sweeps them).

        if (next.isComplete) {
          playSuccess();
          hapticSuccess();
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
        } else if (colorAssists) {
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
    [game, colorAssists, today],
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

  const resetCombo = useCallback(() => {
    setCombo(0);
  }, []);

  return {
    game,
    isGenerating,
    pulseCells,
    rippleCells,
    exhaustedDigit,
    combo,
    streak,
    selectCell,
    setDigit,
    erase,
    toggleNotesMode,
    undo,
    clearIncorrectDigits,
    resetCombo,
  };
}
