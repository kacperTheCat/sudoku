import { useEffect, useRef, useState, useCallback } from 'react';
import type { Difficulty, GameState, Settings } from '../sudoku/types';
import { generatePuzzle } from '../sudoku/generator';
import { PEERS } from '../sudoku/solver';
import { loadGame, saveGame, loadSettings, saveSettings } from './storage';
import { playCorrect, playIncorrect, playSuccess } from '../sudoku/sound';

const CONFLICT_PULSE_MS = 450;

const CELL_COUNT = 81;

function arraysEqual(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

function applyCellChange(
  game: GameState,
  index: number,
  updater: (prevNotes: number[], prevValue: number) => { value: number; notes: number[] },
): GameState {
  if (game.givens[index] !== 0) return game;

  const prevValue = game.values[index];
  const prevNotes = game.notes[index];
  const { value, notes } = updater(prevNotes, prevValue);
  const notesUnchanged =
    notes === prevNotes ||
    (notes.length === prevNotes.length && notes.every((n, i) => n === prevNotes[i]));
  if (value === prevValue && notesUnchanged) return game;

  const values = game.values.slice();
  values[index] = value;
  const notesList = game.notes.slice();
  notesList[index] = notes;

  const history = [...game.history, { index, prevValue, prevNotes }];
  const isComplete = arraysEqual(values, game.solution);

  return { ...game, values, notes: notesList, history, isComplete };
}

export function useGame() {
  const [game, setGame] = useState<GameState | null>(() => loadGame());
  const [settings, setSettings] = useState<Settings>(() => loadSettings());
  const [isGenerating, setIsGenerating] = useState(false);
  const [pulseCells, setPulseCells] = useState<number[]>([]);
  const pulseTimeoutRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    return () => {
      if (pulseTimeoutRef.current) window.clearTimeout(pulseTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (game) saveGame(game);
  }, [game]);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  // index.html has an inline script setting this attribute before first
  // paint (avoiding a flash of the wrong theme); this effect keeps it in
  // sync for changes made after load, e.g. tapping the theme toggle.
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme);
  }, [settings.theme]);

  // Elapsed-time ticker, paused once the puzzle is solved.
  useEffect(() => {
    if (!game || game.isComplete) return;
    const id = window.setInterval(() => {
      setGame((g) => (g ? { ...g, elapsedSeconds: g.elapsedSeconds + 1 } : g));
    }, 1000);
    return () => window.clearInterval(id);
  }, [game === null, game?.isComplete]);

  const newGame = useCallback((difficulty: Difficulty) => {
    setIsGenerating(true);
    // Deferred so the UI can paint the "generating" state before the
    // (occasionally ~0.5s) synchronous backtracking search runs.
    window.setTimeout(() => {
      const { givens, solution } = generatePuzzle(difficulty);
      const fresh: GameState = {
        difficulty,
        givens,
        solution,
        values: givens.slice(),
        notes: Array.from({ length: CELL_COUNT }, () => []),
        selected: null,
        history: [],
        notesMode: false,
        elapsedSeconds: 0,
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

      const next = applyCellChange(game, index, (_notes, value) => ({
        value: value === digit ? 0 : digit,
        notes: [],
      }));
      setGame(next);

      if (next !== game && next.values[index] !== 0) {
        if (settings.colorAssists) {
          const duplicatePeers = PEERS[index].filter((p) => next.values[p] === next.values[index]);
          if (duplicatePeers.length > 0) {
            if (pulseTimeoutRef.current) window.clearTimeout(pulseTimeoutRef.current);
            setPulseCells([index, ...duplicatePeers]);
            pulseTimeoutRef.current = window.setTimeout(() => setPulseCells([]), CONFLICT_PULSE_MS);
          }
        }

        // The win fanfare always plays — it's a one-time celebration, not a
        // per-digit hint, so it shouldn't be silenced by Podpowiedzi.
        if (next.isComplete) playSuccess();
        else if (settings.colorAssists) {
          if (next.values[index] === next.solution[index]) playCorrect();
          else playIncorrect();
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
      const values = g.values.slice();
      values[last.index] = last.prevValue;
      const notes = g.notes.slice();
      notes[last.index] = last.prevNotes;
      const isComplete = arraysEqual(values, g.solution);
      return { ...g, values, notes, history, selected: last.index, isComplete };
    });
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
    isGenerating,
    pulseCells,
    newGame,
    selectCell,
    setDigit,
    erase,
    toggleNotesMode,
    undo,
    toggleShowRemaining,
    toggleColorAssists,
    toggleTheme,
  };
}
