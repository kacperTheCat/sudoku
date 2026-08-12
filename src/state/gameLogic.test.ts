import { describe, it, expect } from 'vitest';
import { arraysEqual, applyCellChange, applyDigitPlacement, revertHistoryEntry, clearIncorrectValues } from './gameLogic';
import { PEERS } from '../sudoku/solver';
import type { GameState } from '../sudoku/types';

// Standard valid Sudoku pattern — same formula used in solver.test.ts.
function solvedGrid(): number[] {
  const grid = new Array(81).fill(0);
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      grid[r * 9 + c] = ((r * 3 + Math.floor(r / 3) + c) % 9) + 1;
    }
  }
  return grid;
}

/** A fixture game where every cell is empty (not given) except where overridden. */
function makeGame(overrides: Partial<GameState> = {}): GameState {
  const solution = solvedGrid();
  return {
    difficulty: 'easy',
    variant: 'classic',
    givens: new Array(81).fill(0),
    solution,
    values: new Array(81).fill(0),
    notes: Array.from({ length: 81 }, () => []),
    selected: null,
    history: [],
    notesMode: false,
    elapsedSeconds: 0,
    moveCount: 0,
    mistakeCount: 0,
    isComplete: false,
    startedAt: 0,
    ...overrides,
  };
}

describe('arraysEqual', () => {
  it('compares by value, not reference', () => {
    expect(arraysEqual([1, 2, 3], [1, 2, 3])).toBe(true);
    expect(arraysEqual([1, 2, 3], [1, 2, 4])).toBe(false);
    expect(arraysEqual([1, 2], [1, 2, 3])).toBe(false);
  });
});

describe('applyCellChange', () => {
  it('refuses to change a given cell', () => {
    const game = makeGame({ givens: (() => { const g = new Array(81).fill(0); g[0] = 5; return g; })() });
    const next = applyCellChange(game, 0, () => ({ value: 9, notes: [] }));
    expect(next).toBe(game);
  });

  it('is a no-op when the updater changes nothing', () => {
    const game = makeGame();
    const next = applyCellChange(game, 0, (notes, value) => ({ value, notes }));
    expect(next).toBe(game);
  });

  it('updates value/notes, appends history, and bumps moveCount', () => {
    const game = makeGame();
    const next = applyCellChange(game, 0, () => ({ value: 0, notes: [3, 5] }));
    expect(next).not.toBe(game);
    expect(next.notes[0]).toEqual([3, 5]);
    expect(next.moveCount).toBe(1);
    expect(next.history).toHaveLength(1);
    expect(next.history[0]).toMatchObject({ index: 0, prevValue: 0, prevNotes: [] });
  });

  it('recomputes isComplete when the board now matches the solution', () => {
    const solution = solvedGrid();
    const almostDone = solution.slice();
    almostDone[0] = 0;
    const game = makeGame({ solution, values: almostDone });
    const next = applyCellChange(game, 0, () => ({ value: solution[0], notes: [] }));
    expect(next.isComplete).toBe(true);
  });
});

