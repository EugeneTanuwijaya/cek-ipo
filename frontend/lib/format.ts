const idr = new Intl.NumberFormat('id-ID');

export function rupiah(n: number): string {
  const v = Math.round(n) + 0;
  return (v < 0 ? '-Rp' : 'Rp') + idr.format(Math.abs(v));
}

export function pct(n: number, digits = 1): string {
  const factor = 10 ** digits;
  const r = Math.round(n * factor) / factor + 0;
  const s = r.toLocaleString('id-ID', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  return (r >= 0 ? '+' : '') + s + '%';
}
