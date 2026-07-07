import { araPct, arbPct } from '@/lib/autoReject';

// Signature visual: posisi return hari-1 di dalam pita auto rejection resmi
// (lebar ARA/ARB berbeda per tingkat harga, lihat lib/rules.ts), bukan cuma
// angka persen lepas — ini yang membuat "IPO ini ARA" atau "ARB" terlihat,
// bukan hanya terbaca.
export default function ReturnGauge({ price, returnPct }: { price: number; returnPct: number }) {
  const ara = araPct(price) * 100;
  const arb = arbPct(price) * 100;
  const span = ara + arb;
  const clamped = Math.min(ara, Math.max(-arb, returnPct));
  const markerPct = ((clamped + arb) / span) * 100;
  const lockedAra = returnPct >= ara - 0.05;
  const lockedArb = returnPct <= -arb + 0.05;

  return (
    <div
      className="space-y-1.5"
      role="img"
      aria-label={`Return hari-1 ${returnPct.toFixed(1)}%, dalam pita ARB minus ${arb.toFixed(0)}% sampai ARA plus ${ara.toFixed(0)}%${lockedAra ? ', terkunci ARA' : lockedArb ? ', terkunci ARB' : ''}`}
    >
      <div className="flex items-center justify-between text-xs text-mute">
        <span>ARB &minus;{arb.toFixed(0)}%</span>
        {(lockedAra || lockedArb) && (
          <span className={`font-medium ${lockedAra ? 'text-grass' : 'text-coral'}`}>
            Terkunci {lockedAra ? 'ARA' : 'ARB'}
          </span>
        )}
        <span>ARA +{ara.toFixed(0)}%</span>
      </div>
      <div aria-hidden className="relative h-3 overflow-hidden rounded-full border border-ink-line">
        <div className="absolute inset-y-0 left-0 bg-coral-bg" style={{ width: `${(arb / span) * 100}%` }} />
        <div className="absolute inset-y-0 right-0 bg-grass-bg" style={{ width: `${(ara / span) * 100}%` }} />
        <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-ink-line" />
        <div
          className={`absolute top-0 h-full w-1 -translate-x-1/2 ${returnPct >= 0 ? 'bg-grass-solid' : 'bg-coral-solid'}`}
          style={{ left: `${markerPct}%` }}
        />
      </div>
    </div>
  );
}
