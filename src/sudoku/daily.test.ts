import { describe, expect, it } from 'vitest';
import { applyDailyCompletion, liveCurrentStreak, previousDateKey } from './daily';

describe('previousDateKey', () => {
  it('steps back one day within a month', () => {
    expect(previousDateKey('2026-11-04')).toBe('2026-11-03');
  });

  it('crosses month and year boundaries', () => {
    expect(previousDateKey('2026-03-01')).toBe('2026-02-28');
    expect(previousDateKey('2028-03-01')).toBe('2028-02-29');
    expect(previousDateKey('2027-01-01')).toBe('2026-12-31');
  });

  it('is not shifted by a DST change', () => {
    // Europe switches clocks on the last Sunday of March and October.
    expect(previousDateKey('2026-03-30')).toBe('2026-03-29');
    expect(previousDateKey('2026-10-26')).toBe('2026-10-25');
  });
});

describe('liveCurrentStreak', () => {
  const today = '2026-11-04';

  it('keeps the streak when the last completion was today', () => {
    expect(liveCurrentStreak(5, '2026-11-04', today)).toBe(5);
  });

  it('keeps the streak when the last completion was yesterday', () => {
    expect(liveCurrentStreak(5, '2026-11-03', today)).toBe(5);
  });

  it('drops to 0 once a day has been missed', () => {
    expect(liveCurrentStreak(5, '2026-11-02', today)).toBe(0);
  });

  it('is 0 when nothing was ever completed', () => {
    expect(liveCurrentStreak(0, null, today)).toBe(0);
  });
});

describe('applyDailyCompletion', () => {
  const base = { currentStreak: 3, longestStreak: 4, lastCompletedDate: '2026-11-03' };

  it('extends the streak when the previous day was completed', () => {
    expect(applyDailyCompletion(base, '2026-11-04')).toEqual({
      currentStreak: 4,
      longestStreak: 4,
      lastCompletedDate: '2026-11-04',
    });
  });

  it('raises the record when the streak passes it', () => {
    const next = applyDailyCompletion({ ...base, currentStreak: 4 }, '2026-11-04');
    expect(next.longestStreak).toBe(5);
  });

  it('restarts at 1 after a missed day and keeps the record', () => {
    expect(applyDailyCompletion(base, '2026-11-05')).toEqual({
      currentStreak: 1,
      longestStreak: 4,
      lastCompletedDate: '2026-11-05',
    });
  });

  it('ignores a second completion of the same day', () => {
    const done = { ...base, lastCompletedDate: '2026-11-04' };
    expect(applyDailyCompletion(done, '2026-11-04')).toBe(done);
  });

  it('starts the first streak at 1', () => {
    const fresh = { currentStreak: 0, longestStreak: 0, lastCompletedDate: null };
    expect(applyDailyCompletion(fresh, '2026-11-04')).toEqual({
      currentStreak: 1,
      longestStreak: 1,
      lastCompletedDate: '2026-11-04',
    });
  });
});
