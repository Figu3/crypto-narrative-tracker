'use client';
import { useMemo, useState } from 'react';
import { Streamgraph } from '@/components/Streamgraph';
import { CurrentPanel } from '@/components/CurrentPanel';
import { TimelineControls } from '@/components/TimelineControls';
import { loadMindshare, loadNarratives } from '@/lib/data';
import { aggregateToMonthly, aggregateToWeekly, filterByRange } from '@/lib/zoom';
import type { ZoomLevel } from '@/lib/types';

const narratives = loadNarratives();
const mindshare = loadMindshare();

export default function HomePage() {
  const [zoom, setZoom] = useState<ZoomLevel>('monthly');
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  const { minDate, maxDate } = useMemo(() => {
    let min = '9999-99';
    let max = '0000-00';
    for (const s of mindshare.series) {
      for (const p of s.points) {
        if (p.date < min) min = p.date;
        if (p.date > max) max = p.date;
      }
    }
    if (min === '9999-99') min = '2017-01';
    if (max === '0000-00') max = new Date().toISOString().slice(0, 7);
    return { minDate: min, maxDate: max };
  }, []);
  const [rangeStart, setRangeStart] = useState(minDate);
  const [rangeEnd, setRangeEnd] = useState(maxDate);

  const series = useMemo(() => {
    const aggregator = zoom === 'weekly' || zoom === 'daily' ? aggregateToWeekly : aggregateToMonthly;
    return mindshare.series.map((s) => ({
      narrativeId: s.narrativeId,
      points: filterByRange(aggregator(s.points), rangeStart, rangeEnd),
    }));
  }, [zoom, rangeStart, rangeEnd]);

  return (
    <main className="flex flex-col h-screen">
      <header className="px-4 py-3 border-b border-neutral-800">
        <h1 className="text-lg font-semibold">Crypto Narrative Mindshare</h1>
      </header>
      <TimelineControls
        zoom={zoom}
        onZoomChange={setZoom}
        rangeStart={rangeStart}
        rangeEnd={rangeEnd}
        onRangeChange={(s, e) => { setRangeStart(s); setRangeEnd(e); }}
        minDate={minDate}
        maxDate={maxDate}
      />
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div className="flex-1 min-w-0 h-full">
          <Streamgraph
            narratives={narratives}
            series={series}
            highlightedId={highlightedId}
            onHighlight={setHighlightedId}
          />
        </div>
        <CurrentPanel
          narratives={narratives}
          series={mindshare.series}
          onHighlight={setHighlightedId}
        />
      </div>
      <footer className="px-4 py-2 text-xs text-neutral-500 border-t border-neutral-800" suppressHydrationWarning>
        Data as of {new Date(mindshare.generatedAt).toISOString().slice(0, 10)}
      </footer>
    </main>
  );
}
