const CELL_COUNT = 81;

export function rowOf(index: number): number {
  return Math.floor(index / 9);
}

export function colOf(index: number): number {
  return index % 9;
}

export function boxOf(index: number): number {
  return Math.floor(rowOf(index) / 3) * 3 + Math.floor(colOf(index) / 3);
}

function buildPeers(): number[][] {
  const peers: number[][] = [];
  for (let index = 0; index < CELL_COUNT; index++) {
    const row = Math.floor(index / 9);
    const col = index % 9;
    const boxRow = Math.floor(row / 3) * 3;
    const boxCol = Math.floor(col / 3) * 3;
    const set = new Set<number>();
    for (let c = 0; c < 9; c++) set.add(row * 9 + c);
    for (let r = 0; r < 9; r++) set.add(r * 9 + col);
    for (let r = boxRow; r < boxRow + 3; r++) {
      for (let c = boxCol; c < boxCol + 3; c++) set.add(r * 9 + c);
    }
    set.delete(index);
    peers.push([...set]);
  }
  return peers;
}

export const PEERS: readonly number[][] = buildPeers();

export function isValidPlacement(values: number[], index: number, value: number): boolean {
  if (value === 0) return true;
  return PEERS[index].every((p) => values[p] !== value);
}

/** Returns a mask of cells that currently violate a row/column/box constraint. */
export function findConflicts(values: number[]): boolean[] {
  const conflicts = new Array(CELL_COUNT).fill(false);
  for (let i = 0; i < CELL_COUNT; i++) {
    const v = values[i];
    if (v === 0) continue;
    for (const p of PEERS[i]) {
      if (values[p] === v) {
        conflicts[i] = true;
        break;
      }
    }
  }
  return conflicts;
}

export function candidatesFor(values: number[], index: number): number[] {
  const used = new Set<number>();
  for (const p of PEERS[index]) {
    if (values[p] !== 0) used.add(values[p]);
  }
  const candidates: number[] = [];
  for (let d = 1; d <= 9; d++) {
    if (!used.has(d)) candidates.push(d);
  }
  return candidates;
}

/**
 * Counts solutions up to `limit` using MRV backtracking, stopping early once
 * the limit is reached. Used during generation to confirm a puzzle still has
 * exactly one solution after removing a clue.
 */
export function countSolutions(values: number[], limit = 2): number {
  const grid = values.slice();
  let count = 0;

  function step(): boolean {
    let bestIndex = -1;
    let bestCandidates: number[] = [];
    for (let i = 0; i < CELL_COUNT; i++) {
      if (grid[i] !== 0) continue;
      const candidates = candidatesFor(grid, i);
      if (candidates.length === 0) return false;
      if (bestIndex === -1 || candidates.length < bestCandidates.length) {
        bestIndex = i;
        bestCandidates = candidates;
        if (candidates.length === 1) break;
      }
    }
    if (bestIndex === -1) {
      count++;
      return count >= limit;
    }
    for (const digit of bestCandidates) {
      grid[bestIndex] = digit;
      const shouldStop = step();
      grid[bestIndex] = 0;
      if (shouldStop) return true;
    }
    return false;
  }

  step();
  return count;
}

export function isBoardComplete(values: number[]): boolean {
  return values.every((v) => v !== 0) && findConflicts(values).every((c) => !c);
}
