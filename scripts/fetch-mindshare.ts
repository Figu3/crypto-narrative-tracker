import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchInterestOverTime } from './lib/google-trends';
import { fetchCategoryTvlShares } from './lib/defillama';
import { blendScore, mergeSeries } from './lib/merge';
import {
  HistoricalSeedSchema,
  MindshareFileSchema,
  NarrativesFileSchema,
  type MindsharePoint,
  type Narrative,
} from '../src/lib/types';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DATA = path.join(ROOT, 'data');

async function main() {
  const narratives = NarrativesFileSchema.parse(
    JSON.parse(await readFile(path.join(DATA, 'narratives.json'), 'utf-8')),
  );
  const seed = HistoricalSeedSchema.parse(
    JSON.parse(await readFile(path.join(DATA, 'historical-seed.json'), 'utf-8')),
  );

  const errors: { narrativeId: string; source: 'google-trends' | 'defillama'; message: string; at: string }[] = [];

  const categories = narratives
    .map((n) => n.defillamaCategory)
    .filter((c): c is string => typeof c === 'string');
  let tvlShares: Record<string, number> = {};
  try {
    tvlShares = await fetchCategoryTvlShares(categories);
  } catch (err) {
    errors.push({ narrativeId: '*', source: 'defillama', message: String(err), at: new Date().toISOString() });
  }

  const today = new Date();
  const endDate = today.toISOString().slice(0, 10);
  const startDate = '2023-01-01';

  const fresh = new Map<string, MindsharePoint[]>();
  for (const n of narratives) {
    await new Promise((r) => setTimeout(r, 2000));
    try {
      const gt = await fetchInterestOverTime(n.keywords, { startDate, endDate });
      const tvl = n.defillamaCategory ? tvlShares[n.defillamaCategory] ?? null : null;
      const blended: MindsharePoint[] = gt.map((p) => {
        const isCurrentMonth = p.date === today.toISOString().slice(0, 7);
        return { date: p.date, score: blendScore(p.score, isCurrentMonth ? tvl : null) };
      });
      fresh.set(n.id, blended);
    } catch (err) {
      errors.push({ narrativeId: n.id, source: 'google-trends', message: String(err), at: new Date().toISOString() });
    }
  }

  const series = mergeSeries(narratives as Narrative[], seed, fresh);
  const payload = MindshareFileSchema.parse({
    generatedAt: new Date().toISOString(),
    series,
  });

  await writeFile(path.join(DATA, 'mindshare.json'), JSON.stringify(payload, null, 2));

  const prior = await readFile(path.join(DATA, 'fetch-errors.json'), 'utf-8').catch(() => '[]');
  const priorErrors = JSON.parse(prior) as unknown[];
  await writeFile(
    path.join(DATA, 'fetch-errors.json'),
    JSON.stringify([...priorErrors.slice(-500), ...errors], null, 2),
  );

  console.log(`wrote mindshare.json with ${series.length} series; ${errors.length} fetch errors`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
