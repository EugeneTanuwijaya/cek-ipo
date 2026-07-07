import Link from 'next/link';
import { rupiah, pct, tanggal } from '@/lib/format';
import type { IpoSummary } from '@/lib/api';

export const STATUS_LABEL: Record<string, string> = {
  bookbuilding: 'Bookbuilding',
  offering: 'Penawaran',
  allotment: 'Penjatahan',
  listed: 'Listed',
  cancelled: 'Dibatalkan',
};

const STATUS_CLASS: Record<string, string> = {
  bookbuilding: 'border border-ink-line bg-ink-soft text-mute',
  offering: 'border border-grass-line bg-grass-bg text-grass',
  allotment: 'border border-grape-line bg-grape-bg text-grape',
  listed: 'border border-grass-line bg-grass-bg text-grass',
  cancelled: 'border border-ink-line bg-ink text-mute',
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-xs ${STATUS_CLASS[status] ?? 'border border-ink-line bg-ink-soft text-mute'}`}
    >
      {status === 'offering' && (
        <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-grass-solid" />
      )}
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

export default function IpoCard({ ipo }: { ipo: IpoSummary }) {
  const hargaLabel =
    ipo.final_price != null
      ? rupiah(ipo.final_price)
      : ipo.price_low != null && ipo.price_high != null
        ? `${rupiah(ipo.price_low)} – ${rupiah(ipo.price_high)}`
        : '—';
  const returnPositive = ipo.day1_return_pct != null && ipo.day1_return_pct >= 0;
  // Info waktu paling relevan per status: batas pesan saat penawaran, selain itu tanggal listing.
  const dateInfo =
    ipo.status === 'offering' && ipo.offering_end
      ? `Pesan s/d ${tanggal(ipo.offering_end)}`
      : ipo.listing_date
        ? `Listing ${tanggal(ipo.listing_date)}`
        : null;

  return (
    <Link
      href={`/ipo/${ipo.ticker}`}
      className="group block space-y-3 rounded-xl border border-ink-line bg-ink-soft p-4 transition-shadow hover:shadow-md hover:shadow-black/5"
    >
      <div className="flex items-start gap-3">
        {ipo.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element -- logo domains are scraped/unknown, not configured in next.config
          <img src={ipo.logo_url} alt="" className="h-9 w-9 shrink-0 rounded object-contain" />
        ) : (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-ink text-xs font-semibold text-mute">
            {ipo.ticker.slice(0, 2)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-serif text-lg font-semibold leading-tight group-hover:underline">{ipo.ticker}</p>
          <p className="truncate text-sm text-mute">{ipo.company_name}</p>
        </div>
        <StatusBadge status={ipo.status} />
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-ink-line pt-3 text-sm">
        <span className="tabular-nums">{hargaLabel}</span>
        {ipo.day1_return_pct != null ? (
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium tabular-nums ${returnPositive ? 'bg-grass-bg text-grass' : 'bg-coral-bg text-coral'}`}>
            {pct(ipo.day1_return_pct)}
          </span>
        ) : (
          dateInfo && <span className="truncate text-xs text-mute">{dateInfo}</span>
        )}
      </div>
    </Link>
  );
}
