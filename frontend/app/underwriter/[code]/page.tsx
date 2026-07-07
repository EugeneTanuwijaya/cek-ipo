import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ApiError, getUnderwriter, type IpoSummary, type UnderwriterStats } from '@/lib/api';
import { rupiahShort, pct } from '@/lib/format';
import IpoCard from '@/components/IpoCard';
import StatStrip from '@/components/StatStrip';

// Tanpa generateStaticParams: rute dirender on-demand lalu di-cache ISR
// (revalidate 3600 detik dari fetch di lib/api.ts) — sama seperti /ipo/[ticker].

type Params = Promise<{ code: string }>;
type UnderwriterDetail = UnderwriterStats & { ipos: IpoSummary[] };

// 404 dari API → null (halaman memanggil notFound()); kegagalan lain
// (backend mati, 5xx) dilempar ulang ke error boundary (app/error.tsx).
async function loadUnderwriter(code: string): Promise<UnderwriterDetail | null> {
  try {
    return await getUnderwriter(code);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { code } = await params;
  const uw = await loadUnderwriter(code);
  if (!uw) return { title: `Underwriter ${code.toUpperCase()} tidak ditemukan` };
  return {
    title: uw.name,
    description: `Statistik dan daftar IPO yang digarap oleh ${uw.name} (${uw.code}).`,
  };
}

export default async function UnderwriterDetailPage({ params }: { params: Params }) {
  const { code } = await params;
  const uw = await loadUnderwriter(code);
  if (!uw) notFound();

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 space-y-8 px-4 py-8 sm:px-6 sm:py-10">
      <header className="space-y-2 border-b border-ink-line pb-6">
        <p className="text-xs font-medium uppercase tracking-[0.15em] text-mute">
          Penjamin Emisi · {uw.code}
        </p>
        <h1 className="text-2xl font-bold sm:text-3xl">{uw.name}</h1>
      </header>

      <StatStrip
        stats={[
          ['Jumlah IPO', uw.total_ipos],
          ['% ARA hari-1', uw.ara_rate_pct != null ? pct(uw.ara_rate_pct) : '—'],
          ['Rata-rata return hari-1', uw.avg_day1_return_pct != null ? pct(uw.avg_day1_return_pct) : '—'],
          ['Total nilai emisi', rupiahShort(uw.total_value)],
        ]}
      />

      <section className="space-y-4">
        <div className="flex items-baseline justify-between border-b border-ink-line pb-2">
          <h2 className="text-lg font-semibold">IPO yang digarap</h2>
          {uw.ipos.length > 0 && <span className="text-xs text-mute">{uw.ipos.length} emiten</span>}
        </div>
        {uw.ipos.length === 0 ? (
          <p className="text-sm text-mute">Belum ada IPO yang tercatat.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {uw.ipos.map(ipo => (
              <div key={ipo.ticker} className="space-y-1">
                <IpoCard ipo={ipo} />
                {ipo.day1_return_pct == null && (
                  <p className="text-xs text-mute">Return hari-1: belum tersedia</p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
