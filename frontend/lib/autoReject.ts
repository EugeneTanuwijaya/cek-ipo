import { AUTO_REJECT as R } from './rules';

export function araPct(price: number): number {
  return R.araBands.find(b => price <= b.maxPrice)!.pct;
}
export function arbPct(_price: number): number {
  return R.arbFlatPct;
}
export function tickFor(price: number): number {
  return R.ticks.find(t => price < t.belowPrice)!.tick;
}
export function roundToTick(price: number, dir: 'down' | 'up'): number {
  const t = tickFor(price);
  return (dir === 'down' ? Math.floor(price / t) : Math.ceil(price / t)) * t;
}

export interface DayLimit { day: number; ara: number; arb: number; }

export function projectLimits(ipoPrice: number, days = 5): DayLimit[] {
  const out: DayLimit[] = [];
  let ara = ipoPrice, arb = ipoPrice;
  for (let day = 1; day <= days; day++) {
    const mult = day === 1 ? R.day1Multiplier : 1;
    if (day === 1) {
      // Day 1: apply multiplier without rounding, round to nearest integer for floating point safety
      ara = Math.round(ara * (1 + araPct(ara) * mult));
      arb = Math.max(R.minPrice, Math.round(arb * (1 - arbPct(arb) * mult)));
    } else {
      // Day 2+: apply rounding to chain limits
      ara = roundToTick(ara * (1 + araPct(ara) * mult), 'down');
      arb = Math.max(R.minPrice, roundToTick(arb * (1 - arbPct(arb) * mult), 'up'));
    }
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
