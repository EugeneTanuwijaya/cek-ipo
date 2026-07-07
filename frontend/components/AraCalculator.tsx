'use client';
import { useState } from 'react';
import { profitLoss } from '@/lib/autoReject';
import { pct, rupiah } from '@/lib/format';

export default function AraCalculator({ initialPrice }: { initialPrice?: number }) {
  const [price, setPrice] = useState(initialPrice ?? 0);
  const [lots, setLots] = useState(10);
  const valid = price >= 50 && price <= 1_000_000 && Number.isInteger(lots) && lots > 0;
  const r = valid ? profitLoss(price, lots) : null;
  return (
    <div className="rounded-xl border p-4 space-y-3">
      <h3 className="font-semibold">Kalkulator ARA/ARB &amp; Profit/Loss</h3>
      {initialPrice === undefined && (
        <label className="block">Harga (Rp)
          <input type="number" value={price || ''} onChange={e => setPrice(+e.target.value)}
                 className="mt-1 w-full rounded border p-2" />
        </label>
      )}
      <label className="block">Jumlah lot
        <input type="number" value={lots || ''} onChange={e => setLots(+e.target.value)}
               className="mt-1 w-full rounded border p-2" />
      </label>
      {!valid && <p className="text-sm text-red-600">Isi harga Rp50–Rp1.000.000 dan lot bulat positif.</p>}
      {r && (
        <>
          <p>Modal: <b>{rupiah(r.capital)}</b></p>
          <table className="w-full text-sm">
            <thead><tr><th>Hari</th><th>ARA</th><th>Profit</th><th>ARB</th><th>Loss</th></tr></thead>
            <tbody>
              {r.scenarios.map(s => (
                <tr key={s.day} className="text-center">
                  <td>{s.day}</td>
                  <td>{rupiah(s.araPrice)} <span className="text-green-600">({pct(s.araPct)})</span></td>
                  <td className="text-green-600">{rupiah(s.araProfit)}</td>
                  <td>{rupiah(s.arbPrice)} <span className="text-red-600">({pct(s.arbPct)})</span></td>
                  <td className="text-red-600">{rupiah(s.arbLoss)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