describe('applyDigitPlacement', () => {
  it('places a digit, clears matching peer notes, and records them for undo', () => {
    const notes: number[][] = Array.from({ length: 81 }, () => []);
    notes[1] = [3, 7]; // row-peer of index 0, has a stray "3" pencil mark
    const game = makeGame({ notes });

    const next = applyDigitPlacement(game, 0, 3, PEERS);

    expect(next.values[0]).toBe(3);
    expect(next.notes[1]).toEqual([7]); // "3" swept out
    expect(next.history[0].clearedPeerNotes).toEqual([{ index: 1, prevNotes: [3, 7] }]);
    expect(next.moveCount).toBe(1);
  });

  it('toggles the same digit back off without touching peer notes', () => {
    const values = new Array(81).fill(0);
    values[0] = 3;
    const game = makeGame({ values });

    const next = applyDigitPlacement(game, 0, 3, PEERS);

    expect(next.values[0]).toBe(0);
    expect(next.history[0].clearedPeerNotes).toEqual([]);
  });

  it('refuses to change a given cell', () => {
    const givens = new Array(81).fill(0);
    givens[0] = 5;
    const game = makeGame({ givens });
    const next = applyDigitPlacement(game, 0, 9, PEERS);
    expect(next).toBe(game);
  });

  it('marks the game complete once the last cell matches the solution', () => {
    const solution = solvedGrid();
    const almostDone = solution.slice();
    almostDone[0] = 0;
    const game = makeGame({ solution, values: almostDone });
    const next = applyDigitPlacement(game, 0, solution[0], PEERS);
    expect(next.isComplete).toBe(true);
  });

  it('does not count a correct placement as a mistake', () => {
    const solution = solvedGrid();
    const game = makeGame({ solution });
    const next = applyDigitPlacement(game, 0, solution[0], PEERS);
    expect(next.mistakeCount).toBe(0);
  });

  it('counts a wrong placement as a mistake', () => {
    const solution = solvedGrid();
    const wrongDigit = solution[0] === 9 ? 8 : solution[0] + 1;
    const game = makeGame({ solution });
    const next = applyDigitPlacement(game, 0, wrongDigit, PEERS);
    expect(next.mistakeCount).toBe(1);
  });

  it('accumulates mistakes across multiple wrong placements, and never decrements on toggle-off', () => {
    const solution = solvedGrid();
    const wrongDigit = solution[0] === 9 ? 8 : solution[0] + 1;
    let game = makeGame({ solution, mistakeCount: 2 });

    game = applyDigitPlacement(game, 0, wrongDigit, PEERS); // 3rd mistake
    expect(game.mistakeCount).toBe(3);

    game = applyDigitPlacement(game, 0, wrongDigit, PEERS); // toggled back off
    expect(game.values[0]).toBe(0);
    expect(game.mistakeCount).toBe(3); // clearing a mistake doesn't un-count it
  });
});

describe('revertHistoryEntry', () => {
  it('restores the cell and any swept peer notes', () => {
    const notes: number[][] = Array.from({ length: 81 }, () => []);
    notes[1] = [3, 7];
    const game = makeGame({ notes });
    const placed = applyDigitPlacement(game, 0, 3, PEERS);

    const reverted = revertHistoryEntry(placed, placed.history[0]);
    expect(reverted.values[0]).toBe(0);
    expect(reverted.notes[1]).toEqual([3, 7]);
  });

  it('tolerates old history entries missing clearedPeerNotes (backward compat)', () => {
    const game = makeGame();
    const legacyEntry = { index: 0, prevValue: 0, prevNotes: [] } as unknown as GameState['history'][number];
    expect(() => revertHistoryEntry(game, legacyEntry)).not.toThrow();
  });
});

describe('clearIncorrectValues', () => {
  it('zeroes non-given cells that disagree with the solution', () => {
    const solution = solvedGrid();
    const values = new Array(81).fill(0);
    values[0] = solution[0] === 9 ? 8 : solution[0] + 1; // guaranteed wrong
    values[1] = solution[1]; // correct, must survive
    const game = makeGame({ solution, values });

    const next = clearIncorrectValues(game);
    expect(next.values[0]).toBe(0);
    expect(next.values[1]).toBe(solution[1]);
  });

  it('never touches given cells, even hypothetically wrong ones', () => {
    const solution = solvedGrid();
    const givens = new Array(81).fill(0);
    givens[0] = solution[0] === 9 ? 8 : solution[0] + 1; // a given that disagrees with solution
    const values = givens.slice();
    const game = makeGame({ solution, givens, values });

    const next = clearIncorrectValues(game);
    expect(next.values[0]).toBe(givens[0]); // untouched
  });

  it('returns the same object when nothing needs clearing', () => {
    const solution = solvedGrid();
    const game = makeGame({ solution, values: solution.slice() });
    expect(clearIncorrectValues(game)).toBe(game);
  });
});
