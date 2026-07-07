import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { ApiError, getIpo, type IpoDetail } from '@/lib/api';
import { rupiah, rupiahShort, pct, tanggal } from '@/lib/format';
import { StatusBadge } from '@/components/IpoCard';
import InfoGrid from '@/components/InfoGrid';
import StatStrip from '@/components/StatStrip';
import ReturnGauge from '@/components/ReturnGauge';
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

function Timeline({ steps }: { steps: { label: string; value: string; done: boolean }[] }) {
  return (
    <ol className="space-y-5 border-l-2 border-ink-line pl-5">
      {steps.map(step => (
        <li key={step.label} className="relative">
          <span
            aria-hidden
            className={`absolute top-1 -left-[1.66rem] h-2.5 w-2.5 rounded-full border-2 ${
              step.done ? 'border-ember bg-ember' : 'border-ink-line bg-ink-soft'
            }`}
          />
          <p className="text-xs uppercase tracking-wide text-mute">{step.label}</p>
          <p className="text-sm tabular-nums">{step.value}</p>
        </li>
      ))}
    </ol>
  );
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

  // Penanda progres timeline: tahap dianggap selesai bila tanggal akhirnya sudah lewat.
  // Perbandingan string ISO (yyyy-mm-dd) aman; halaman ISR, jadi presisi harian cukup.
  const today = new Date().toISOString().slice(0, 10);
  const done = (d: string | null) => d != null && d < today;
  const jadwal = [
    { label: 'Bookbuilding', value: `${tanggal(ipo.bookbuilding_start)} – ${tanggal(ipo.bookbuilding_end)}`, done: done(ipo.bookbuilding_end) },
    { label: 'Penawaran', value: `${tanggal(ipo.offering_start)} – ${tanggal(ipo.offering_end)}`, done: done(ipo.offering_end) },
    { label: 'Penjatahan', value: tanggal(ipo.allotment_date), done: done(ipo.allotment_date) },
    { label: 'Listing', value: tanggal(ipo.listing_date), done: done(ipo.listing_date) },
  ];

  const day1 = ipo.performance?.day1_return_pct ?? ipo.day1_return_pct;

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 space-y-8 px-4 py-8 sm:px-6 sm:py-10">
      <header className="space-y-4 border-b border-ink-line pb-6">
        <p className="text-xs font-medium uppercase tracking-[0.15em] text-mute">
          {ipo.sector ?? 'Emiten'}
        </p>
        <div className="flex items-start gap-4">
          {ipo.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element -- logo domains are scraped/unknown, not configured in next.config
            <img src={ipo.logo_url} alt="" className="mt-1 h-12 w-12 shrink-0 rounded-lg border border-ink-line bg-white object-contain p-1" />
          )}
          <div className="min-w-0 space-y-2">
            <h1 className="text-2xl font-bold sm:text-3xl">
              {ipo.company_name} <span className="font-normal text-mute">({ipo.ticker})</span>
            </h1>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <StatusBadge status={ipo.status} />
              {ipo.prospectus_url && (
                <a className="text-ember underline decoration-ink-line underline-offset-4 hover:decoration-ember" href={ipo.prospectus_url} target="_blank" rel="noopener noreferrer">
                  Prospektus
                </a>
              )}
              {ipo.source_url && (
                <a className="text-ember underline decoration-ink-line underline-offset-4 hover:decoration-ember" href={ipo.source_url} target="_blank" rel="noopener noreferrer">
                  Sumber e-IPO
                </a>
              )}
            </div>
          </div>
        </div>
        {ipo.description && <p className="max-w-2xl text-sm text-mute">{ipo.description}</p>}
      </header>

      <StatStrip
        stats={[
          ['Harga', hargaLabel],
          ['Nilai emisi', ipo.ipo_value != null ? rupiahShort(ipo.ipo_value) : '—'],
          ['Listing', tanggal(ipo.listing_date)],
          [
            'Return hari-1',
            day1 != null ? (
              <span className={day1 >= 0 ? 'text-grass' : 'text-coral'}>{pct(day1)}</span>
            ) : (
              '—'
            ),
          ],
        ]}
      />

      {day1 != null && penjatahanPrice > 0 && (
        <section className="space-y-2 rounded-xl border border-ink-line bg-ink-soft p-4">
          <h2 className="font-semibold">Posisi Return Hari-1</h2>
          <ReturnGauge price={penjatahanPrice} returnPct={day1} />
        </section>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <section className="space-y-4 rounded-xl border border-ink-line bg-ink-soft p-4">
          <h2 className="font-semibold">Jadwal</h2>
          <Timeline steps={jadwal} />
        </section>

        <section className="space-y-4 rounded-xl border border-ink-line bg-ink-soft p-4">
          <h2 className="font-semibold">Penawaran</h2>
          <InfoGrid
            rows={[
              ['Saham ditawarkan', ipo.shares_offered != null ? ipo.shares_offered.toLocaleString('id-ID') : '—'],
              ['Lot ditawarkan', ipo.lots_offered != null ? ipo.lots_offered.toLocaleString('id-ID') : '—'],
              ['% modal', ipo.percent_of_capital != null ? pct(ipo.percent_of_capital) : '—'],
              ['Porsi pooling', ipo.pooling_pct != null ? pct(ipo.pooling_pct) : '—'],
              ['Oversubscription', ipo.oversub_ratio != null ? `${ipo.oversub_ratio.toLocaleString('id-ID')}×` : '—'],
            ]}
          />
        </section>
      </div>

      {ipo.underwriters.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-semibold">Penjamin Emisi</h2>
          <ul className="flex flex-wrap gap-2 text-sm">
            {ipo.underwriters.map(u => (
              <li key={u.code}>
                <Link href={`/underwriter/${u.code}`} className="inline-block rounded-full border border-ink-line bg-ink-soft px-3 py-1 hover:underline">
                  {u.name}
                  {u.is_lead && (
                    <span className="ml-1.5 rounded border border-grape-line bg-grape-bg px-1 text-xs text-grape">Lead</span>
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
