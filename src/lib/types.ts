import { z } from 'zod';

const YearMonth = z.string().regex(/^\d{4}-\d{2}$/, 'expected YYYY-MM');
const IsoDateTime = z.string().datetime();
const HexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/);

export const NarrativeSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  color: HexColor,
  emergedAt: YearMonth,
  retiredAt: YearMonth.nullable(),
  keywords: z.array(z.string().min(1)).min(1),
  defillamaCategory: z.string().optional(),
  relatedTokens: z.array(z.string()).optional(),
});
export type Narrative = z.infer<typeof NarrativeSchema>;

export const NarrativesFileSchema = z.array(NarrativeSchema);

export const MindsharePointSchema = z.object({
  date: YearMonth,
  score: z.number().min(0).max(100),
});
export type MindsharePoint = z.infer<typeof MindsharePointSchema>;

export const MindshareSeriesSchema = z.object({
  narrativeId: z.string(),
  points: z.array(MindsharePointSchema),
});
export type MindshareSeries = z.infer<typeof MindshareSeriesSchema>;

export const MindshareFileSchema = z.object({
  generatedAt: IsoDateTime,
  series: z.array(MindshareSeriesSchema),
});
export type MindshareFile = z.infer<typeof MindshareFileSchema>;

export const HistoricalSeedSchema = z.record(
  z.string(),
  z.array(MindsharePointSchema),
);
export type HistoricalSeed = z.infer<typeof HistoricalSeedSchema>;

export type TrendDirection = 'up' | 'flat' | 'down' | 'new';

export interface TrendResult {
  direction: TrendDirection;
  deltaPct: number | null;
}

export type ZoomLevel = 'monthly' | 'weekly' | 'daily';
