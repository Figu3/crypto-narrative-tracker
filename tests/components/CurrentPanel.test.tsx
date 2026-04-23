import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CurrentPanel } from '@/components/CurrentPanel';
import type { MindshareSeries, Narrative } from '@/lib/types';

const narratives: Narrative[] = [
  { id: 'a', label: 'Alpha', color: '#ff0000', emergedAt: '2024-01', retiredAt: null, keywords: ['a'] },
  { id: 'b', label: 'Beta', color: '#00ff00', emergedAt: '2024-01', retiredAt: null, keywords: ['b'] },
];
const series: MindshareSeries[] = [
  { narrativeId: 'a', points: [
    { date: '2024-01', score: 10 }, { date: '2024-02', score: 10 },
    { date: '2024-03', score: 10 }, { date: '2024-04', score: 10 },
    { date: '2024-05', score: 30 }, { date: '2024-06', score: 30 },
    { date: '2024-07', score: 30 }, { date: '2024-08', score: 30 },
  ] },
  { narrativeId: 'b', points: [
    { date: '2024-01', score: 50 }, { date: '2024-02', score: 50 },
    { date: '2024-03', score: 50 }, { date: '2024-04', score: 50 },
    { date: '2024-05', score: 50 }, { date: '2024-06', score: 50 },
    { date: '2024-07', score: 50 }, { date: '2024-08', score: 50 },
  ] },
];

describe('CurrentPanel', () => {
  it('ranks narratives by latest score', () => {
    render(<CurrentPanel narratives={narratives} series={series} />);
    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('Beta');
    expect(items[1]).toHaveTextContent('Alpha');
  });

  it('shows an up arrow for rising narratives', () => {
    render(<CurrentPanel narratives={narratives} series={series} />);
    expect(screen.getByText(/Alpha/).closest('li')).toHaveTextContent('↑');
  });
});
