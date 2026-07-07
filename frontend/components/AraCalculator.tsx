'use client';
import { useState } from 'react';
import { profitLoss } from '@/lib/autoReject';
import { pct, rupiah } from '@/lib/format';

export type StockOption = { ticker: string; company_name: string; price: number };

const MANUAL = '__manual__';

export default function AraCalculator({
  initialPrice,
  stocks,
}: {
  initialPrice?: number;
  stocks?: StockOption[];
}) {
  const [selected, setSelected] = useState(stocks?.[0]?.ticker ?? MANUAL);
  const [manualPrice, setManualPrice] = useState(initialPrice ?? 0);
  const [lots, setLots] = useState(10);

  const selectedStock = stocks?.find(s => s.ticker === selected);
  const price = initialPrice ?? selectedStock?.price ?? manualPrice;
  const showManualInput = initialPrice === undefined && !selectedStock;
  const valid = price >= 50 && price <= 1_000_000 && Number.isInteger(lots) && lots > 0;
  const r = valid ? profitLoss(price, lots) : null;

  return (
    <div className="space-y-4 rounded-xl border border-ink-line bg-ink-soft p-4">
      <h3 className="font-semibold">Kalkulator ARA/ARB &amp; Profit/Loss</h3>

      {stocks && stocks.length > 0 && (
        <label className="block text-sm">
          <span className="text-mute">Pilih saham</span>
          <select
            value={selected}
            onChange={e => setSelected(e.target.value)}
            className="mt-1 w-full rounded-lg border border-ink-line bg-ink-soft p-2 text-base focus:border-ember focus:outline-none sm:text-sm"
          >
            {stocks.map(s => (
              <option key={s.ticker} value={s.ticker}>
                {s.ticker} — {s.company_name} ({rupiah(s.price)})
              </option>
            ))}
            <option value={MANUAL}>Saham lain (isi harga manual)</option>
          </select>
        </label>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {showManualInput && (
          <label className="block text-sm">
            <span className="text-mute">Harga (Rp)</span>
            <input type="number" value={manualPrice || ''} onChange={e => setManualPrice(+e.target.value)}
                   className="mt-1 w-full rounded-lg border border-ink-line p-2 text-base focus:border-ember focus:outline-none sm:text-sm" />
          </label>
        )}
        <label className={`block text-sm ${showManualInput ? '' : 'sm:col-span-2'}`}>
          <span className="text-mute">Jumlah lot</span>
          <input type="number" value={lots || ''} onChange={e => setLots(+e.target.value)}
                 className="mt-1 w-full rounded-lg border border-ink-line p-2 text-base focus:border-ember focus:outline-none sm:text-sm" />
        </label>
      </div>

      {!valid && <p className="text-sm text-coral">Isi harga Rp50–Rp1.000.000 dan lot bulat positif.</p>}
      {r && (
        <>
          <p className="text-sm text-mute">
            Modal awal <span className="ml-2 text-base font-semibold text-fog">{rupiah(r.capital)}</span>
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:min-w-[420px] sm:text-sm">
              <thead>
                <tr className="border-b border-ink-line text-xs uppercase tracking-wide text-mute">
                  <th className="py-2 pr-2 text-left font-normal sm:pr-3">Hari</th>
                  <th className="py-2 pr-2 text-left font-normal sm:pr-3">ARA</th>
                  <th className="py-2 pr-2 text-left font-normal sm:pr-3">Profit</th>
                  <th className="py-2 pr-2 text-left font-normal sm:pr-3">ARB</th>
                  <th className="py-2 text-left font-normal">Loss</th>
                </tr>
              </thead>
              <tbody>
                {r.scenarios.map(s => (
                  <tr key={s.day} className="border-b border-ink-line last:border-0">
                    <td className="py-2 pr-2 tabular-nums sm:pr-3">{s.day}</td>
                    <td className="py-2 pr-2 tabular-nums sm:pr-3">{rupiah(s.araPrice)} <span className="block text-grass sm:inline">({pct(s.araPct)})</span></td>
                    <td className="py-2 pr-2 tabular-nums text-grass sm:pr-3">{rupiah(s.araProfit)}</td>
                    <td className="py-2 pr-2 tabular-nums sm:pr-3">{rupiah(s.arbPrice)} <span className="block text-coral sm:inline">({pct(s.arbPct)})</span></td>
                    <td className="py-2 tabular-nums text-coral">{rupiah(s.arbLoss)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
