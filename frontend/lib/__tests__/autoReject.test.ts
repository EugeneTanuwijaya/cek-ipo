import { describe, expect, it } from 'vitest';
import { profitLoss, projectLimits, roundToTick, tickFor } from '../autoReject';

describe('fraksi harga', () => {
  it('tick per rentang', () => {
    expect(tickFor(199)).toBe(1); expect(tickFor(200)).toBe(2);
    expect(tickFor(500)).toBe(5); expect(tickFor(2000)).toBe(10); expect(tickFor(5000)).toBe(25);
  });
  it('pembulatan', () => {
    expect(roundToTick(229.5, 'down')).toBe(228);
    expect(roundToTick(229.5, 'up')).toBe(230);
  });
});

describe('projectLimits', () => {
  it('hari-1 dua kali lipat, IPO 100', () => {
    const [d1] = projectLimits(100);
    expect(d1.ara).toBe(170);   // 100*(1+0.70)
    expect(d1.arb).toBe(70);    // 100*(1-0.30)
  });
  it('hari-2 berantai persentase reguler', () => {
    const [, d2] = projectLimits(100);
    expect(d2.ara).toBe(228);   // 170*1.35=229.5 → tick 2 → 228
    expect(d2.arb).toBe(60);    // 70*0.85=59.5 → tick 1, up → 60
  });
  it('harga tak pernah di bawah 50', () => {
    const days = projectLimits(50, 10);
    expect(Math.min(...days.map(d => d.arb))).toBeGreaterThanOrEqual(50);
  });
});

describe('profitLoss', () => {
  it('modal & skenario hari-1, IPO 350 x 10 lot', () => {
    const r = profitLoss(350, 10);
    expect(r.capital).toBe(350 * 10 * 100);
    expect(r.scenarios[0].araPrice).toBe(525);              // 350*1.50
    expect(r.scenarios[0].araProfit).toBe((525 - 350) * 1000);
    expect(r.scenarios[0].arbPrice).toBe(245);              // 350*0.70
    expect(r.scenarios[0].arbLoss).toBe((245 - 350) * 1000);
  });
});
