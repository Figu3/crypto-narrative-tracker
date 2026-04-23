import { addWeeks, differenceInWeeks, format, parse, startOfWeek } from 'date-fns';
import type { MindsharePoint } from './types';

export function aggregateToMonthly(points: MindsharePoint[]): MindsharePoint[] {
  return [...points].sort((a, b) => a.date.localeCompare(b.date));
}

export function aggregateToWeekly(points: MindsharePoint[]): MindsharePoint[] {
  if (points.length < 2) return points;
  const sorted = aggregateToMonthly(points);
  const out: MindsharePoint[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i]!;
    const b = sorted[i + 1]!;
    const aDate = parse(a.date, 'yyyy-MM', new Date());
    const bDate = parse(b.date, 'yyyy-MM', new Date());
    const weeks = Math.max(1, differenceInWeeks(bDate, aDate));
    for (let w = 0; w <= weeks; w++) {
      if (i > 0 && w === 0) continue;
      const t = w / weeks;
      const score = a.score + (b.score - a.score) * t;
      const date = format(startOfWeek(addWeeks(aDate, w), { weekStartsOn: 1 }), 'yyyy-MM-dd');
      out.push({ date: date.slice(0, 7), score });
    }
  }
  return out;
}

export function filterByRange(
  points: MindsharePoint[],
  start: string,
  end: string,
): MindsharePoint[] {
  return points.filter((p) => p.date >= start && p.date <= end);
}
