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
  // day1Multiplier = 1 (verifikasi empiris Task 16: COIN 100→135, EMAS
  // 2880→3600, RLCO 168→226 — semua terkunci ARA 1x di hari-1).
  it('hari-1 persentase normal, IPO 100', () => {
    const [d1] = projectLimits(100);
    expect(d1.ara).toBe(135);   // 100*(1+0.35) — kasus riil COIN Jul 2025
    expect(d1.arb).toBe(85);    // 100*(1-0.15)
  });
  it('hari-2 berantai persentase reguler', () => {
    const [, d2] = projectLimits(100);
    expect(d2.ara).toBe(182);   // 135*1.35=182.25 → tick 1 → 182
    expect(d2.arb).toBe(73);    // 85*0.85=72.25 → tick 1, up → 73
  });
  it('harga tak pernah di bawah 50', () => {
    const days = projectLimits(50, 10);
    expect(Math.min(...days.map(d => d.arb))).toBeGreaterThanOrEqual(50);
  });
  it('hari-1 dibulatkan ke fraksi', () => {
    const [d1a] = projectLimits(131);            // 131*1.35=176.85 -> tick 1 down -> 176
    expect(d1a.ara).toBe(176);
    const [d1b] = projectLimits(301);            // 301*0.85=255.85 -> tick 2 up -> 256
    expect(d1b.arb).toBe(256);
    const [d1c] = projectLimits(199);            // ARB 169.15 -> tick 1 up -> 170; ARA 268.65 -> tick 2 down -> 268
    expect(d1c.arb).toBe(170);
    expect(d1c.ara).toBe(268);
  });
  it('artefak float 350 tetap benar', () => {
    const [d1] = projectLimits(350);
    expect(d1.ara).toBe(436);                    // 350*1.25=437.5 -> tick 2 down -> 436
    expect(d1.arb).toBe(298);                    // 350*0.85=297.5 (fixFloat dari 297.49999...) -> tick 2 up -> 298
  });
});

describe('profitLoss', () => {
  it('modal & skenario hari-1, IPO 350 x 10 lot', () => {
    const r = profitLoss(350, 10);
    expect(r.capital).toBe(350 * 10 * 100);
    expect(r.scenarios[0].araPrice).toBe(436);              // 350*1.25=437.5 -> tick 2 down
    expect(r.scenarios[0].araProfit).toBe((436 - 350) * 1000);
    expect(r.scenarios[0].arbPrice).toBe(298);              // 350*0.85=297.5 -> tick 2, up -> 298
    expect(r.scenarios[0].arbLoss).toBe((298 - 350) * 1000);
  });
});
