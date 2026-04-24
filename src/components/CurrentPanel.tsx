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

function formatMonth(ym: string): string {
  const [y, m] = ym.split('-');
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${monthNames[Number(m) - 1]} '${y!.slice(2)}`;
}

export function CurrentPanel({ narratives, series, onHighlight }: Props) {
  const now = new Date().toISOString().slice(0, 7);

  const active = narratives
    .filter((n) => !n.retiredAt)
    .map((n) => {
      const s = series.find((x) => x.narrativeId === n.id);
      const latest = s?.points.find((p) => p.date === now) ?? s?.points.at(-1);
      const trend = s ? computeTrend(s.points) : { direction: 'flat' as TrendDirection, deltaPct: null };
      return { narrative: n, score: latest?.score ?? 0, trend };
    })
    .sort((a, b) => b.score - a.score);

  const past = narratives
    .filter((n): n is Narrative & { retiredAt: string } => typeof n.retiredAt === 'string')
    .map((n) => {
      const s = series.find((x) => x.narrativeId === n.id);
      const peak = s?.points.reduce((m, p) => (p.score > m ? p.score : m), 0) ?? 0;
      return { narrative: n, peak };
    })
    .sort((a, b) => b.narrative.retiredAt.localeCompare(a.narrative.retiredAt));

  return (
    <aside className="w-64 p-4 space-y-4 overflow-y-auto">
      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase text-neutral-400">Right Now</h2>
        <ol className="space-y-1" role="list">
          {active.map((r, i) => (
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
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase text-neutral-400">Past Narratives</h2>
        <ol className="space-y-1" role="list">
          {past.map((r) => (
            <li
              key={r.narrative.id}
              role="listitem"
              className="flex items-center gap-2 cursor-pointer hover:bg-neutral-800 rounded px-2 py-1 opacity-75"
              onClick={() => onHighlight?.(r.narrative.id)}
            >
              <span className="w-3 h-3 rounded flex-shrink-0" style={{ background: r.narrative.color }} />
              <span className="flex-1 truncate">{r.narrative.label}</span>
              <span className="text-xs text-neutral-500 whitespace-nowrap">
                {formatMonth(r.narrative.emergedAt)}–{formatMonth(r.narrative.retiredAt)}
              </span>
            </li>
          ))}
        </ol>
      </section>
    </aside>
  );
}
