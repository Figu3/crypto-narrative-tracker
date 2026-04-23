'use client';
import { scaleLinear, scaleTime } from '@visx/scale';
import { Group } from '@visx/group';
import { AreaStack } from '@visx/shape';
import { ParentSize } from '@visx/responsive';
import { useTooltip, TooltipWithBounds } from '@visx/tooltip';
import { useMemo } from 'react';
import type { MindshareSeries, Narrative } from '@/lib/types';

interface Props {
  narratives: Narrative[];
  series: MindshareSeries[];
  highlightedId?: string | null;
  onHighlight?: (id: string | null) => void;
}

interface StackRow {
  date: Date;
  [narrativeId: string]: number | Date;
}

export function Streamgraph(props: Props) {
  return (
    <ParentSize>
      {({ width, height }) => <StreamgraphInner {...props} width={width} height={height} />}
    </ParentSize>
  );
}

function StreamgraphInner({
  narratives,
  series,
  highlightedId,
  onHighlight,
  width,
  height,
}: Props & { width: number; height: number }) {
  const { rows, ids, dateRange, maxTotal } = useMemo(() => buildRows(series), [series]);
  const tooltip = useTooltip<{ narrativeId: string; date: Date; score: number }>();

  const xScale = scaleTime({ domain: dateRange, range: [0, width] });
  const halfExtent = Math.max(1, maxTotal / 2);
  const yScale = scaleLinear({ domain: [-halfExtent, halfExtent], range: [height, 0] });

  if (rows.length === 0) {
    return (
      <svg width={width} height={height}>
        <text x={width / 2} y={height / 2} textAnchor="middle" fill="#737373">
          No data for this range
        </text>
      </svg>
    );
  }

  return (
    <svg width={width} height={height}>
      <Group>
        <AreaStack<StackRow>
          keys={ids}
          data={rows}
          x={(d) => xScale(d.data.date as Date) ?? 0}
          y0={(d) => yScale(d[0]) ?? 0}
          y1={(d) => yScale(d[1]) ?? 0}
          offset="silhouette"
        >
          {({ stacks, path }) =>
            stacks.map((stack) => {
              const narrative = narratives.find((n) => n.id === stack.key);
              if (!narrative) return null;
              const dimmed = highlightedId && highlightedId !== stack.key;
              return (
                <path
                  key={`stack-${stack.key}`}
                  d={path(stack) || ''}
                  fill={narrative.color}
                  fillOpacity={dimmed ? 0.15 : 0.85}
                  stroke="transparent"
                  onMouseEnter={() => onHighlight?.(stack.key as string)}
                  onMouseLeave={() => onHighlight?.(null)}
                />
              );
            })
          }
        </AreaStack>
      </Group>
      {tooltip.tooltipData && (
        <TooltipWithBounds top={tooltip.tooltipTop ?? 0} left={tooltip.tooltipLeft ?? 0}>
          {tooltip.tooltipData.narrativeId}: {tooltip.tooltipData.score.toFixed(0)}
        </TooltipWithBounds>
      )}
    </svg>
  );
}

function buildRows(series: MindshareSeries[]) {
  const allDates = new Set<string>();
  for (const s of series) for (const p of s.points) allDates.add(p.date);
  const sortedDates = [...allDates].sort();

  const ids = series.map((s) => s.narrativeId);

  let maxTotal = 0;
  const rows: StackRow[] = sortedDates.map((d) => {
    const row: StackRow = { date: new Date(`${d}-01`) };
    let total = 0;
    for (const s of series) {
      const pt = s.points.find((p) => p.date === d);
      const v = pt?.score ?? 0;
      row[s.narrativeId] = v;
      total += v;
    }
    if (total > maxTotal) maxTotal = total;
    return row;
  });

  const firstRow = rows[0];
  const lastRow = rows[rows.length - 1];
  const dateRange: [Date, Date] =
    firstRow && lastRow
      ? [firstRow.date as Date, lastRow.date as Date]
      : [new Date(), new Date()];
  return { rows, ids, dateRange, maxTotal };
}
