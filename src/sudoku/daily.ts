import type { Difficulty } from './types';

/** Fixed difficulty for the daily challenge — one puzzle, no picker. */
export const DAILY_DIFFICULTY: Difficulty = 'medium';

function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Local calendar date, not UTC — "today" should match the player's day. */
export function todayDateKey(): string {
  return dateKey(new Date());
}

export function yesterdayDateKey(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return dateKey(d);
}
