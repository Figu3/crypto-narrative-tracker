import gt from 'google-trends-api';
import type { MindsharePoint } from '../../src/lib/types';

export interface FetchOptions {
  startDate: string;
  endDate: string;
  maxAttempts?: number;
  baseDelayMs?: number;
}

interface TimelineEntry {
  formattedAxisTime: string;
  value: number[];
}

export async function fetchInterestOverTime(
  keywords: string[],
  opts: FetchOptions,
): Promise<MindsharePoint[]> {
  const { startDate, endDate, maxAttempts = 5, baseDelayMs = 2000 } = opts;

  const raw = await withBackoff(
    () =>
      gt.interestOverTime({
        keyword: keywords,
        startTime: new Date(startDate),
        endTime: new Date(endDate),
      }),
    maxAttempts,
    baseDelayMs,
  );

  const parsed = JSON.parse(raw) as { default?: { timelineData?: TimelineEntry[] } };
  const timeline = parsed.default?.timelineData ?? [];

  const perSample = timeline.map((e) => ({
    month: e.formattedAxisTime.slice(0, 7),
    score: e.value.reduce((s, v) => s + v, 0) / Math.max(1, e.value.length),
  }));

  const buckets = new Map<string, number[]>();
  for (const s of perSample) {
    const arr = buckets.get(s.month) ?? [];
    arr.push(s.score);
    buckets.set(s.month, arr);
  }

  return [...buckets.entries()]
    .map(([date, xs]) => ({ date, score: xs.reduce((s, v) => s + v, 0) / xs.length }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

async function withBackoff<T>(
  fn: () => Promise<T>,
  maxAttempts: number,
  baseDelayMs: number,
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt === maxAttempts) break;
      const delay = baseDelayMs * 2 ** (attempt - 1);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}
