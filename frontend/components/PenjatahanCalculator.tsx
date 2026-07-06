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
    <div className="rounded-xl border p-4 space-y-3">
      <h3 className="font-semibold">Kalkulator Estimasi Penjatahan</h3>
      <label className="block">Jumlah lot pesanan
        <input type="number" value={orderLots || ''} onChange={e => setOrderLots(+e.target.value)}
               className="mt-1 w-full rounded border p-2" />
      </label>
      <label className="block">Rasio oversubscription
        <input type="number" step="0.1" value={oversubInput || ''} onChange={e => setOversubInput(+e.target.value)}
               className="mt-1 w-full rounded border p-2" />
      </label>
      {'error' in result ? (
        <p className="text-sm text-red-600">{result.error}</p>
      ) : (
        <div className="text-sm space-y-1">
          <p>Estimasi lot didapat: <b>{result.estimatedLots}</b> lot ({result.fillPct.toFixed(1)}% dari pesanan)</p>
          <p>Nilai efektif: <b>{rupiah(result.effectiveValue)}</b></p>
          <p>Kategori: {result.isRetail ? 'Ritel' : 'Non-ritel'}</p>
        </div>
      )}
      <p className="text-xs text-gray-500">Estimasi berdasarkan aturan penjatahan terpusat SEOJK 25/2025 — bukan hasil resmi penjatahan.</p>
    </div>
  );
}
