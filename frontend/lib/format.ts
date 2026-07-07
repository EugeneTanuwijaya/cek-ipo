const idr = new Intl.NumberFormat('id-ID');
const idrShort = new Intl.NumberFormat('id-ID', { notation: 'compact', maximumFractionDigits: 1 });

export function rupiah(n: number): string {
  const v = Math.round(n) + 0;
  return (v < 0 ? '-Rp' : 'Rp') + idr.format(Math.abs(v));
}

/** Rupiah ringkas untuk angka besar: 2.500.000.000 → "Rp2,5 M". */
export function rupiahShort(n: number): string {
  const v = Math.round(n) + 0;
  return (v < 0 ? '-Rp' : 'Rp') + idrShort.format(Math.abs(v));
}

/** Tanggal ISO (yyyy-mm-dd) → "12 Jan 2026"; string tak dikenal dikembalikan apa adanya. */
export function tanggal(s: string | null | undefined): string {
  if (!s) return '—';
  const d = new Date(`${s.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function pct(n: number, digits = 1): string {
  const factor = 10 ** digits;
  const r = Math.round(n * factor) / factor + 0;
  const s = r.toLocaleString('id-ID', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  return (r >= 0 ? '+' : '') + s + '%';
}
