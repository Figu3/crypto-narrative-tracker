# Crypto Narrative Mindshare Tracker

Streamgraph of crypto narratives 2017 → today, with a "Right Now" panel showing the current top 10 narratives ranked by mindshare with trend arrows (↑/→/↓).

Data sources: Google Trends (search interest) + DefiLlama (category TVL) + hand-seeded pre-2023 history.

## Dev

```bash
npm install
npm run dev          # http://localhost:3000
npm test             # Vitest unit tests
npm run test:e2e     # Playwright smoke test
npm run build        # Production build
```

## Data pipeline

```bash
npm run fetch:mindshare
```

Runs Google Trends + DefiLlama fetches for each of the 25 narratives, blends them with hand-seeded pre-2023 history, and writes `data/mindshare.json`.

The pipeline runs weekly (Mondays 06:00 UTC) via GitHub Actions — see `.github/workflows/refresh-data.yml` at the repo root.

## Editing narratives

Edit `data/narratives.json` to add, retire, or tweak narratives. Each entry has:

- `id` — stable slug
- `label` — display name
- `color` — hex color (stable across the app)
- `emergedAt` / `retiredAt` — `YYYY-MM` lifetime window
- `keywords` — Google Trends queries (averaged)
- `defillamaCategory` — optional, matches `/protocols` category field
- `relatedTokens` — reference only

Quarterly review cadence recommended.

## Architecture

- **Frontend:** Next.js 16 + React 19 + Tailwind v4 + Visx streamgraph
- **Data pipeline:** `scripts/fetch-mindshare.ts` (Node, tsx)
- **Shared types:** zod schemas in `src/lib/types.ts`
- **Static SSG:** `mindshare.json` read at build time

## Deploy

Push to `main` → Vercel auto-deploys (no env vars required).

First-time: import the repo on vercel.com, framework preset = Next.js, leave everything else default.
