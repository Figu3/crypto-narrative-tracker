import { describe, it, expect } from 'vitest';
import narratives from '../../data/narratives.json';
import { NarrativesFileSchema } from '@/lib/types';

describe('data/narratives.json', () => {
  it('parses against the schema', () => {
    expect(() => NarrativesFileSchema.parse(narratives)).not.toThrow();
  });

  it('has unique ids', () => {
    const ids = (narratives as { id: string }[]).map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('contains at least 20 narratives', () => {
    expect((narratives as unknown[]).length).toBeGreaterThanOrEqual(20);
  });
});
