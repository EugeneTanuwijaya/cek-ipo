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
  it('hari-1 dibulatkan ke fraksi', () => {
    const [d1a] = projectLimits(131);            // 131*1.7=222.7 -> tick 2 down -> 222
    expect(d1a.ara).toBe(222);
    const [d1b] = projectLimits(301);            // 301*0.7=210.7 -> tick 2 up -> 212
    expect(d1b.arb).toBe(212);
    const [d1c] = projectLimits(199);            // ARB 139.3 -> tick 1 up -> 140; ARA 338.3 -> tick 2 down -> 338
    expect(d1c.arb).toBe(140);
    expect(d1c.ara).toBe(338);
  });
  it('artefak float 350 tetap benar', () => {
    const [d1] = projectLimits(350);
    expect(d1.ara).toBe(525);                    // 350*1.5=525, kelipatan tick 5, tetap 525
    expect(d1.arb).toBe(246);                    // 350*0.7=245 (fixFloat) -> 245 bukan kelipatan tick 2 -> up -> 246
  });
});

describe('profitLoss', () => {
  it('modal & skenario hari-1, IPO 350 x 10 lot', () => {
    const r = profitLoss(350, 10);
    expect(r.capital).toBe(350 * 10 * 100);
    expect(r.scenarios[0].araPrice).toBe(525);              // 350*1.50
    expect(r.scenarios[0].araProfit).toBe((525 - 350) * 1000);
    expect(r.scenarios[0].arbPrice).toBe(246);              // 350*0.70=245 -> tick 2, up -> 246
    expect(r.scenarios[0].arbLoss).toBe((246 - 350) * 1000);
  });
});
