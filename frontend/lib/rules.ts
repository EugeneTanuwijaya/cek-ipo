// Aturan BEI per Juli 2026 — Peraturan II-A; ARB 15% seragam sejak 8 Apr 2025.
// Diverifikasi ulang terhadap teks resmi pada Task 12. Ubah di sini bila BEI merevisi.
export const AUTO_REJECT = {
  day1Multiplier: 2,
  minPrice: 50,
  araBands: [
    { maxPrice: 200, pct: 0.35 },
    { maxPrice: 5000, pct: 0.25 },
    { maxPrice: Infinity, pct: 0.2 },
  ],
  arbFlatPct: 0.15,
  ticks: [
    { belowPrice: 200, tick: 1 },
    { belowPrice: 500, tick: 2 },
    { belowPrice: 2000, tick: 5 },
    { belowPrice: 5000, tick: 10 },
    { belowPrice: Infinity, tick: 25 },
  ],
} as const;
