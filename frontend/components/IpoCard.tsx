import Link from 'next/link';
import { rupiah, pct } from '@/lib/format';
import type { IpoSummary } from '@/lib/api';

const STATUS_LABEL: Record<string, string> = {
  bookbuilding: 'Bookbuilding',
  offering: 'Penawaran',
  allotment: 'Penjatahan',
  listed: 'Listed',
};

const STATUS_CLASS: Record<string, string> = {
  bookbuilding: 'bg-blue-100 text-blue-800',
  offering: 'bg-amber-100 text-amber-800',
  allotment: 'bg-purple-100 text-purple-800',
  listed: 'bg-green-100 text-green-800',
};

export default function IpoCard({ ipo }: { ipo: IpoSummary }) {
  const hargaLabel =
    ipo.final_price != null
      ? rupiah(ipo.final_price)
      : ipo.price_low != null && ipo.price_high != null
        ? `${rupiah(ipo.price_low)} – ${rupiah(ipo.price_high)}`
        : '—';

  return (
    <div className="rounded-xl border p-4 space-y-2">
      <div className="flex items-center gap-3">
        {ipo.logo_url && (
          // eslint-disable-next-line @next/next/no-img-element -- logo domains are scraped/unknown, not configured in next.config
          <img src={ipo.logo_url} alt="" className="h-8 w-8 rounded object-contain" />
        )}
        <Link href={`/ipo/${ipo.ticker}`} className="font-semibold hover:underline">
          {ipo.ticker}
        </Link>
        <span className={`ml-auto rounded-full px-2 py-0.5 text-xs ${STATUS_CLASS[ipo.status] ?? 'bg-gray-100 text-gray-800'}`}>
          {STATUS_LABEL[ipo.status] ?? ipo.status}
        </span>
      </div>
      <p className="text-sm text-gray-700">{ipo.company_name}</p>
      <p className="text-sm">{hargaLabel}</p>
      {ipo.day1_return_pct != null && (
        <p className={`text-sm font-medium ${ipo.day1_return_pct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          Return hari-1: {pct(ipo.day1_return_pct)}
        </p>
      )}
    </div>
  );
}
