'use client';
import { useState } from 'react';
import { estimateAllotment } from '@/lib/penjatahan';
import { rupiah } from '@/lib/format';

export default function PenjatahanCalculator(
  { price, ipoValue, oversub }: { price: number; ipoValue: number; oversub: number | null }
) {
  const [orderLots, setOrderLots] = useState(10);
  const [oversubInput, setOversubInput] = useState(oversub ?? 0);
  const result = estimateAllotment({ orderLots, price, ipoValue, oversub: oversubInput });

  return (
    <div className="space-y-4 rounded-xl border border-ink-line bg-ink-soft p-4">
      <h3 className="font-semibold">Kalkulator Estimasi Penjatahan</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="text-mute">Jumlah lot pesanan</span>
          <input type="number" value={orderLots || ''} onChange={e => setOrderLots(+e.target.value)}
                 className="mt-1 w-full rounded-lg border border-ink-line p-2 text-base focus:border-ember focus:outline-none sm:text-sm" />
        </label>
        <label className="block text-sm">
          <span className="text-mute">Rasio oversubscription</span>
          <input type="number" step="0.1" value={oversubInput || ''} onChange={e => setOversubInput(+e.target.value)}
                 className="mt-1 w-full rounded-lg border border-ink-line p-2 text-base focus:border-ember focus:outline-none sm:text-sm" />
        </label>
      </div>
      {'error' in result ? (
        <p className="text-sm text-coral">{result.error}</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg bg-ink p-3">
            <p className="text-xs text-mute">Estimasi lot didapat</p>
            <p className="text-lg font-semibold tabular-nums">{result.estimatedLots} lot</p>
            <p className="text-xs text-mute">{result.fillPct.toFixed(1)}% dari pesanan</p>
          </div>
          <div className="rounded-lg bg-ink p-3">
            <p className="text-xs text-mute">Nilai efektif</p>
            <p className="text-lg font-semibold tabular-nums">{rupiah(result.effectiveValue)}</p>
          </div>
          <div className="rounded-lg bg-ink p-3">
            <p className="text-xs text-mute">Kategori</p>
            <p className="text-lg font-semibold">{result.isRetail ? 'Ritel' : 'Non-ritel'}</p>
          </div>
        </div>
      )}
      <p className="text-xs text-mute">Estimasi berdasarkan aturan penjatahan terpusat SEOJK 25/2025 — bukan hasil resmi penjatahan.</p>
    </div>
  );
}
