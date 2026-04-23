import { describe, it, expect } from 'vitest';
import { NarrativeSchema, MindshareFileSchema, HistoricalSeedSchema } from '@/lib/types';

describe('NarrativeSchema', () => {
  it('accepts a valid narrative', () => {
    const valid = {
      id: 'ai-agents',
      label: 'AI Agents',
      color: '#8b5cf6',
      emergedAt: '2024-10',
      retiredAt: null,
      keywords: ['ai agents crypto'],
      defillamaCategory: 'AI Agents',
      relatedTokens: ['VIRTUAL'],
    };
    expect(() => NarrativeSchema.parse(valid)).not.toThrow();
  });

  it('rejects invalid date format', () => {
    const bad = {
      id: 'x',
      label: 'X',
      color: '#000000',
      emergedAt: '2024/10',
      retiredAt: null,
      keywords: ['x'],
    };
    expect(() => NarrativeSchema.parse(bad)).toThrow();
  });

  it('rejects empty keywords', () => {
    const bad = {
      id: 'x',
      label: 'X',
      color: '#000000',
      emergedAt: '2024-10',
      retiredAt: null,
      keywords: [],
    };
    expect(() => NarrativeSchema.parse(bad)).toThrow();
  });
});

describe('MindshareFileSchema', () => {
  it('accepts a valid mindshare file', () => {
    const valid = {
      generatedAt: '2026-04-23T00:00:00Z',
      series: [
        { narrativeId: 'x', points: [{ date: '2024-10', score: 50 }] },
      ],
    };
    expect(() => MindshareFileSchema.parse(valid)).not.toThrow();
  });

  it('rejects score out of range', () => {
    const bad = {
      generatedAt: '2026-04-23T00:00:00Z',
      series: [{ narrativeId: 'x', points: [{ date: '2024-10', score: 101 }] }],
    };
    expect(() => MindshareFileSchema.parse(bad)).toThrow();
  });
});

describe('HistoricalSeedSchema', () => {
  it('accepts a record of narrativeId → points[]', () => {
    const valid = {
      'defi-summer': [{ date: '2020-06', score: 45 }],
      'ai-agents': [],
    };
    expect(() => HistoricalSeedSchema.parse(valid)).not.toThrow();
  });
});
