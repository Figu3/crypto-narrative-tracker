import { describe, it, expect } from 'vitest';
import { computeTrend } from '@/lib/trend';
import type { MindsharePoint } from '@/lib/types';

const win = (scores: number[]): MindsharePoint[] =>
  scores.map((s, i) => ({ date: `2024-${String(i + 1).padStart(2, '0')}`, score: s }));

describe('computeTrend', () => {
  it('returns "up" when recent window mean > +10% over prior', () => {
    const pts = win([10, 10, 10, 10, 20, 20, 20, 20]);
    const t = computeTrend(pts);
    expect(t.direction).toBe('up');
    expect(t.deltaPct).toBeCloseTo(100);
  });

  it('returns "down" when recent window mean < -10% vs prior', () => {
    const pts = win([50, 50, 50, 50, 20, 20, 20, 20]);
    const t = computeTrend(pts);
    expect(t.direction).toBe('down');
  });

  it('returns "flat" when change is within ±10%', () => {
    const pts = win([50, 50, 50, 50, 52, 53, 51, 50]);
    const t = computeTrend(pts);
    expect(t.direction).toBe('flat');
  });

  it('returns "new" when prior mean is 0 and recent > 0', () => {
    const pts = win([0, 0, 0, 0, 10, 20, 30, 40]);
    const t = computeTrend(pts);
    expect(t.direction).toBe('new');
    expect(t.deltaPct).toBeNull();
  });

  it('returns "flat" when there are fewer than 8 points', () => {
    const pts = win([10, 20, 30]);
    const t = computeTrend(pts);
    expect(t.direction).toBe('flat');
    expect(t.deltaPct).toBeNull();
  });
});
