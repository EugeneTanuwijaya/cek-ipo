const idr = new Intl.NumberFormat('id-ID');

export function rupiah(n: number): string {
  return 'Rp' + idr.format(Math.round(n));
}

export function pct(n: number, digits = 1): string {
  const s = n.toLocaleString('id-ID', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  return (n >= 0 ? '+' : '') + s + '%';
}
