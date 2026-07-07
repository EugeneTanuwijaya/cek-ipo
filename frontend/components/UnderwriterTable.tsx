'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { UnderwriterStats } from '@/lib/api';
import { rupiahShort, pct } from '@/lib/format';

type SortKey = keyof Pick<
  UnderwriterStats,
  'code' | 'name' | 'total_ipos' | 'ara_rate_pct' | 'avg_day1_return_pct' | 'total_value'
>;

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: 'code', label: 'Kode' },
  { key: 'name', label: 'Nama' },
  { key: 'total_ipos', label: 'Jumlah IPO' },
  { key: 'ara_rate_pct', label: '% ARA Hari-1' },
  { key: 'avg_day1_return_pct', label: 'Rata-rata Return Hari-1' },
  { key: 'total_value', label: 'Total Nilai Emisi' },
];

export default function UnderwriterTable({ underwriters }: { underwriters: UnderwriterStats[] }) {
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('code');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q
      ? underwriters.filter(
          u => u.code.toLowerCase().includes(q) || u.name.toLowerCase().includes(q),
        )
      : underwriters;

    const dir = sortDir === 'asc' ? 1 : -1;
    return [...base].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av == null) return bv == null ? 0 : 1;
      if (bv == null) return -1;
      if (typeof av === 'string' || typeof bv === 'string') {
        return String(av).localeCompare(String(bv)) * dir;
      }
      return (av - bv) * dir;
    });
  }, [underwriters, query, sortKey, sortDir]);

  return (
    <div className="space-y-3">
      <input
        type="search"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Cari kode atau nama underwriter..."
        className="w-full rounded-xl border border-ink-line bg-ink-soft px-4 py-2.5 text-base outline-none placeholder:text-mute focus:border-ember sm:max-w-xs sm:text-sm"
      />

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-ink-line bg-ink-soft/50 p-10 text-center text-sm text-mute">
          Tidak ada underwriter yang cocok dengan pencarian.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-ink-line bg-ink-soft">
          <table className="w-full text-xs sm:min-w-[640px] sm:text-sm">
            <thead>
              <tr className="border-b border-ink-line text-left text-xs uppercase tracking-wide text-mute">
                {COLUMNS.map((col, i) => (
                  <th
                    key={col.key}
                    className={`py-3 pr-2 align-top font-normal sm:pr-4 ${i === 0 ? 'pl-3 sm:pl-4' : ''} ${col.key === 'name' ? 'hidden sm:table-cell' : ''}`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleSort(col.key)}
                      className="flex items-center gap-1 uppercase tracking-wide"
                    >
                      {col.label}
                      <span className={sortKey === col.key ? 'text-fog' : 'text-mute/50'}>
                        {sortKey === col.key ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}
                      </span>
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.code} className="border-b border-ink-line last:border-0 hover:bg-ink/40">
                  <td className="py-2.5 pr-2 pl-3 sm:pr-4 sm:pl-4">
                    <Link href={`/underwriter/${u.code}`} className="font-medium text-ember hover:underline">
                      {u.code}
                    </Link>
                  </td>
                  <td className="hidden py-2.5 pr-2 sm:table-cell sm:pr-4">{u.name}</td>
                  <td className="py-2.5 pr-2 tabular-nums sm:pr-4">{u.total_ipos}</td>
                  <td className="py-2.5 pr-2 tabular-nums sm:pr-4">{u.ara_rate_pct != null ? pct(u.ara_rate_pct) : '—'}</td>
                  <td className="py-2.5 pr-2 tabular-nums sm:pr-4">{u.avg_day1_return_pct != null ? pct(u.avg_day1_return_pct) : '—'}</td>
                  <td className="py-2.5 pr-2 tabular-nums sm:pr-4">{rupiahShort(u.total_value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
