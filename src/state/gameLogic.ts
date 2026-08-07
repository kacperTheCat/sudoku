import type { GameState } from '../sudoku/types';

export const CELL_COUNT = 81;

export function arraysEqual(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

export function applyCellChange(
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

  const history = [...game.history, { index, prevValue, prevNotes, clearedPeerNotes: [] }];
  const isComplete = arraysEqual(values, game.solution);

  return { ...game, values, notes: notesList, history, moveCount: game.moveCount + 1, isComplete };
}

/**
 * Placing a digit (as opposed to toggling a note) also strips that digit
 * from every peer cell's notes — the classic "auto pencil-mark cleanup"
 * behaviour. Cleared peer notes are recorded on the history entry so undo
 * can restore them, not just the placed cell itself.
 */
export function applyDigitPlacement(
  game: GameState,
  index: number,
  digit: number,
  peers: readonly number[][],
): GameState {
  if (game.givens[index] !== 0) return game;

  const prevValue = game.values[index];
  const prevNotes = game.notes[index];
  const value = prevValue === digit ? 0 : digit;

  const values = game.values.slice();
  values[index] = value;
  const notes = game.notes.slice();
  notes[index] = [];

  const clearedPeerNotes: { index: number; prevNotes: number[] }[] = [];
  if (value !== 0) {
    for (const p of peers[index]) {
      const peerNotes = notes[p];
      if (peerNotes.includes(digit)) {
        clearedPeerNotes.push({ index: p, prevNotes: peerNotes });
        notes[p] = peerNotes.filter((n) => n !== digit);
      }
    }
  }

  const history = [...game.history, { index, prevValue, prevNotes, clearedPeerNotes }];
  const isComplete = arraysEqual(values, game.solution);

  return { ...game, values, notes, history, moveCount: game.moveCount + 1, isComplete };
}
