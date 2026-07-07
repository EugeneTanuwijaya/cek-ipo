import { describe, expect, it } from 'vitest';
import { pct, rupiah } from '../format';

describe('format', () => {
  it('rupiah pakai pemisah titik', () => {
    expect(rupiah(1500)).toBe('Rp1.500');
    expect(rupiah(2500000000)).toBe('Rp2.500.000.000');
  });
  it('rupiah normalisasi -0 dan tanda di depan Rp', () => {
    expect(rupiah(-0.4)).toBe('Rp0');
    expect(rupiah(-105000)).toBe('-Rp105.000');
  });
  it('pct pakai koma desimal dan tanda', () => {
    expect(pct(40)).toBe('+40,0%');
    expect(pct(-15)).toBe('-15,0%');
  });
  it('pct normalisasi -0 pada presisi tampilan', () => {
    expect(pct(-0)).toBe('+0,0%');
    expect(pct(-0.001)).toBe('+0,0%');
  });
});
