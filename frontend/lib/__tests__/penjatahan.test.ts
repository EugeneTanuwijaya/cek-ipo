import { describe, expect, it } from 'vitest';
import { estimateAllotment, golonganFor, poolingAllocation } from '../penjatahan';

const M = 1_000_000, B = 1_000_000_000, T = 1_000_000_000_000;

describe('golonganFor', () => {
  it('lima golongan sesuai SEOJK 25/2025 (Romawi VI)', () => {
    expect(golonganFor(80 * B)).toBe(1);   // ≤ Rp100 M
    expect(golonganFor(100 * B)).toBe(1);  // batas atas golongan I (inklusif)
    expect(golonganFor(200 * B)).toBe(2);  // Rp100 M < x ≤ Rp250 M
    expect(golonganFor(400 * B)).toBe(3);  // Rp250 M < x ≤ Rp500 M
    expect(golonganFor(900 * B)).toBe(4);  // Rp500 M < x ≤ Rp1 T
    expect(golonganFor(2 * T)).toBe(5);    // > Rp1 T
  });
});

describe('poolingAllocation', () => {
  it('maks antara persen dan floor nominal (golongan I)', () => {
    expect(poolingAllocation(40 * B)).toBe(10 * B);        // 20% = 8 M < floor 10 M
    expect(poolingAllocation(80 * B)).toBe(16 * B);        // 20% = 16 M > floor
  });
  it('floor nominal golongan III berlaku saat persen lebih kecil', () => {
    expect(poolingAllocation(300 * B)).toBe(37.5 * B);     // 10% = 30 M < floor 37,5 M
  });
  it('naik saat oversubscription lewat ambang (golongan I: 22,5% di ≥2,5x)', () => {
    expect(poolingAllocation(80 * B, 3)).toBe(0.225 * 80 * B);
  });
  it('naik ke 25% pada ≥10x dan 30% pada ≥25x (golongan I)', () => {
    expect(poolingAllocation(80 * B, 10)).toBe(0.25 * 80 * B);
    expect(poolingAllocation(80 * B, 25)).toBe(0.30 * 80 * B);
  });
});

describe('estimateAllotment', () => {
  const base = { price: 100, ipoValue: 80 * B, oversub: 10 };
  it('pesanan ritel dibagi rasio oversub', () => {
    const r = estimateAllotment({ orderLots: 100, ...base });
    if ('error' in r) throw new Error(r.error);
    expect(r.isRetail).toBe(true);                          // 100 lot × 100 × Rp100 = Rp1 juta
    expect(r.estimatedLots).toBe(10);                       // 100 / 10x
    expect(r.fillPct).toBe(10);
  });
  it('minimal 1 lot bila kebagian', () => {
    const r = estimateAllotment({ orderLots: 5, ...base });
    if ('error' in r) throw new Error(r.error);
    expect(r.estimatedLots).toBe(1);                        // floor(5/10)=0 → dinaikkan ke 1 lot
  });
  it('pecahan lot dibulatkan ke bawah (estimasi konservatif)', () => {
    const r = estimateAllotment({ orderLots: 16, ...base });
    if ('error' in r) throw new Error(r.error);
    expect(r.estimatedLots).toBe(1);                        // floor(16/10)=1, bukan round → 2
  });
  it('pesanan > 10% nilai penawaran ditolak', () => {
    const r = estimateAllotment({ orderLots: 900_000, ...base }); // 900rb lot ×100×100 = 9 M > 10%×80 M
    expect('error' in r).toBe(true);
  });
  it('input tidak valid ditolak dengan pesan error, bukan crash', () => {
    expect('error' in estimateAllotment({ orderLots: 100, price: 100, ipoValue: NaN, oversub: 10 })).toBe(true);
    expect('error' in estimateAllotment({ orderLots: 100, price: -100, ipoValue: 80 * B, oversub: 10 })).toBe(true);
    expect('error' in estimateAllotment({ orderLots: 100, price: 100, ipoValue: 80 * B, oversub: NaN })).toBe(true);
  });
});
