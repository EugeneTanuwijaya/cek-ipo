import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ApiError, getUnderwriter, type IpoSummary, type UnderwriterStats } from '@/lib/api';
import { rupiah, pct } from '@/lib/format';
import IpoCard from '@/components/IpoCard';

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
    <main className="mx-auto w-full max-w-5xl flex-1 space-y-8 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">{uw.name}</h1>
        <p className="text-sm text-gray-500">{uw.code}</p>
      </header>

      <section>
        <table className="w-full max-w-md text-sm">
          <tbody>
            <tr>
              <th scope="row" className="pr-4 text-left font-normal text-gray-500">Jumlah IPO</th>
              <td>{uw.total_ipos}</td>
            </tr>
            <tr>
              <th scope="row" className="pr-4 text-left font-normal text-gray-500">% ARA Hari-1</th>
              <td>{uw.ara_rate_pct != null ? pct(uw.ara_rate_pct) : '—'}</td>
            </tr>
            <tr>
              <th scope="row" className="pr-4 text-left font-normal text-gray-500">Rata-rata Return Hari-1</th>
              <td>{uw.avg_day1_return_pct != null ? pct(uw.avg_day1_return_pct) : '—'}</td>
            </tr>
            <tr>
              <th scope="row" className="pr-4 text-left font-normal text-gray-500">Total Nilai Emisi</th>
              <td>{rupiah(uw.total_value)}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">IPO yang digarap</h2>
        {uw.ipos.length === 0 ? (
          <p className="text-sm text-gray-500">Belum ada IPO yang tercatat.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {uw.ipos.map(ipo => (
              <div key={ipo.ticker} className="space-y-1">
                <IpoCard ipo={ipo} />
                {ipo.day1_return_pct == null && (
                  <p className="text-xs text-gray-400">Return hari-1: belum tersedia</p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
