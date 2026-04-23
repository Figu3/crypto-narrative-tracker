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
