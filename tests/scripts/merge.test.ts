import { describe, it, expect } from 'vitest';
import { mergeSeries, blendScore } from '../../scripts/lib/merge';
import type { HistoricalSeed, Narrative } from '../../src/lib/types';

describe('blendScore', () => {
  it('uses 0.7 gt + 0.3 tvl when tvl is defined', () => {
    expect(blendScore(100, 0)).toBeCloseTo(70);
    expect(blendScore(0, 100)).toBeCloseTo(30);
    expect(blendScore(50, 50)).toBeCloseTo(50);
  });

  it('uses gt only when tvl is null', () => {
    expect(blendScore(42, null)).toBe(42);
  });
});

describe('mergeSeries', () => {
  const nar: Narrative[] = [
    { id: 'x', label: 'X', color: '#000000', emergedAt: '2024-10', retiredAt: null, keywords: ['x'] },
  ];
  const seed: HistoricalSeed = {
    x: [{ date: '2017-06', score: 50 }],
  };

  it('seed + fresh points merge by (id, date), fresh wins on conflict post-2023', () => {
    const fresh = new Map([['x', [{ date: '2024-10', score: 80 }]]]);
    const out = mergeSeries(nar, seed, fresh);
    const xSeries = out.find((s) => s.narrativeId === 'x')!;
    expect(xSeries.points).toContainEqual({ date: '2017-06', score: 50 });
    expect(xSeries.points).toContainEqual({ date: '2024-10', score: 80 });
  });

  it('never overwrites any period before 2023-01', () => {
    const seedOld: HistoricalSeed = { x: [{ date: '2021-06', score: 10 }] };
    const fresh = new Map([['x', [{ date: '2021-06', score: 99 }]]]);
    const out = mergeSeries(nar, seedOld, fresh);
    const xSeries = out.find((s) => s.narrativeId === 'x')!;
    expect(xSeries.points).toContainEqual({ date: '2021-06', score: 10 });
    expect(xSeries.points).not.toContainEqual({ date: '2021-06', score: 99 });
  });

  it('skips points before emergedAt and after retiredAt', () => {
    const ret: Narrative[] = [{ ...nar[0]!, emergedAt: '2024-10', retiredAt: '2024-11' }];
    const fresh = new Map([['x', [{ date: '2024-09', score: 50 }, { date: '2024-10', score: 60 }, { date: '2024-12', score: 70 }]]]);
    const out = mergeSeries(ret, {}, fresh);
    expect(out[0]!.points.map((p) => p.date)).toEqual(['2024-10']);
  });
});
