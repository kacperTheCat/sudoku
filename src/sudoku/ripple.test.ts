import { describe, it, expect } from 'vitest';
import { computeLineRipple, boxCells, computeBoxRipple, columnCells, computeColumnRipple } from './ripple';

function byIndex(targets: { index: number; delayMs: number }[]) {
  return new Map(targets.map((t) => [t.index, t.delayMs]));
}

describe('computeLineRipple', () => {
  it('reaches the board edges in all 4 directions from a center cell', () => {
    const origin = 40; // row4, col4 — dead center
    const targets = computeLineRipple(origin, 5, new Array(81).fill(0), false, 10);
    // 4 left + 4 right + 4 up + 4 down = 16, none of them the origin itself
    expect(targets).toHaveLength(16);
    expect(targets.some((t) => t.index === origin)).toBe(false);

    const byIdx = byIndex(targets);
    expect(byIdx.get(39)).toBe(10); // one step left
    expect(byIdx.get(36)).toBe(40); // four steps left (edge, col0)
    expect(byIdx.get(44)).toBe(40); // four steps right (edge, col8)
    expect(byIdx.get(4)).toBe(40); // four rows up (edge, row0)
    expect(byIdx.get(76)).toBe(40); // four rows down (edge, row8)
  });

  it('produces only the 2 directions that exist from a corner cell', () => {
    const origin = 0; // row0, col0
    const targets = computeLineRipple(origin, 5, new Array(81).fill(0), false, 10);
    expect(targets).toHaveLength(16); // 8 right + 8 down, 0 left, 0 up
    expect(targets.every((t) => t.index !== origin)).toBe(true);
  });

  it('stops each direction at the first cell already holding the digit', () => {
    const origin = 40; // row4, col4
    const values = new Array(81).fill(0);
    values[43] = 7; // 3 steps right of origin (row4, col7)
    const targets = computeLineRipple(origin, 7, values, true, 10);
    const byIdx = byIndex(targets);

    // Right direction stopped exactly at the duplicate, 3 steps away.
    expect(byIdx.get(41)).toBe(10);
    expect(byIdx.get(42)).toBe(20);
    expect(byIdx.get(43)).toBe(30);
    expect(byIdx.has(44)).toBe(false); // never reached — stopped before the edge

    // Other directions found no duplicate, so they still ran all the way to the edge.
    expect(byIdx.get(36)).toBe(40); // left edge
    expect(byIdx.get(4)).toBe(40); // top edge
    expect(byIdx.get(76)).toBe(40); // bottom edge
  });
});

describe('boxCells', () => {
  it('returns the 9 cells of the containing 3x3 box', () => {
    expect(new Set(boxCells(0))).toEqual(new Set([0, 1, 2, 9, 10, 11, 18, 19, 20]));
    expect(new Set(boxCells(40))).toEqual(new Set([30, 31, 32, 39, 40, 41, 48, 49, 50]));
  });
});

describe('computeBoxRipple', () => {
  it('puts all 8 neighbors at distance 1 from the box center', () => {
    const targets = computeBoxRipple(40, 10); // center of its box
    expect(targets).toHaveLength(8);
    expect(targets.every((t) => t.delayMs === 10)).toBe(true);
  });

  it('uses Chebyshev distance from a box corner', () => {
    const targets = computeBoxRipple(0, 10); // top-left corner of box 0
    const byIdx = byIndex(targets);
    expect(byIdx.get(1)).toBe(10); // adjacent, distance 1
    expect(byIdx.get(9)).toBe(10); // adjacent, distance 1
    expect(byIdx.get(10)).toBe(10); // diagonal adjacent, distance 1
    expect(byIdx.get(2)).toBe(20); // 2 columns away, distance 2
    expect(byIdx.get(20)).toBe(20); // opposite corner, distance 2
  });
});

describe('columnCells', () => {
  it('returns the 9 cells of the containing column', () => {
    expect(columnCells(4)).toEqual([4, 13, 22, 31, 40, 49, 58, 67, 76]);
  });
});

describe('computeColumnRipple', () => {
  it('radiates up and down by row distance', () => {
    const targets = computeColumnRipple(40, 10); // row4, col4
    expect(targets).toHaveLength(8);
    const byIdx = byIndex(targets);
    expect(byIdx.get(4)).toBe(40); // row0, 4 rows up
    expect(byIdx.get(76)).toBe(40); // row8, 4 rows down
    expect(byIdx.get(31)).toBe(10); // row3, 1 row up
    expect(byIdx.get(49)).toBe(10); // row5, 1 row down
  });
});
