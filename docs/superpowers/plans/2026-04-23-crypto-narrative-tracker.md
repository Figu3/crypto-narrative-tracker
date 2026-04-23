# Crypto Narrative Mindshare Tracker — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a static Next.js 16 web app that shows crypto narrative mindshare on a zoomable streamgraph (2017–today) with a "Right Now" panel indicating heating/cooling narratives, fed by a weekly GitHub Actions cron pulling Google Trends + DefiLlama data.

**Architecture:** Two decoupled pieces. (1) A TypeScript cron script that fetches Google Trends + DefiLlama, merges with hand-seeded pre-2023 history, writes `data/mindshare.json`. (2) A Next.js 16 SSG frontend that reads that JSON at build time and renders a Visx streamgraph + right-hand panel. Data script and frontend share `src/lib/types.ts`.

**Tech Stack:** Next.js 16, React 19, TypeScript strict mode, Tailwind CSS, Visx (streamgraph + brush), Vitest (units), Playwright (visual snapshot), Zod (runtime JSON validation), `google-trends-api` (Node), GitHub Actions (weekly cron), Vercel (hosting).

**Working directory:** All paths in this plan are relative to `Personal/_active/crypto-narrative-tracker/` within the `Vibe Coding` workspace.

**Spec reference:** `docs/superpowers/specs/2026-04-23-crypto-narrative-tracker-design.md`

