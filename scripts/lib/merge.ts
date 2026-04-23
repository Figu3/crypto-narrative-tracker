import type {
  HistoricalSeed,
  MindsharePoint,
  MindshareSeries,
  Narrative,
} from '../../src/lib/types';

const SEED_CUTOFF = '2023-01';
const GT_WEIGHT = 0.7;
const TVL_WEIGHT = 0.3;

export function blendScore(gt: number, tvl: number | null): number {
  if (tvl === null) return clamp(gt);
  return clamp(GT_WEIGHT * gt + TVL_WEIGHT * tvl);
}

export function mergeSeries(
  narratives: Narrative[],
  seed: HistoricalSeed,
  fresh: Map<string, MindsharePoint[]>,
): MindshareSeries[] {
  return narratives.map((n) => {
    const seedPts = seed[n.id] ?? [];
    const freshPts = fresh.get(n.id) ?? [];

    const byDate = new Map<string, number>();
    // Seed is authoritative history — always kept, never filtered by emergedAt.
    for (const p of seedPts) byDate.set(p.date, p.score);
    // Fresh points only apply post-cutoff and within the narrative's lifetime window.
    for (const p of freshPts) {
      if (p.date < SEED_CUTOFF) continue;
      if (p.date < n.emergedAt) continue;
      if (n.retiredAt && p.date > n.retiredAt) continue;
      byDate.set(p.date, p.score);
    }

    const points = [...byDate.entries()]
      .map(([date, score]) => ({ date, score }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return { narrativeId: n.id, points };
  });
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, n));
}
