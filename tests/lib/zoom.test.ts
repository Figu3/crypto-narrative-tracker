import { describe, it, expect } from 'vitest';
import { aggregateToMonthly, aggregateToWeekly, filterByRange } from '@/lib/zoom';
import type { MindsharePoint } from '@/lib/types';

describe('aggregateToMonthly', () => {
  it('returns monthly points sorted by date', () => {
    const pts: MindsharePoint[] = [
      { date: '2024-11', score: 60 },
      { date: '2024-10', score: 50 },
    ];
    expect(aggregateToMonthly(pts)).toEqual([
      { date: '2024-10', score: 50 },
      { date: '2024-11', score: 60 },
    ]);
  });

  it('is a noop for empty input', () => {
    expect(aggregateToMonthly([])).toEqual([]);
  });
});

describe('aggregateToWeekly', () => {
  it('interpolates additional points from monthly via linear interpolation', () => {
    const monthly: MindsharePoint[] = [
      { date: '2024-10', score: 0 },
      { date: '2024-11', score: 100 },
    ];
    const weekly = aggregateToWeekly(monthly);
    expect(weekly.length).toBeGreaterThan(monthly.length);
    expect(weekly[0]?.score).toBe(0);
    expect(weekly[weekly.length - 1]?.score).toBe(100);
    for (let i = 1; i < weekly.length; i++) {
      expect(weekly[i]!.score).toBeGreaterThanOrEqual(weekly[i - 1]!.score);
    }
  });
});

describe('filterByRange', () => {
  it('returns points within [start, end] inclusive', () => {
    const pts: MindsharePoint[] = [
      { date: '2024-09', score: 10 },
      { date: '2024-10', score: 20 },
      { date: '2024-11', score: 30 },
    ];
    expect(filterByRange(pts, '2024-10', '2024-11')).toEqual([
      { date: '2024-10', score: 20 },
      { date: '2024-11', score: 30 },
    ]);
  });
});
