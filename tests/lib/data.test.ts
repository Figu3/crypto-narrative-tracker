import { describe, it, expect } from 'vitest';
import { loadNarratives, loadMindshare } from '@/lib/data';

describe('loadNarratives', () => {
  it('returns schema-validated narratives', () => {
    const narratives = loadNarratives();
    expect(narratives.length).toBeGreaterThan(20);
    expect(narratives.every((n) => n.id && n.label && n.color)).toBe(true);
  });
});

describe('loadMindshare', () => {
  it('returns schema-validated mindshare', () => {
    const mindshare = loadMindshare();
    expect(mindshare.generatedAt).toBeDefined();
    expect(Array.isArray(mindshare.series)).toBe(true);
  });
});
