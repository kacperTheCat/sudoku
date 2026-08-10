import { rowOf, colOf } from './solver';

export type RippleKind = 'correct' | 'wrong' | 'box';

export interface RippleCell {
  index: number;
  delayMs: number;
  kind: RippleKind;
}

/**
 * Cells radiating outward from `index` along its row and column, one step
 * at a time in all four directions, each tagged with how long to wait
 * before it lights up. When `stopAtDuplicate` is set (the "wrong digit"
 * case), each direction stops as soon as it hits a cell already holding
 * `digit` — that's the conflict the ripple is pointing at — instead of
 * continuing to the board edge.
 */
export function computeLineRipple(
  index: number,
  digit: number,
  values: number[],
  stopAtDuplicate: boolean,
  stepMs: number,
): { index: number; delayMs: number }[] {
  const row = rowOf(index);
  const col = colOf(index);
  const targets: { index: number; delayMs: number }[] = [];

  for (let c = col - 1, d = 1; c >= 0; c--, d++) {
    const i = row * 9 + c;
    targets.push({ index: i, delayMs: d * stepMs });
    if (stopAtDuplicate && values[i] === digit) break;
  }
  for (let c = col + 1, d = 1; c <= 8; c++, d++) {
    const i = row * 9 + c;
    targets.push({ index: i, delayMs: d * stepMs });
    if (stopAtDuplicate && values[i] === digit) break;
  }
  for (let r = row - 1, d = 1; r >= 0; r--, d++) {
    const i = r * 9 + col;
    targets.push({ index: i, delayMs: d * stepMs });
    if (stopAtDuplicate && values[i] === digit) break;
  }
  for (let r = row + 1, d = 1; r <= 8; r++, d++) {
    const i = r * 9 + col;
    targets.push({ index: i, delayMs: d * stepMs });
    if (stopAtDuplicate && values[i] === digit) break;
  }

  return targets;
}

/** The 9 cell indices of the 3x3 box containing `index`. */
export function boxCells(index: number): number[] {
  const boxRow = Math.floor(rowOf(index) / 3) * 3;
  const boxCol = Math.floor(colOf(index) / 3) * 3;
  const cells: number[] = [];
  for (let r = boxRow; r < boxRow + 3; r++) {
    for (let c = boxCol; c < boxCol + 3; c++) cells.push(r * 9 + c);
  }
  return cells;
}

/**
 * The other 8 cells of `index`'s 3x3 box, tagged with their Chebyshev
 * (8-directional, diagonals included) distance from it — a flood radiating
 * outward through the box rather than a straight line.
 */
export function computeBoxRipple(index: number, stepMs: number): { index: number; delayMs: number }[] {
  const row = rowOf(index);
  const col = colOf(index);
  const targets: { index: number; delayMs: number }[] = [];
  for (const i of boxCells(index)) {
    if (i === index) continue;
    const distance = Math.max(Math.abs(rowOf(i) - row), Math.abs(colOf(i) - col));
    targets.push({ index: i, delayMs: distance * stepMs });
  }
  return targets;
}
