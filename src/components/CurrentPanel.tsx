'use client';
import { computeTrend } from '@/lib/trend';
import type { MindshareSeries, Narrative, TrendDirection } from '@/lib/types';

interface Props {
  narratives: Narrative[];
  series: MindshareSeries[];
  onHighlight?: (id: string) => void;
}

const ARROW: Record<TrendDirection, string> = {
  up: '↑',
  flat: '→',
  down: '↓',
  new: '↑ NEW',
};

export function CurrentPanel({ narratives, series, onHighlight }: Props) {
  const now = new Date().toISOString().slice(0, 7);

  const rows = narratives
    .filter((n) => !n.retiredAt)
    .map((n) => {
      const s = series.find((x) => x.narrativeId === n.id);
      const latest = s?.points.find((p) => p.date === now) ?? s?.points.at(-1);
      const trend = s ? computeTrend(s.points) : { direction: 'flat' as TrendDirection, deltaPct: null };
      return { narrative: n, score: latest?.score ?? 0, trend };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  return (
    <aside className="w-64 p-4 space-y-2">
      <h2 className="text-sm font-semibold uppercase text-neutral-400">Right Now</h2>
      <ol className="space-y-1" role="list">
        {rows.map((r, i) => (
          <li
            key={r.narrative.id}
            role="listitem"
            className="flex items-center gap-2 cursor-pointer hover:bg-neutral-800 rounded px-2 py-1"
            onClick={() => onHighlight?.(r.narrative.id)}
          >
            <span className="w-6 text-neutral-500">{i + 1}</span>
            <span className="w-3 h-3 rounded" style={{ background: r.narrative.color }} />
            <span className="flex-1 truncate">{r.narrative.label}</span>
            <span className="text-xs text-neutral-400">
              {ARROW[r.trend.direction]}
              {r.trend.deltaPct !== null && ` ${r.trend.deltaPct >= 0 ? '+' : ''}${r.trend.deltaPct.toFixed(0)}%`}
            </span>
          </li>
        ))}
      </ol>
    </aside>
  );
}
