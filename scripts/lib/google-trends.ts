import gt from 'google-trends-api';
import type { MindsharePoint } from '../../src/lib/types';

export interface FetchOptions {
  startDate: string;
  endDate: string;
  maxAttempts?: number;
  baseDelayMs?: number;
}

interface TimelineEntry {
  time?: string;
  formattedAxisTime?: string;
  value: number[];
}

function toYearMonth(entry: TimelineEntry): string | null {
  if (entry.time) {
    const seconds = Number(entry.time);
    if (Number.isFinite(seconds)) {
      return new Date(seconds * 1000).toISOString().slice(0, 7);
    }
  }
  const f = entry.formattedAxisTime;
  if (f && /^\d{4}-\d{2}-\d{2}/.test(f)) return f.slice(0, 7);
  return null;
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

  const buckets = new Map<string, number[]>();
  for (const e of timeline) {
    const month = toYearMonth(e);
    if (!month) continue;
    const score = e.value.reduce((s, v) => s + v, 0) / Math.max(1, e.value.length);
    const arr = buckets.get(month) ?? [];
    arr.push(score);
    buckets.set(month, arr);
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
