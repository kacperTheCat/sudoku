import type { Difficulty } from './types';
import { candidatesFor, countSolutions } from './solver';

const CELL_COUNT = 81;

export const DIFFICULTY_CLUES: Record<Difficulty, number> = {
  easy: 38,
  medium: 30,
  hard: 26,
  expert: 22,
};

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Łatwy',
  medium: 'Średni',
  hard: 'Trudny',
  expert: 'Ekspert',
};

function shuffle<T>(items: T[]): T[] {
  const result = items.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function generateFullBoard(): number[] {
  const grid = new Array(CELL_COUNT).fill(0);

  function step(): boolean {
    let bestIndex = -1;
    let bestCandidates: number[] = [];
    for (let i = 0; i < CELL_COUNT; i++) {
      if (grid[i] !== 0) continue;
      const candidates = shuffle(candidatesFor(grid, i));
      if (candidates.length === 0) return false;
      if (bestIndex === -1 || candidates.length < bestCandidates.length) {
        bestIndex = i;
        bestCandidates = candidates;
        if (candidates.length === 1) break;
      }
    }
    if (bestIndex === -1) return true;
    for (const digit of bestCandidates) {
      grid[bestIndex] = digit;
      if (step()) return true;
      grid[bestIndex] = 0;
    }
    return false;
  }

  step();
  return grid;
}

export interface GeneratedPuzzle {
  givens: number[];
  solution: number[];
}

const MAX_REMOVAL_PASSES = 8;
const MAX_GENERATION_ATTEMPTS = 15;

/**
 * Greedily removes clues from a full board while keeping the solution
 * unique. A single ordered pass can "get stuck" above the target because,
 * for the current board, no single remaining clue can be removed alone
 * without introducing a second solution — re-shuffling and starting a new
 * pass only helps if earlier removals in that pass changed the board, so
 * once a full pass removes nothing we stop (further passes would repeat
 * the same dead end).
 */
function removeClues(solution: number[], targetClues: number): number[] {
  const givens = solution.slice();
  let clues = CELL_COUNT;

  for (let pass = 0; pass < MAX_REMOVAL_PASSES && clues > targetClues; pass++) {
    const remaining = shuffle(
      Array.from({ length: CELL_COUNT }, (_, i) => i).filter((i) => givens[i] !== 0),
    );
    let removedThisPass = false;

    for (const index of remaining) {
      if (clues <= targetClues) break;
      const backup = givens[index];
      givens[index] = 0;
      if (countSolutions(givens, 2) === 1) {
        clues--;
        removedThisPass = true;
      } else {
        givens[index] = backup;
      }
    }

    if (!removedThisPass) break;
  }

  return givens;
}

/**
 * How low a greedy removal can go depends on the starting full board and
 * the random removal order — some combinations get stuck well above the
 * target (especially at low clue counts like "expert"). Retrying with a
 * fresh board is cheap (tens of ms), so we keep trying until we hit the
 * target or exhaust the attempt budget, keeping the best result seen.
 */
export function generatePuzzle(difficulty: Difficulty): GeneratedPuzzle {
  const targetClues = DIFFICULTY_CLUES[difficulty];

  let best: GeneratedPuzzle | null = null;
  let bestClueCount = Infinity;

  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
    const solution = generateFullBoard();
    const givens = removeClues(solution, targetClues);
    const clueCount = givens.filter((v) => v !== 0).length;

    if (clueCount < bestClueCount) {
      best = { givens, solution };
      bestClueCount = clueCount;
    }
    if (clueCount <= targetClues) break;
  }

  return best as GeneratedPuzzle;
}
