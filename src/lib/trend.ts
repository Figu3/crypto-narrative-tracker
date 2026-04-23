import type { MindsharePoint, TrendResult } from './types';

const WINDOW = 4;
const THRESHOLD_PCT = 10;

export function computeTrend(points: MindsharePoint[]): TrendResult {
  if (points.length < WINDOW * 2) {
    return { direction: 'flat', deltaPct: null };
  }
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
  const tail = sorted.slice(-WINDOW * 2);
  const prior = mean(tail.slice(0, WINDOW).map((p) => p.score));
  const recent = mean(tail.slice(WINDOW).map((p) => p.score));

  if (prior === 0) {
    return recent > 0 ? { direction: 'new', deltaPct: null } : { direction: 'flat', deltaPct: 0 };
  }

  const delta = ((recent - prior) / prior) * 100;
  if (delta > THRESHOLD_PCT) return { direction: 'up', deltaPct: delta };
  if (delta < -THRESHOLD_PCT) return { direction: 'down', deltaPct: delta };
  return { direction: 'flat', deltaPct: delta };
}

function mean(xs: number[]): number {
  if (xs.length === 0) return 0;
  return xs.reduce((s, x) => s + x, 0) / xs.length;
}
