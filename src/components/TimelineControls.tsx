'use client';
import type { ZoomLevel } from '@/lib/types';

interface Props {
  zoom: ZoomLevel;
  onZoomChange: (z: ZoomLevel) => void;
  rangeStart: string;
  rangeEnd: string;
  onRangeChange: (start: string, end: string) => void;
  minDate: string;
  maxDate: string;
}

export function TimelineControls(props: Props) {
  const levels: ZoomLevel[] = ['monthly', 'weekly', 'daily'];
  return (
    <div className="flex items-center gap-4 p-2 border-b border-neutral-800">
      <div className="flex gap-1">
        {levels.map((l) => (
          <button
            key={l}
            onClick={() => props.onZoomChange(l)}
            className={`px-3 py-1 text-xs rounded capitalize ${
              props.zoom === l ? 'bg-neutral-700' : 'bg-neutral-900 hover:bg-neutral-800'
            }`}
          >
            {l}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2 text-xs">
        <input
          type="month"
          value={props.rangeStart}
          min={props.minDate}
          max={props.maxDate}
          onChange={(e) => props.onRangeChange(e.target.value, props.rangeEnd)}
          className="bg-neutral-900 border border-neutral-700 rounded px-2 py-1"
        />
        <span>→</span>
        <input
          type="month"
          value={props.rangeEnd}
          min={props.minDate}
          max={props.maxDate}
          onChange={(e) => props.onRangeChange(props.rangeStart, e.target.value)}
          className="bg-neutral-900 border border-neutral-700 rounded px-2 py-1"
        />
      </div>
    </div>
  );
}
