import { describe, it, expect } from 'vitest';
import {
  rowOf,
  colOf,
  boxOf,
  isOnMainDiagonal,
  isOnAntiDiagonal,
  PEERS,
  DIAGONAL_PEERS,
  isValidPlacement,
  findConflicts,
  candidatesFor,
  countSolutions,
  isBoardComplete,
} from './solver';

const EMPTY = () => new Array(81).fill(0);

describe('rowOf / colOf / boxOf', () => {
  it('maps index to row/col', () => {
    expect(rowOf(0)).toBe(0);
    expect(colOf(0)).toBe(0);
    expect(rowOf(8)).toBe(0);
    expect(colOf(8)).toBe(8);
    expect(rowOf(9)).toBe(1);
    expect(colOf(9)).toBe(0);
    expect(rowOf(80)).toBe(8);
    expect(colOf(80)).toBe(8);
  });

  it('groups indices into their 3x3 box', () => {
    expect(boxOf(0)).toBe(0);
    expect(boxOf(1)).toBe(0);
    expect(boxOf(9)).toBe(0);
    expect(boxOf(8)).toBe(2);
    expect(boxOf(40)).toBe(4);
    expect(boxOf(80)).toBe(8);
  });
});

describe('diagonal helpers', () => {
  it('identifies the main diagonal (row === col)', () => {
    expect(isOnMainDiagonal(0)).toBe(true);
    expect(isOnMainDiagonal(80)).toBe(true);
    expect(isOnMainDiagonal(40)).toBe(true);
    expect(isOnMainDiagonal(1)).toBe(false);
  });

  it('identifies the anti-diagonal (row + col === 8)', () => {
    expect(isOnAntiDiagonal(8)).toBe(true);
    expect(isOnAntiDiagonal(72)).toBe(true);
    expect(isOnAntiDiagonal(40)).toBe(true);
    expect(isOnAntiDiagonal(0)).toBe(false);
  });
});

describe('PEERS / DIAGONAL_PEERS', () => {
  it('gives every cell exactly 20 classic peers (row+col+box, deduplicated)', () => {
    for (let i = 0; i < 81; i++) {
      expect(PEERS[i]).toHaveLength(20);
      expect(PEERS[i]).not.toContain(i);
    }
  });

  it('adds diagonal peers only for cells actually on a diagonal', () => {
    // Center cell (40) is on both diagonals — strictly more peers than classic.
    expect(DIAGONAL_PEERS[40].length).toBeGreaterThan(PEERS[40].length);
    // A cell off both diagonals has identical peers in both peer sets.
    const off = 1; // row0,col1 — not on either diagonal
    expect(isOnMainDiagonal(off)).toBe(false);
    expect(isOnAntiDiagonal(off)).toBe(false);
    expect(new Set(DIAGONAL_PEERS[off])).toEqual(new Set(PEERS[off]));
  });
});

describe('isValidPlacement', () => {
  it('is valid when no peer already has the value', () => {
    const values = EMPTY();
    expect(isValidPlacement(values, 0, 5)).toBe(true);
  });

  it('is invalid when a peer already has the value', () => {
    const values = EMPTY();
    values[1] = 5; // same row as index 0
    expect(isValidPlacement(values, 0, 5)).toBe(false);
  });

  it('placing 0 (clearing) is always valid', () => {
    const values = EMPTY();
    values[1] = 5;
    expect(isValidPlacement(values, 0, 0)).toBe(true);
  });
});

describe('findConflicts', () => {
  it('flags both cells of a duplicate pair, nothing else', () => {
    const values = EMPTY();
    values[0] = 7;
    values[3] = 7; // same row as index 0
    const conflicts = findConflicts(values);
    expect(conflicts[0]).toBe(true);
    expect(conflicts[3]).toBe(true);
    expect(conflicts.filter(Boolean)).toHaveLength(2);
  });

  it('reports no conflicts on an empty board', () => {
    expect(findConflicts(EMPTY()).every((c) => !c)).toBe(true);
  });
});

describe('candidatesFor', () => {
  it('returns all 9 digits for an empty board', () => {
    expect(candidatesFor(EMPTY(), 0)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it('excludes digits already used by peers', () => {
    const values = EMPTY();
    values[1] = 3; // row peer
    values[9] = 5; // column peer
    values[10] = 7; // box peer
    expect(candidatesFor(values, 0)).toEqual([1, 2, 4, 6, 8, 9]);
  });
});

describe('countSolutions', () => {
  it('counts exactly 1 for an already-complete grid', () => {
    // Build a trivially valid complete grid: row r, col c -> ((r*3 + floor(r/3) + c) % 9) + 1
    // is a standard valid Sudoku pattern.
    const grid = EMPTY();
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        grid[r * 9 + c] = ((r * 3 + Math.floor(r / 3) + c) % 9) + 1;
      }
    }
    expect(isBoardComplete(grid)).toBe(true);
    expect(countSolutions(grid, 2)).toBe(1);
  });

  it('stops early at the given limit when many solutions exist', () => {
    expect(countSolutions(EMPTY(), 2)).toBe(2);
  });

  it('returns 0 when a cell has no valid candidates left', () => {
    const values = EMPTY();
    // Fill row 0, cols 0-7 with digits 1-8, leaving (row0,col8) needing a 9.
    for (let c = 0; c < 8; c++) values[c] = c + 1;
    // Also place a 9 in that same empty cell's column, so it has zero candidates.
    values[9 + 8] = 9; // row1, col8
    expect(countSolutions(values, 2)).toBe(0);
  });
});

describe('isBoardComplete', () => {
  it('is false while cells remain empty', () => {
    expect(isBoardComplete(EMPTY())).toBe(false);
  });

  it('is false when full but conflicting', () => {
    const grid = new Array(81).fill(1); // every cell the same digit — maximally conflicting
    expect(isBoardComplete(grid)).toBe(false);
  });
});
