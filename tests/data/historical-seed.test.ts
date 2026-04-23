import { describe, it, expect } from 'vitest';
import seed from '../../data/historical-seed.json';
import narratives from '../../data/narratives.json';
import { HistoricalSeedSchema, NarrativesFileSchema } from '@/lib/types';

describe('data/historical-seed.json', () => {
  it('parses against the schema', () => {
    expect(() => HistoricalSeedSchema.parse(seed)).not.toThrow();
  });

  it('only references known narrative ids', () => {
    const known = new Set(
      NarrativesFileSchema.parse(narratives).map((n) => n.id),
    );
    for (const id of Object.keys(seed)) {
      expect(known.has(id)).toBe(true);
    }
  });

  it('every seeded point is in 2017-01..2022-12', () => {
    for (const points of Object.values(seed)) {
      for (const p of points as { date: string }[]) {
        expect(p.date >= '2017-01').toBe(true);
        expect(p.date <= '2022-12').toBe(true);
      }
    }
  });
});
