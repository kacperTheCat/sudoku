import { describe, it, expect } from 'vitest';
import { generateFullBoard, generatePuzzle, DIFFICULTY_CLUES } from './generator';
import { PEERS, DIAGONAL_PEERS, isBoardComplete, findConflicts, countSolutions } from './solver';
import type { Difficulty, Variant } from './types';

describe('generateFullBoard', () => {
  it('produces a fully valid classic board', () => {
    const board = generateFullBoard(PEERS);
    expect(board).toHaveLength(81);
    expect(board.every((v) => v >= 1 && v <= 9)).toBe(true);
    expect(isBoardComplete(board, PEERS)).toBe(true);
  });

  it('produces a board that also satisfies diagonal constraints when asked', () => {
    const board = generateFullBoard(DIAGONAL_PEERS);
    expect(isBoardComplete(board, DIAGONAL_PEERS)).toBe(true);
    expect(findConflicts(board, DIAGONAL_PEERS).every((c) => !c)).toBe(true);
  });
});

describe('generatePuzzle', () => {
  const difficulties: Difficulty[] = ['easy', 'medium', 'hard', 'expert'];

  it.each(difficulties)('generates a %s puzzle with a unique solution', (difficulty) => {
    const { givens, solution } = generatePuzzle(difficulty, 'classic');

    expect(solution).toHaveLength(81);
    expect(isBoardComplete(solution, PEERS)).toBe(true);

    // Every given must agree with the solution.
    for (let i = 0; i < 81; i++) {
      if (givens[i] !== 0) expect(givens[i]).toBe(solution[i]);
    }

    // Never fewer clues than the target — removeClues stops at the target,
    // it can only fail to reach it, not overshoot below it.
    const clueCount = givens.filter((v) => v !== 0).length;
    expect(clueCount).toBeGreaterThanOrEqual(DIFFICULTY_CLUES[difficulty]);

    // The whole point of the generator: exactly one way to complete it.
    expect(countSolutions(givens, 2, PEERS)).toBe(1);
  });

  it('generates a Sudoku X puzzle with a unique solution under diagonal constraints', () => {
    const variant: Variant = 'x';
    const { givens, solution } = generatePuzzle('easy', variant);

    expect(isBoardComplete(solution, DIAGONAL_PEERS)).toBe(true);
    expect(countSolutions(givens, 2, DIAGONAL_PEERS)).toBe(1);
  });
});
