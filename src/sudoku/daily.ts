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

/**
 * The calendar day before `key` ("YYYY-MM-DD"). Built through the local
 * Date constructor, which normalizes day 0 into the previous month/year, so
 * month ends, leap days and DST shifts need no special cases.
 */
export function previousDateKey(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  return dateKey(new Date(y, m - 1, d - 1));
}

export interface StreakState {
  currentStreak: number;
  longestStreak: number;
  lastCompletedDate: string | null;
}

/**
 * Credits a completed daily puzzle to `puzzleDate`, the day the puzzle
 * belongs to (not the wall clock at completion time). The streak grows only
 * if the previous credited day is the day right before it; completing the
 * same day twice changes nothing.
 */
export function applyDailyCompletion<T extends StreakState>(streak: T, puzzleDate: string): T {
  if (streak.lastCompletedDate === puzzleDate) return streak;
  const currentStreak = streak.lastCompletedDate === previousDateKey(puzzleDate) ? streak.currentStreak + 1 : 1;
  return {
    ...streak,
    currentStreak,
    longestStreak: Math.max(streak.longestStreak, currentStreak),
    lastCompletedDate: puzzleDate,
  };
}

/**
 * The streak as it stands right now, not as it was stored at the last
 * completion. A stored streak is still alive only if its last completion
 * was today or yesterday (today's puzzle can still extend it); after a
 * missed day it is already broken, even though storage only resets it on
 * the next completion.
 */
export function liveCurrentStreak(
  currentStreak: number,
  lastCompletedDate: string | null,
  today: string,
): number {
  if (lastCompletedDate === today || lastCompletedDate === previousDateKey(today)) return currentStreak;
  return 0;
}