**Locked-in design decisions** (resolved from spec reviewer's advisories):
1. `defillamaTvlShare` rescaling: linear rescale against the max narrative TVL in that period: `(narrativeTvl / maxNarrativeTvlThisPeriod) * 100`.
2. Trend arrow when `prior` window mean = 0 and `recent` > 0: emit direction `new` (display label `↑ NEW`), ranks above all numeric `↑`.
3. Data pipeline language: Node-only, using `google-trends-api`. No Python helper.
4. Per-narrative fetch failure: leave the period gap untouched. Do NOT copy forward. The UI visually interpolates; the underlying data stays honest.
5. Playwright snapshot updates: commit baselines under `tests/e2e/__snapshots__/`. Update with `npm run test:e2e:update`.

---

## File Structure

Frontend + shared:
- `src/lib/types.ts` — Narrative, MindshareSeries, TrendDirection, etc. (shared with scripts/)
- `src/lib/zoom.ts` — monthly/weekly/daily aggregation
- `src/lib/trend.ts` — slope → direction + percentage delta
- `src/lib/data.ts` — build-time loader for `mindshare.json` + `narratives.json`
- `src/components/Streamgraph.tsx` — Visx-based streamgraph
- `src/components/CurrentPanel.tsx` — "Right Now" sidebar
- `src/components/TimelineControls.tsx` — zoom buttons + date brush
- `src/app/page.tsx` — main page, composes the three components
- `src/app/layout.tsx` — root layout, dark mode + fonts

Data:
- `data/narratives.json` — hand-curated narrative definitions (~25)
- `data/historical-seed.json` — sparse pre-2023 monthly scores
- `data/mindshare.json` — generated, committed
- `data/fetch-errors.json` — rolling log of per-narrative fetch failures

Pipeline:
- `scripts/fetch-mindshare.ts` — cron entry point
- `scripts/lib/google-trends.ts` — Google Trends fetcher with backoff
- `scripts/lib/defillama.ts` — DefiLlama category TVL fetcher
- `scripts/lib/merge.ts` — merges seed + fresh fetches into final series

Tests:
- `tests/lib/zoom.test.ts`
- `tests/lib/trend.test.ts`
- `tests/lib/data.test.ts`
- `tests/scripts/merge.test.ts`
- `tests/scripts/google-trends.test.ts` (mocked)
- `tests/scripts/defillama.test.ts` (mocked)
- `tests/e2e/streamgraph.spec.ts` (Playwright)

Config:
- `package.json`, `tsconfig.json`, `vitest.config.ts`, `playwright.config.ts`
- `.github/workflows/refresh-data.yml`
- `next.config.mjs`, `tailwind.config.ts`, `postcss.config.mjs`
- `.gitignore`, `README.md`

---

## Task 1: Scaffold Next.js 16 project

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.mjs`, `tailwind.config.ts`, `postcss.config.mjs`, `.gitignore`
- Create: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`

- [ ] **Step 1: Initialize project**

Run from `Personal/_active/crypto-narrative-tracker/`:
```bash
npx create-next-app@16 . --typescript --tailwind --app --src-dir --import-alias "@/*" --no-eslint --no-turbopack --use-npm
```
Accept all defaults that match. If the generator asks about ESLint, say no (we'll add Biome later if desired).

- [ ] **Step 2: Enable TypeScript strict mode**

Edit `tsconfig.json` — ensure `"strict": true`, and add:
```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true
  }
}
```

- [ ] **Step 3: Verify build works**

Run: `npm run build`
Expected: `✓ Compiled successfully` with no errors.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js 16 + TS strict + Tailwind

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Install and configure Vitest

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json` (scripts + deps)
- Create: `tests/smoke.test.ts`

- [ ] **Step 1: Install deps**

```bash
npm i -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom
```

- [ ] **Step 2: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['tests/setup.ts'],
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
});
```

- [ ] **Step 3: Create `tests/setup.ts`**

```ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 4: Write smoke test `tests/smoke.test.ts`**

```ts
import { describe, it, expect } from 'vitest';

describe('smoke', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 5: Add scripts to `package.json`**

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] **Step 6: Run tests**

Run: `npm test`
Expected: `1 passed`.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "test: set up Vitest with smoke test

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Define shared types

**Files:**
- Create: `src/lib/types.ts`
- Test: `tests/lib/types.test.ts`

- [ ] **Step 1: Write the failing test `tests/lib/types.test.ts`**

```ts
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
```

- [ ] **Step 2: Run to verify fails**

Run: `npm test -- types`
Expected: FAIL (module not found).

- [ ] **Step 3: Install zod**

```bash
npm i zod
```

- [ ] **Step 4: Create `src/lib/types.ts`**

```ts
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
```

- [ ] **Step 5: Run tests**

Run: `npm test -- types`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: define shared types with zod schemas

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Seed `data/narratives.json` (25 hand-curated narratives)

**Files:**
- Create: `data/narratives.json`
- Test: `tests/data/narratives.test.ts`

- [ ] **Step 1: Write the failing test `tests/data/narratives.test.ts`**

```ts
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
```

- [ ] **Step 2: Run to verify fails**

Run: `npm test -- narratives`
Expected: FAIL (file not found).

- [ ] **Step 3: Enable JSON imports in `tsconfig.json`**

Add `"resolveJsonModule": true` under `compilerOptions` if not already present.

- [ ] **Step 4: Create `data/narratives.json`**

```json
[
  { "id": "ico-era", "label": "ICO Era", "color": "#f59e0b", "emergedAt": "2017-01", "retiredAt": "2018-06", "keywords": ["ico", "initial coin offering", "ethereum ico"] },
  { "id": "defi-summer", "label": "DeFi Summer", "color": "#10b981", "emergedAt": "2020-06", "retiredAt": "2021-04", "keywords": ["yield farming", "defi", "yearn finance"], "defillamaCategory": "Dexes" },
  { "id": "nfts", "label": "NFTs", "color": "#ec4899", "emergedAt": "2021-02", "retiredAt": "2022-06", "keywords": ["nft", "opensea", "bored ape"] },
  { "id": "gamefi", "label": "GameFi / Play-to-Earn", "color": "#f97316", "emergedAt": "2021-06", "retiredAt": "2022-05", "keywords": ["play to earn", "axie infinity", "gamefi"] },
  { "id": "metaverse", "label": "Metaverse", "color": "#a855f7", "emergedAt": "2021-10", "retiredAt": "2022-09", "keywords": ["metaverse", "decentraland", "sandbox crypto"] },
  { "id": "l2s", "label": "L2s / Rollups", "color": "#3b82f6", "emergedAt": "2021-08", "retiredAt": null, "keywords": ["arbitrum", "optimism", "ethereum l2"], "defillamaCategory": "Rollup" },
  { "id": "liquid-staking", "label": "Liquid Staking", "color": "#06b6d4", "emergedAt": "2023-01", "retiredAt": null, "keywords": ["liquid staking", "lido", "lsd crypto"], "defillamaCategory": "Liquid Staking" },
  { "id": "rwa", "label": "Real World Assets (RWA)", "color": "#84cc16", "emergedAt": "2023-04", "retiredAt": null, "keywords": ["rwa crypto", "tokenized treasuries", "real world assets"], "defillamaCategory": "RWA" },
  { "id": "ordinals", "label": "Bitcoin Ordinals / BRC-20", "color": "#eab308", "emergedAt": "2023-02", "retiredAt": "2024-04", "keywords": ["ordinals", "brc-20", "bitcoin nft"] },
  { "id": "memecoins", "label": "Memecoins", "color": "#f43f5e", "emergedAt": "2023-11", "retiredAt": null, "keywords": ["memecoin", "pepe coin", "dogwifhat"] },
  { "id": "restaking", "label": "Restaking / EigenLayer", "color": "#6366f1", "emergedAt": "2024-02", "retiredAt": null, "keywords": ["restaking", "eigenlayer", "liquid restaking"], "defillamaCategory": "Restaking" },
  { "id": "ai-agents", "label": "AI Agents", "color": "#8b5cf6", "emergedAt": "2024-10", "retiredAt": null, "keywords": ["ai agents crypto", "virtuals protocol", "ai16z"], "relatedTokens": ["VIRTUAL", "AI16Z", "FARTCOIN"] },
  { "id": "depin", "label": "DePIN", "color": "#14b8a6", "emergedAt": "2023-06", "retiredAt": null, "keywords": ["depin", "helium network", "render network"] },
  { "id": "prediction-markets", "label": "Prediction Markets", "color": "#22c55e", "emergedAt": "2024-08", "retiredAt": null, "keywords": ["polymarket", "prediction markets crypto"] },
  { "id": "modular", "label": "Modular Blockchains", "color": "#0ea5e9", "emergedAt": "2023-09", "retiredAt": null, "keywords": ["modular blockchain", "celestia", "data availability"] },
  { "id": "perp-dexs", "label": "Perp DEXs", "color": "#d946ef", "emergedAt": "2022-11", "retiredAt": null, "keywords": ["perpetual dex", "gmx", "hyperliquid"], "defillamaCategory": "Derivatives" },
  { "id": "points", "label": "Points Programs", "color": "#f472b6", "emergedAt": "2023-11", "retiredAt": "2024-08", "keywords": ["crypto points", "airdrop points"] },
  { "id": "zk", "label": "Zero Knowledge", "color": "#7c3aed", "emergedAt": "2022-03", "retiredAt": null, "keywords": ["zk rollup", "zero knowledge proof", "starknet"] },
  { "id": "cross-chain", "label": "Cross-Chain / Bridges", "color": "#0d9488", "emergedAt": "2021-09", "retiredAt": "2023-02", "keywords": ["crypto bridge", "wormhole", "layerzero"] },
  { "id": "daos", "label": "DAOs", "color": "#be185d", "emergedAt": "2021-04", "retiredAt": "2022-07", "keywords": ["dao", "constitution dao", "decentralized autonomous organization"] },
  { "id": "intents", "label": "Intents / Solvers", "color": "#4f46e5", "emergedAt": "2024-01", "retiredAt": null, "keywords": ["crypto intents", "solver network", "cowswap"] },
  { "id": "account-abstraction", "label": "Account Abstraction", "color": "#0284c7", "emergedAt": "2023-03", "retiredAt": null, "keywords": ["account abstraction", "erc 4337", "smart wallet"] },
  { "id": "yield-tokenization", "label": "Yield Tokenization", "color": "#16a34a", "emergedAt": "2023-03", "retiredAt": null, "keywords": ["pendle finance", "yield tokenization"], "defillamaCategory": "Yield" },
  { "id": "stablecoins", "label": "Stablecoin Yield", "color": "#059669", "emergedAt": "2023-09", "retiredAt": null, "keywords": ["ethena usde", "stablecoin yield", "frax"], "defillamaCategory": "Stablecoin Issuer" },
  { "id": "web3-social", "label": "Web3 Social", "color": "#db2777", "emergedAt": "2022-06", "retiredAt": null, "keywords": ["farcaster", "lens protocol", "web3 social"] }
]
```

- [ ] **Step 5: Run tests**

Run: `npm test -- narratives`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: seed 25 hand-curated crypto narratives

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Seed `data/historical-seed.json` (pre-2023 monthly scores)

**Files:**
- Create: `data/historical-seed.json`
- Test: `tests/data/historical-seed.test.ts`

- [ ] **Step 1: Write the failing test `tests/data/historical-seed.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import seed from '../../data/historical-seed.json';
import narratives from '../../data/narratives.json';
import { HistoricalSeedSchema, NarrativesFileSchema } from '@/lib/types';

describe('data/historical-seed.json', () => {
  it('parses against the schema', () => {
    expect(() => HistoricalSeedSchema.parse(seed)).not.toThrow();
  });

  it('only references known narrative ids', () => {
    const known = new Set(
      NarrativesFileSchema.parse(narratives).map((n) => n.id),
    );
    for (const id of Object.keys(seed)) {
      expect(known.has(id)).toBe(true);
    }
  });

  it('every seeded point is in 2017-01..2022-12', () => {
    for (const points of Object.values(seed)) {
      for (const p of points as { date: string }[]) {
        expect(p.date >= '2017-01').toBe(true);
        expect(p.date <= '2022-12').toBe(true);
      }
    }
  });
});
```

- [ ] **Step 2: Create sparse seed `data/historical-seed.json`**

The file should include monthly scores for the 7 narratives that existed before 2023 (see `emergedAt` values in `narratives.json`). Sparse is fine — missing months render as absent. Example entries for peak months:

```json
{
  "ico-era": [
    { "date": "2017-01", "score": 15 },
    { "date": "2017-06", "score": 55 },
    { "date": "2017-12", "score": 95 },
    { "date": "2018-01", "score": 90 },
    { "date": "2018-06", "score": 30 }
  ],
  "defi-summer": [
    { "date": "2020-06", "score": 40 },
    { "date": "2020-08", "score": 92 },
    { "date": "2020-12", "score": 70 },
    { "date": "2021-02", "score": 55 },
    { "date": "2021-04", "score": 35 }
  ],
  "nfts": [
    { "date": "2021-02", "score": 25 },
    { "date": "2021-08", "score": 100 },
    { "date": "2022-01", "score": 80 },
    { "date": "2022-06", "score": 35 }
  ],
  "gamefi": [
    { "date": "2021-06", "score": 30 },
    { "date": "2021-10", "score": 90 },
    { "date": "2022-01", "score": 60 },
    { "date": "2022-05", "score": 25 }
  ],
  "metaverse": [
    { "date": "2021-10", "score": 40 },
    { "date": "2021-11", "score": 95 },
    { "date": "2022-03", "score": 55 },
    { "date": "2022-09", "score": 20 }
  ],
  "l2s": [
    { "date": "2021-08", "score": 20 },
    { "date": "2022-02", "score": 45 },
    { "date": "2022-08", "score": 60 },
    { "date": "2022-12", "score": 65 }
  ],
  "daos": [
    { "date": "2021-04", "score": 20 },
    { "date": "2021-11", "score": 85 },
    { "date": "2022-03", "score": 50 },
    { "date": "2022-07", "score": 25 }
  ],
  "nfts": [
    { "date": "2021-02", "score": 25 },
    { "date": "2021-08", "score": 100 },
    { "date": "2022-01", "score": 80 },
    { "date": "2022-06", "score": 35 }
  ],
  "perp-dexs": [
    { "date": "2022-11", "score": 25 },
    { "date": "2022-12", "score": 30 }
  ],
  "web3-social": [
    { "date": "2022-06", "score": 15 },
    { "date": "2022-12", "score": 25 }
  ],
  "zk": [
    { "date": "2022-03", "score": 20 },
    { "date": "2022-09", "score": 35 },
    { "date": "2022-12", "score": 40 }
  ],
  "cross-chain": [
    { "date": "2021-09", "score": 30 },
    { "date": "2021-12", "score": 60 },
    { "date": "2022-03", "score": 80 },
    { "date": "2022-08", "score": 45 }
  ]
}
```

> Note: `nfts` appears once — no duplicate keys in JSON. (The example above is illustrative; collapse duplicates when writing the actual file.)

- [ ] **Step 3: Run tests**

Run: `npm test -- historical-seed`
Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: seed pre-2023 historical mindshare data

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Implement `lib/zoom.ts` aggregation

**Files:**
- Create: `src/lib/zoom.ts`
- Test: `tests/lib/zoom.test.ts`

- [ ] **Step 1: Write the failing test `tests/lib/zoom.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { aggregateToMonthly, aggregateToWeekly, filterByRange } from '@/lib/zoom';
import type { MindsharePoint } from '@/lib/types';

describe('aggregateToMonthly', () => {
  it('returns monthly points as-is when already monthly', () => {
    const pts: MindsharePoint[] = [
      { date: '2024-10', score: 50 },
      { date: '2024-11', score: 60 },
    ];
    expect(aggregateToMonthly(pts)).toEqual(pts);
  });

  it('is a noop for empty input', () => {
    expect(aggregateToMonthly([])).toEqual([]);
  });
});

describe('aggregateToWeekly', () => {
  it('interpolates weekly points from monthly via linear interpolation', () => {
    const monthly: MindsharePoint[] = [
      { date: '2024-10', score: 0 },
      { date: '2024-11', score: 100 },
    ];
    const weekly = aggregateToWeekly(monthly);
    expect(weekly.length).toBeGreaterThan(monthly.length);
    expect(weekly[0]?.score).toBe(0);
    expect(weekly[weekly.length - 1]?.score).toBe(100);
    // monotonic between the two endpoints
    for (let i = 1; i < weekly.length; i++) {
      expect(weekly[i]!.score).toBeGreaterThanOrEqual(weekly[i - 1]!.score);
    }
  });
});

describe('filterByRange', () => {
  it('returns points within [start, end] inclusive', () => {
    const pts: MindsharePoint[] = [
      { date: '2024-09', score: 10 },
      { date: '2024-10', score: 20 },
      { date: '2024-11', score: 30 },
    ];
    expect(filterByRange(pts, '2024-10', '2024-11')).toEqual([
      { date: '2024-10', score: 20 },
      { date: '2024-11', score: 30 },
    ]);
  });
});
```

- [ ] **Step 2: Run to verify fails**

Run: `npm test -- zoom`
Expected: FAIL.

- [ ] **Step 3: Install `date-fns`**

```bash
npm i date-fns
```

- [ ] **Step 4: Create `src/lib/zoom.ts`**

```ts
import { addWeeks, differenceInWeeks, format, parse, startOfWeek } from 'date-fns';
import type { MindsharePoint } from './types';

export function aggregateToMonthly(points: MindsharePoint[]): MindsharePoint[] {
  return [...points].sort((a, b) => a.date.localeCompare(b.date));
}

export function aggregateToWeekly(points: MindsharePoint[]): MindsharePoint[] {
  if (points.length < 2) return points;
  const sorted = aggregateToMonthly(points);
  const out: MindsharePoint[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i]!;
    const b = sorted[i + 1]!;
    const aDate = parse(a.date, 'yyyy-MM', new Date());
    const bDate = parse(b.date, 'yyyy-MM', new Date());
    const weeks = Math.max(1, differenceInWeeks(bDate, aDate));
    for (let w = 0; w <= weeks; w++) {
      if (i > 0 && w === 0) continue; // avoid dupes between segments
      const t = w / weeks;
      const score = a.score + (b.score - a.score) * t;
      const date = format(startOfWeek(addWeeks(aDate, w), { weekStartsOn: 1 }), 'yyyy-MM-dd');
      out.push({ date: date.slice(0, 7), score });
    }
  }
  return out;
}

export function filterByRange(
  points: MindsharePoint[],
  start: string,
  end: string,
): MindsharePoint[] {
  return points.filter((p) => p.date >= start && p.date <= end);
}
```

> Note: `MindsharePoint.date` is typed as `YYYY-MM`. For weekly/daily zoom we keep the same schema for simplicity; the plan uses month-prefix strings for weekly. If finer granularity is needed later, widen the schema to accept `YYYY-MM-DD`.

- [ ] **Step 5: Run tests**

Run: `npm test -- zoom`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add zoom/aggregation helpers with weekly interpolation

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Implement `lib/trend.ts` direction detection

**Files:**
- Create: `src/lib/trend.ts`
- Test: `tests/lib/trend.test.ts`

- [ ] **Step 1: Write the failing test `tests/lib/trend.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { computeTrend } from '@/lib/trend';
import type { MindsharePoint } from '@/lib/types';

const win = (scores: number[]): MindsharePoint[] =>
  scores.map((s, i) => ({ date: `2024-${String(i + 1).padStart(2, '0')}`, score: s }));

describe('computeTrend', () => {
  it('returns "up" when recent window mean > +10% over prior', () => {
    const pts = win([10, 10, 10, 10, 20, 20, 20, 20]);
    const t = computeTrend(pts);
    expect(t.direction).toBe('up');
    expect(t.deltaPct).toBeCloseTo(100);
  });

  it('returns "down" when recent window mean < -10% vs prior', () => {
    const pts = win([50, 50, 50, 50, 20, 20, 20, 20]);
    const t = computeTrend(pts);
    expect(t.direction).toBe('down');
  });

  it('returns "flat" when change is within ±10%', () => {
    const pts = win([50, 50, 50, 50, 52, 53, 51, 50]);
    const t = computeTrend(pts);
    expect(t.direction).toBe('flat');
  });

  it('returns "new" when prior mean is 0 and recent > 0', () => {
    const pts = win([0, 0, 0, 0, 10, 20, 30, 40]);
    const t = computeTrend(pts);
    expect(t.direction).toBe('new');
    expect(t.deltaPct).toBeNull();
  });

  it('returns "flat" when there are fewer than 8 points', () => {
    const pts = win([10, 20, 30]);
    const t = computeTrend(pts);
    expect(t.direction).toBe('flat');
    expect(t.deltaPct).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify fails**

Run: `npm test -- trend`
Expected: FAIL.

- [ ] **Step 3: Create `src/lib/trend.ts`**

```ts
import type { MindsharePoint, TrendResult } from './types';

const WINDOW = 4;
const THRESHOLD_PCT = 10;

export function computeTrend(points: MindsharePoint[]): TrendResult {
  if (points.length < WINDOW * 2) {
    return { direction: 'flat', deltaPct: null };
  }
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
  const tail = sorted.slice(-WINDOW * 2);
  const prior = mean(tail.slice(0, WINDOW).map((p) => p.score));
  const recent = mean(tail.slice(WINDOW).map((p) => p.score));

  if (prior === 0) {
    return recent > 0 ? { direction: 'new', deltaPct: null } : { direction: 'flat', deltaPct: 0 };
  }

  const delta = ((recent - prior) / prior) * 100;
  if (delta > THRESHOLD_PCT) return { direction: 'up', deltaPct: delta };
  if (delta < -THRESHOLD_PCT) return { direction: 'down', deltaPct: delta };
  return { direction: 'flat', deltaPct: delta };
}

function mean(xs: number[]): number {
  if (xs.length === 0) return 0;
  return xs.reduce((s, x) => s + x, 0) / xs.length;
}
```

- [ ] **Step 4: Run tests**

Run: `npm test -- trend`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add trend direction + delta percentage logic

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: Google Trends fetcher

**Files:**
- Create: `scripts/lib/google-trends.ts`
- Test: `tests/scripts/google-trends.test.ts`

- [ ] **Step 1: Install deps**

```bash
npm i google-trends-api
npm i -D @types/google-trends-api tsx
```

- [ ] **Step 2: Write the failing test `tests/scripts/google-trends.test.ts`**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchInterestOverTime } from '../../scripts/lib/google-trends';

vi.mock('google-trends-api', () => ({
  default: {
    interestOverTime: vi.fn(),
  },
}));
import gt from 'google-trends-api';

describe('fetchInterestOverTime', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns monthly averaged scores for a keyword list', async () => {
    (gt.interestOverTime as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      JSON.stringify({
        default: {
          timelineData: [
            { formattedAxisTime: '2024-10-01', value: [40] },
            { formattedAxisTime: '2024-10-15', value: [60] },
            { formattedAxisTime: '2024-11-01', value: [80] },
          ],
        },
      }),
    );
    const out = await fetchInterestOverTime(['x'], { startDate: '2024-10-01', endDate: '2024-11-30' });
    expect(out).toEqual([
      { date: '2024-10', score: 50 },
      { date: '2024-11', score: 80 },
    ]);
  });

  it('retries on 429 then throws after max attempts', async () => {
    const err = new Error('429 Too Many Requests');
    (gt.interestOverTime as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(err);
    await expect(
      fetchInterestOverTime(['x'], { startDate: '2024-10-01', endDate: '2024-11-30', maxAttempts: 2, baseDelayMs: 1 }),
    ).rejects.toThrow();
    expect(gt.interestOverTime).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 3: Run to verify fails**

Run: `npm test -- google-trends`
Expected: FAIL.

- [ ] **Step 4: Create `scripts/lib/google-trends.ts`**

```ts
import gt from 'google-trends-api';
import type { MindsharePoint } from '../../src/lib/types';

export interface FetchOptions {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  maxAttempts?: number;
  baseDelayMs?: number;
}

interface TimelineEntry {
  formattedAxisTime: string;
  value: number[];
}

export async function fetchInterestOverTime(
  keywords: string[],
  opts: FetchOptions,
): Promise<MindsharePoint[]> {
  const { startDate, endDate, maxAttempts = 5, baseDelayMs = 2000 } = opts;

  const raw = await withBackoff(
    () =>
      gt.interestOverTime({
        keyword: keywords,
        startTime: new Date(startDate),
        endTime: new Date(endDate),
      }),
    maxAttempts,
    baseDelayMs,
  );

  const parsed = JSON.parse(raw) as { default?: { timelineData?: TimelineEntry[] } };
  const timeline = parsed.default?.timelineData ?? [];

  // Average across keywords per sample point.
  const perSample = timeline.map((e) => ({
    month: e.formattedAxisTime.slice(0, 7),
    score: e.value.reduce((s, v) => s + v, 0) / Math.max(1, e.value.length),
  }));

  // Bucket by month.
  const buckets = new Map<string, number[]>();
  for (const s of perSample) {
    const arr = buckets.get(s.month) ?? [];
    arr.push(s.score);
    buckets.set(s.month, arr);
  }

  return [...buckets.entries()]
    .map(([date, xs]) => ({ date, score: xs.reduce((s, v) => s + v, 0) / xs.length }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

async function withBackoff<T>(
  fn: () => Promise<T>,
  maxAttempts: number,
  baseDelayMs: number,
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt === maxAttempts) break;
      const delay = baseDelayMs * 2 ** (attempt - 1);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}
```

- [ ] **Step 5: Run tests**

Run: `npm test -- google-trends`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: google trends fetcher with exponential backoff

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: DefiLlama category TVL fetcher

**Files:**
- Create: `scripts/lib/defillama.ts`
- Test: `tests/scripts/defillama.test.ts`

- [ ] **Step 1: Write the failing test `tests/scripts/defillama.test.ts`**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchCategoryTvlShares } from '../../scripts/lib/defillama';

const globalFetch = global.fetch;

describe('fetchCategoryTvlShares', () => {
  beforeEach(() => {
    global.fetch = globalFetch;
  });

  it('returns a map of category → 0..100 normalized share per requested month', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        { name: 'Lido', category: 'Liquid Staking', chainTvls: {}, tvl: 20000 },
        { name: 'Ondo', category: 'RWA', chainTvls: {}, tvl: 10000 },
      ],
    }) as unknown as typeof fetch;

    const out = await fetchCategoryTvlShares(['Liquid Staking', 'RWA']);
    expect(out['Liquid Staking']).toBeCloseTo(100);
    expect(out['RWA']).toBeCloseTo(50);
  });

  it('returns 0 for categories with no matching protocols', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ name: 'Lido', category: 'Liquid Staking', tvl: 1000 }],
    }) as unknown as typeof fetch;
    const out = await fetchCategoryTvlShares(['Liquid Staking', 'Ghost Category']);
    expect(out['Ghost Category']).toBe(0);
  });
});
```

- [ ] **Step 2: Run to verify fails**

Run: `npm test -- defillama`
Expected: FAIL.

- [ ] **Step 3: Create `scripts/lib/defillama.ts`**

```ts
interface Protocol {
  name: string;
  category?: string;
  tvl?: number;
}

export async function fetchCategoryTvlShares(
  categories: string[],
): Promise<Record<string, number>> {
  const res = await fetch('https://api.llama.fi/protocols');
  if (!res.ok) throw new Error(`defillama: ${res.status}`);
  const protocols = (await res.json()) as Protocol[];

  const perCategory: Record<string, number> = Object.fromEntries(
    categories.map((c) => [c, 0]),
  );
  for (const p of protocols) {
    if (!p.category || !p.tvl || p.tvl <= 0) continue;
    if (categories.includes(p.category)) {
      perCategory[p.category] = (perCategory[p.category] ?? 0) + p.tvl;
    }
  }

  const max = Math.max(...Object.values(perCategory), 0);
  if (max === 0) return perCategory;
  const out: Record<string, number> = {};
  for (const [c, tvl] of Object.entries(perCategory)) {
    out[c] = (tvl / max) * 100;
  }
  return out;
}
```

> Note: DefiLlama does not expose category-level historical TVL in a single call. For v1, the cron captures only the **current** category share and writes it to the **current** period. Historical periods use Google Trends exclusively. This is a documented limitation, not a bug.

- [ ] **Step 4: Run tests**

Run: `npm test -- defillama`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: defillama category-tvl share fetcher

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 10: Merge logic (seed + fresh → mindshare.json)

**Files:**
- Create: `scripts/lib/merge.ts`
- Test: `tests/scripts/merge.test.ts`

- [ ] **Step 1: Write the failing test `tests/scripts/merge.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { mergeSeries, blendScore } from '../../scripts/lib/merge';
import type { HistoricalSeed, Narrative } from '../../src/lib/types';

describe('blendScore', () => {
  it('uses 0.7 gt + 0.3 tvl when tvl is defined', () => {
    expect(blendScore(100, 0)).toBeCloseTo(70);
    expect(blendScore(0, 100)).toBeCloseTo(30);
    expect(blendScore(50, 50)).toBeCloseTo(50);
  });

  it('uses gt only when tvl is null', () => {
    expect(blendScore(42, null)).toBe(42);
  });
});

describe('mergeSeries', () => {
  const nar: Narrative[] = [
    { id: 'x', label: 'X', color: '#000000', emergedAt: '2024-10', retiredAt: null, keywords: ['x'] },
  ];
  const seed: HistoricalSeed = {
    x: [{ date: '2017-06', score: 50 }],
  };

  it('seed + fresh points merge by (id, date), fresh wins on conflict post-2023', () => {
    const fresh = new Map([['x', [{ date: '2024-10', score: 80 }]]]);
    const out = mergeSeries(nar, seed, fresh);
    const xSeries = out.find((s) => s.narrativeId === 'x')!;
    expect(xSeries.points).toContainEqual({ date: '2017-06', score: 50 });
    expect(xSeries.points).toContainEqual({ date: '2024-10', score: 80 });
  });

  it('never overwrites any period before 2023-01', () => {
    const seedOld: HistoricalSeed = { x: [{ date: '2021-06', score: 10 }] };
    const fresh = new Map([['x', [{ date: '2021-06', score: 99 }]]]);
    const out = mergeSeries(nar, seedOld, fresh);
    const xSeries = out.find((s) => s.narrativeId === 'x')!;
    expect(xSeries.points).toContainEqual({ date: '2021-06', score: 10 });
    expect(xSeries.points).not.toContainEqual({ date: '2021-06', score: 99 });
  });

  it('skips points before emergedAt and after retiredAt', () => {
    const ret: Narrative[] = [{ ...nar[0]!, emergedAt: '2024-10', retiredAt: '2024-11' }];
    const fresh = new Map([['x', [{ date: '2024-09', score: 50 }, { date: '2024-10', score: 60 }, { date: '2024-12', score: 70 }]]]);
    const out = mergeSeries(ret, {}, fresh);
    expect(out[0]!.points.map((p) => p.date)).toEqual(['2024-10']);
  });
});
```

- [ ] **Step 2: Create `scripts/lib/merge.ts`**

```ts
import type {
  HistoricalSeed,
  MindsharePoint,
  MindshareSeries,
  Narrative,
} from '../../src/lib/types';

const SEED_CUTOFF = '2023-01';
const GT_WEIGHT = 0.7;
const TVL_WEIGHT = 0.3;

export function blendScore(gt: number, tvl: number | null): number {
  if (tvl === null) return clamp(gt);
  return clamp(GT_WEIGHT * gt + TVL_WEIGHT * tvl);
}

export function mergeSeries(
  narratives: Narrative[],
  seed: HistoricalSeed,
  fresh: Map<string, MindsharePoint[]>,
): MindshareSeries[] {
  return narratives.map((n) => {
    const seedPts = seed[n.id] ?? [];
    const freshPts = fresh.get(n.id) ?? [];

    const byDate = new Map<string, number>();
    for (const p of seedPts) byDate.set(p.date, p.score);
    for (const p of freshPts) {
      if (p.date < SEED_CUTOFF) continue; // never overwrite pre-2023
      byDate.set(p.date, p.score);
    }

    const points = [...byDate.entries()]
      .map(([date, score]) => ({ date, score }))
      .filter((p) => p.date >= n.emergedAt)
      .filter((p) => (n.retiredAt ? p.date <= n.retiredAt : true))
      .sort((a, b) => a.date.localeCompare(b.date));

    return { narrativeId: n.id, points };
  });
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, n));
}
```

- [ ] **Step 3: Run tests**

Run: `npm test -- merge`
Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: merge historical seed + fresh fetches into series

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 11: Cron entry point `scripts/fetch-mindshare.ts`

**Files:**
- Create: `scripts/fetch-mindshare.ts`
- Modify: `package.json` (add `fetch:mindshare` script)
- Create: `data/fetch-errors.json` (empty array) on first run

- [ ] **Step 1: Create `scripts/fetch-mindshare.ts`**

```ts
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
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
  const startDate = '2023-01-01'; // seed covers everything before

  const fresh = new Map<string, MindsharePoint[]>();
  for (const n of narratives) {
    await new Promise((r) => setTimeout(r, 2000)); // throttle
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
```

- [ ] **Step 2: Add npm script**

Modify `package.json`:
```json
{
  "scripts": {
    "fetch:mindshare": "tsx scripts/fetch-mindshare.ts"
  }
}
```

- [ ] **Step 3: Seed an empty error log**

Create `data/fetch-errors.json`:
```json
[]
```

- [ ] **Step 4: Dry-run the script locally**

Run: `npm run fetch:mindshare`
Expected: `wrote mindshare.json with 25 series; N fetch errors` where N is small (Google Trends rate limits may cause a few). `data/mindshare.json` exists.

> Note: if Google Trends is flaky, re-run up to 3 times. An occasional per-narrative failure is fine.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: cron entry point, first mindshare.json generation

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 12: Build-time data loader `src/lib/data.ts`

**Files:**
- Create: `src/lib/data.ts`
- Test: `tests/lib/data.test.ts`

- [ ] **Step 1: Write the failing test `tests/lib/data.test.ts`**

```ts
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
```

- [ ] **Step 2: Create `src/lib/data.ts`**

```ts
import narrativesJson from '../../data/narratives.json';
import mindshareJson from '../../data/mindshare.json';
import {
  MindshareFileSchema,
  NarrativesFileSchema,
  type MindshareFile,
  type Narrative,
} from './types';

export function loadNarratives(): Narrative[] {
  return NarrativesFileSchema.parse(narrativesJson);
}

export function loadMindshare(): MindshareFile {
  return MindshareFileSchema.parse(mindshareJson);
}
```

- [ ] **Step 3: Run tests**

Run: `npm test -- data`
Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: build-time data loader with schema validation

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 13: Install Visx and build Streamgraph

**Files:**
- Create: `src/components/Streamgraph.tsx`

- [ ] **Step 1: Install Visx**

```bash
npm i @visx/stream @visx/scale @visx/group @visx/shape @visx/tooltip @visx/axis @visx/responsive
```

- [ ] **Step 2: Create `src/components/Streamgraph.tsx`**

```tsx
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
  const { rows, ids, dateRange } = useMemo(() => buildRows(series), [series]);
  const tooltip = useTooltip<{ narrativeId: string; date: Date; score: number }>();

  const xScale = scaleTime({ domain: dateRange, range: [0, width] });
  const yScale = scaleLinear({ domain: [0, 100 * ids.length], range: [height, 0] });

  return (
    <svg width={width} height={height}>
      <Group>
        <AreaStack<StackRow>
          keys={ids}
          data={rows}
          x={(d) => xScale(d.data.date)}
          y0={(d) => yScale(d[0])}
          y1={(d) => yScale(d[1])}
          offset="silhouette"
        >
          {({ stacks, path }) =>
            stacks.map((stack) => {
              const narrative = narratives.find((n) => n.id === stack.key)!;
              const dimmed = highlightedId && highlightedId !== stack.key;
              return (
                <path
                  key={`stack-${stack.key}`}
                  d={path(stack) || ''}
                  fill={narrative.color}
                  fillOpacity={dimmed ? 0.15 : 0.85}
                  stroke="transparent"
                  onMouseEnter={() => onHighlight?.(stack.key)}
                  onMouseLeave={() => onHighlight?.(null)}
                />
              );
            })
          }
        </AreaStack>
      </Group>
      {tooltip.tooltipData && (
        <TooltipWithBounds top={tooltip.tooltipTop} left={tooltip.tooltipLeft}>
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

  const rows: StackRow[] = sortedDates.map((d) => {
    const row: StackRow = { date: new Date(`${d}-01`) };
    for (const s of series) {
      const pt = s.points.find((p) => p.date === d);
      row[s.narrativeId] = pt?.score ?? 0;
    }
    return row;
  });

  const ids = series.map((s) => s.narrativeId);
  const dateRange: [Date, Date] =
    rows.length > 0
      ? [rows[0]!.date as Date, rows[rows.length - 1]!.date as Date]
      : [new Date(), new Date()];
  return { rows, ids, dateRange };
}
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: streamgraph component using visx

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 14: `CurrentPanel.tsx` (Right Now sidebar)

**Files:**
- Create: `src/components/CurrentPanel.tsx`
- Test: `tests/components/CurrentPanel.test.tsx`

- [ ] **Step 1: Write the failing test `tests/components/CurrentPanel.test.tsx`**

```tsx
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
```

- [ ] **Step 2: Create `src/components/CurrentPanel.tsx`**

```tsx
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

export function CurrentPanel({ narratives, series, onHighlight }: Props) {
  const now = new Date().toISOString().slice(0, 7);

  const rows = narratives
    .filter((n) => !n.retiredAt)
    .map((n) => {
      const s = series.find((x) => x.narrativeId === n.id);
      const latest = s?.points.find((p) => p.date === now) ?? s?.points.at(-1);
      const trend = s ? computeTrend(s.points) : { direction: 'flat' as TrendDirection, deltaPct: null };
      return { narrative: n, score: latest?.score ?? 0, trend };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  return (
    <aside className="w-64 p-4 space-y-2">
      <h2 className="text-sm font-semibold uppercase text-neutral-400">Right Now</h2>
      <ol className="space-y-1" role="list">
        {rows.map((r, i) => (
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
    </aside>
  );
}
```

- [ ] **Step 3: Run tests**

Run: `npm test -- CurrentPanel`
Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: CurrentPanel sidebar with trend arrows

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 15: `TimelineControls.tsx` (zoom + range brush)

**Files:**
- Create: `src/components/TimelineControls.tsx`

- [ ] **Step 1: Create `src/components/TimelineControls.tsx`**

```tsx
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
```

> Note: A proper Visx `<Brush>` is deferred — `<input type="month">` pickers are a working v1 that keeps the component simple. Upgrade later if user testing shows the pickers are too clumsy.

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: TimelineControls with zoom buttons + range pickers

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 16: Wire up `src/app/page.tsx`

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/layout.tsx`, `src/app/globals.css` (dark mode defaults)

- [ ] **Step 1: Set dark mode in `src/app/layout.tsx`**

```tsx
import './globals.css';

export const metadata = { title: 'Crypto Narrative Mindshare' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-neutral-950 text-neutral-100 min-h-screen">{children}</body>
    </html>
  );
}
```

- [ ] **Step 2: Ensure Tailwind dark variant**

In `tailwind.config.ts`: `darkMode: 'class'` (default for Next 16 template but verify).

- [ ] **Step 3: Write `src/app/page.tsx`**

```tsx
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
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 min-w-0">
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
      <footer className="px-4 py-2 text-xs text-neutral-500 border-t border-neutral-800">
        Data as of {new Date(mindshare.generatedAt).toLocaleDateString()}
      </footer>
    </main>
  );
}
```

- [ ] **Step 4: Run dev server + eyeball**

Run: `npm run dev`
Open `http://localhost:3000`. Expected: streamgraph renders, right panel lists 10 narratives, zoom buttons switch resolution, range pickers work.

- [ ] **Step 5: Verify production build**

Run: `npm run build`
Expected: `✓ Compiled successfully`.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: compose main page with streamgraph + panel + controls

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 17: Playwright visual snapshot test

**Files:**
- Create: `playwright.config.ts`
- Create: `tests/e2e/streamgraph.spec.ts`
- Modify: `package.json` (scripts)

- [ ] **Step 1: Install Playwright**

```bash
npm i -D @playwright/test
npx playwright install chromium
```

- [ ] **Step 2: Create `playwright.config.ts`**

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  webServer: {
    command: 'npm run build && npm run start',
    port: 3000,
    timeout: 120_000,
    reuseExistingServer: true,
  },
  use: {
    baseURL: 'http://localhost:3000',
    ...devices['Desktop Chrome'],
  },
});
```

- [ ] **Step 3: Create `tests/e2e/streamgraph.spec.ts`**

```ts
import { test, expect } from '@playwright/test';

test('home page renders streamgraph and panel', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Crypto Narrative Mindshare')).toBeVisible();
  await expect(page.getByText('Right Now')).toBeVisible();
  // Streamgraph svg is present
  const svg = page.locator('svg').first();
  await expect(svg).toBeVisible();
  // Visual baseline
  await expect(page).toHaveScreenshot('home.png', { maxDiffPixelRatio: 0.02 });
});
```

- [ ] **Step 4: Add scripts to `package.json`**

```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:update": "playwright test --update-snapshots"
  }
}
```

- [ ] **Step 5: Generate baseline**

Run: `npm run test:e2e:update`
Expected: baseline PNG created under `tests/e2e/streamgraph.spec.ts-snapshots/`.

- [ ] **Step 6: Run verification**

Run: `npm run test:e2e`
Expected: 1 passed.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "test: playwright visual baseline for home page

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 18: GitHub Actions weekly cron

**Files:**
- Create: `.github/workflows/refresh-data.yml`

- [ ] **Step 1: Create `.github/workflows/refresh-data.yml`**

```yaml
name: Refresh mindshare data

on:
  schedule:
    - cron: '0 6 * * 1' # Mondays 06:00 UTC
  workflow_dispatch:

jobs:
  refresh:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run fetch:mindshare
      - name: Commit refreshed data
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add data/mindshare.json data/fetch-errors.json
          git diff --cached --quiet || git commit -m "chore(data): weekly mindshare refresh"
          git push
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "ci: weekly github actions cron for mindshare refresh

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 19: README + Vercel deploy notes

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write `README.md`** covering:

```markdown
# Crypto Narrative Mindshare Tracker

Streamgraph of crypto narratives 2017 → today, with a "Right Now" panel.

## Dev
- `npm install`
- `npm run dev`
- `npm test`
- `npm run test:e2e`
- `npm run test:e2e:update` — refresh visual baseline

## Data pipeline
- `npm run fetch:mindshare` — runs Google Trends + DefiLlama, writes `data/mindshare.json`
- Runs weekly in GitHub Actions (`.github/workflows/refresh-data.yml`)

## Editing narratives
- Edit `data/narratives.json` — add/retire/tweak keywords
- Quarterly review cadence

## Deploy
- Push to `main` → Vercel auto-deploys
- First-time: import the repo on vercel.com, framework = Next.js, no env vars required
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "docs: README with dev + data pipeline + deploy instructions

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 20: End-to-end verification + first deploy

- [ ] **Step 1: Full local verification**

Run in order:
```bash
npm test
npm run build
npm run test:e2e
```
All three must pass.

- [ ] **Step 2: Push to GitHub + import to Vercel**

- Create a GitHub repo `crypto-narrative-tracker`
- `git remote add origin ...` and push
- On vercel.com: Add New → Project → import repo → Deploy (defaults)

- [ ] **Step 3: Manually run the cron once on GitHub Actions**

Actions tab → "Refresh mindshare data" → "Run workflow". Verify it commits an updated `data/mindshare.json`. Vercel redeploys automatically.

- [ ] **Step 4: Smoke test the deployed URL**

Visit the Vercel URL. Confirm:
- Streamgraph renders
- Right panel shows 10 narratives with arrows
- Footer shows a recent "Data as of ..." date
- Zoom buttons work

- [ ] **Step 5: Close out**

```bash
git tag v0.1.0
git push --tags
```

---

## Appendix: what we deliberately skipped

- Per-token drilldown (clicking a narrative to see its related tokens)
- Bump chart / heatmap toggle
- Account system, saved views, alerts
- Mobile-specific gestures (pinch-zoom, etc.)
- Predictive forecast lines — trend arrows only
- A proper Visx Brush component — month-pickers are good enough for v1
- Paid data sources (Kaito, LunarCrush paid) — all-free sources only
- Historical DefiLlama category TVL backfill — current-period only for TVL component
