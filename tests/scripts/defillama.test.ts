import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchCategoryTvlShares } from '../../scripts/lib/defillama';

const globalFetch = global.fetch;

describe('fetchCategoryTvlShares', () => {
  beforeEach(() => {
    global.fetch = globalFetch;
  });

  it('returns a map of category → 0..100 normalized share', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        { name: 'Lido', category: 'Liquid Staking', chainTvls: {}, tvl: 20000 },
        { name: 'Ondo', category: 'RWA', chainTvls: {}, tvl: 10000 },
      ],
    }) as unknown as typeof fetch;

    const out = await fetchCategoryTvlShares(['Liquid Staking', 'RWA']);
    expect(out['Liquid Staking']).toBeCloseTo(100);
    expect(out['RWA']).toBeCloseTo(50);
  });

  it('returns 0 for categories with no matching protocols', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ name: 'Lido', category: 'Liquid Staking', tvl: 1000 }],
    }) as unknown as typeof fetch;
    const out = await fetchCategoryTvlShares(['Liquid Staking', 'Ghost Category']);
    expect(out['Ghost Category']).toBe(0);
  });
});
