import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { ApiError, getIpo, type IpoDetail } from '@/lib/api';
import { rupiah, pct } from '@/lib/format';
import AraCalculator from '@/components/AraCalculator';
import PenjatahanCalculator from '@/components/PenjatahanCalculator';

// Tanpa generateStaticParams: rute dirender on-demand lalu di-cache ISR
// (revalidate 3600 detik dari fetch di lib/api.ts).

type Params = Promise<{ ticker: string }>;

// 404 dari API → null (halaman memanggil notFound()); kegagalan lain
// (backend mati, 5xx) dilempar ulang ke error boundary (Task 14).
async function loadIpo(ticker: string): Promise<IpoDetail | null> {
  try {
    return await getIpo(ticker);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { ticker } = await params;
  const ipo = await loadIpo(ticker);
  if (!ipo) return { title: `IPO ${ticker.toUpperCase()} tidak ditemukan` };
  return {
    title: `IPO ${ipo.ticker} — ${ipo.company_name}`,
    description:
      ipo.description ??
      `Jadwal, harga, dan kalkulator ARA/ARB serta estimasi penjatahan untuk IPO ${ipo.company_name} (${ipo.ticker}).`,
  };
}

export default async function IpoDetailPage({ params }: { params: Params }) {
  const { ticker } = await params;
  const ipo = await loadIpo(ticker);
  if (!ipo) notFound();

  const hargaLabel =
    ipo.final_price != null
      ? rupiah(ipo.final_price)
      : ipo.price_low != null && ipo.price_high != null
        ? `${rupiah(ipo.price_low)} – ${rupiah(ipo.price_high)}`
        : '—';

  const penjatahanPrice = ipo.effective_price ?? ipo.final_price ?? ipo.price_high ?? 0;
  const ipoValue = ipo.ipo_value ?? 0;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-8 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">{ipo.company_name} ({ipo.ticker})</h1>
        {ipo.sector && <p className="text-sm text-gray-500">{ipo.sector}</p>}
        {ipo.description && <p className="text-sm">{ipo.description}</p>}
        <div className="flex gap-4 text-sm">
          {ipo.prospectus_url && (
            <a className="text-blue-600 hover:underline" href={ipo.prospectus_url} target="_blank" rel="noopener noreferrer">
              Prospektus
            </a>
          )}
          {ipo.source_url && (
            <a className="text-blue-600 hover:underline" href={ipo.source_url} target="_blank" rel="noopener noreferrer">
              Sumber e-IPO
            </a>
          )}
        </div>
      </header>

      <section>
        <h2 className="mb-2 text-lg font-semibold">Jadwal</h2>
        <table className="w-full text-sm">
          <tbody>
            <tr><th scope="row" className="pr-4 text-left font-normal text-gray-500">Bookbuilding</th><td>{ipo.bookbuilding_start ?? '—'} s/d {ipo.bookbuilding_end ?? '—'}</td></tr>
            <tr><th scope="row" className="pr-4 text-left font-normal text-gray-500">Penawaran</th><td>{ipo.offering_start ?? '—'} s/d {ipo.offering_end ?? '—'}</td></tr>
            <tr><th scope="row" className="pr-4 text-left font-normal text-gray-500">Penjatahan</th><td>{ipo.allotment_date ?? '—'}</td></tr>
            <tr><th scope="row" className="pr-4 text-left font-normal text-gray-500">Listing</th><td>{ipo.listing_date ?? '—'}</td></tr>
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold">Penawaran</h2>
        <table className="w-full text-sm">
          <tbody>
            <tr><th scope="row" className="pr-4 text-left font-normal text-gray-500">Harga</th><td>{hargaLabel}</td></tr>
            <tr><th scope="row" className="pr-4 text-left font-normal text-gray-500">Saham ditawarkan</th><td>{ipo.shares_offered != null ? ipo.shares_offered.toLocaleString('id-ID') : '—'}</td></tr>
            <tr><th scope="row" className="pr-4 text-left font-normal text-gray-500">Lot ditawarkan</th><td>{ipo.lots_offered != null ? ipo.lots_offered.toLocaleString('id-ID') : '—'}</td></tr>
            <tr><th scope="row" className="pr-4 text-left font-normal text-gray-500">Nilai emisi</th><td>{ipo.ipo_value != null ? rupiah(ipo.ipo_value) : '—'}</td></tr>
            <tr><th scope="row" className="pr-4 text-left font-normal text-gray-500">% modal</th><td>{ipo.percent_of_capital != null ? pct(ipo.percent_of_capital) : '—'}</td></tr>
            <tr><th scope="row" className="pr-4 text-left font-normal text-gray-500">Porsi pooling</th><td>{ipo.pooling_pct != null ? pct(ipo.pooling_pct) : '—'}</td></tr>
          </tbody>
        </table>
      </section>

      {ipo.underwriters.length > 0 && (
        <section>
          <h2 className="mb-2 text-lg font-semibold">Penjamin Emisi</h2>
          <ul className="flex flex-wrap gap-2 text-sm">
            {ipo.underwriters.map(u => (
              <li key={u.code}>
                <Link href={`/underwriter/${u.code}`} className="rounded border px-2 py-1 hover:underline">
                  {u.name}
                  {u.is_lead && (
                    <span className="ml-1 rounded bg-indigo-100 px-1 text-xs text-indigo-800">Lead</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <AraCalculator initialPrice={ipo.effective_price ?? undefined} />
      <PenjatahanCalculator price={penjatahanPrice} ipoValue={ipoValue} oversub={ipo.oversub_ratio} />
    </main>
  );
}
