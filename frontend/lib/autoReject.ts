import { AUTO_REJECT as R } from './rules';

// Koreksi artefak floating point (mis. 350*0.7 = 244.99999999999997 → 245)
// sebelum perbandingan batas fraksi maupun pembulatan tick.
const fixFloat = (x: number) => Math.round(x * 1e6) / 1e6;

export function araPct(price: number): number {
  return R.araBands.find(b => price <= b.maxPrice)!.pct;
}
export function arbPct(_price: number): number {
  return R.arbFlatPct;
}
export function tickFor(price: number): number {
  const p = fixFloat(price);
  return R.ticks.find(t => p < t.belowPrice)!.tick;
}
export function roundToTick(price: number, dir: 'down' | 'up'): number {
  const p = fixFloat(price);
  const t = tickFor(p);
  return (dir === 'down' ? Math.floor(p / t) : Math.ceil(p / t)) * t;
}

export interface DayLimit { day: number; ara: number; arb: number; }

export function projectLimits(ipoPrice: number, days = 5): DayLimit[] {
  const out: DayLimit[] = [];
  let ara = ipoPrice, arb = ipoPrice;
  for (let day = 1; day <= days; day++) {
    const mult = day === 1 ? R.day1Multiplier : 1;
    // Seragam semua hari: ARA dibulatkan turun, ARB dibulatkan naik ke fraksi tick.
    ara = roundToTick(fixFloat(ara * (1 + araPct(ara) * mult)), 'down');
    arb = Math.max(R.minPrice, roundToTick(fixFloat(arb * (1 - arbPct(arb) * mult)), 'up'));
    out.push({ day, ara, arb });
  }
  return out;
}

export function profitLoss(ipoPrice: number, lots: number, days = 5) {
  const shares = lots * 100;
  const capital = ipoPrice * shares;
  const scenarios = projectLimits(ipoPrice, days).map(d => ({
    day: d.day,
    araPrice: d.ara,
    arbPrice: d.arb,
    araProfit: (d.ara - ipoPrice) * shares,
    arbLoss: (d.arb - ipoPrice) * shares,
    araPct: (d.ara / ipoPrice - 1) * 100,
    arbPct: (d.arb / ipoPrice - 1) * 100,
  }));
  return { capital, scenarios };
}
