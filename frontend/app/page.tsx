import Link from 'next/link';
import { getIpos, type IpoSummary } from '@/lib/api';
import IpoCard from '@/components/IpoCard';

function Section({ title, ipos }: { title: string; ipos: IpoSummary[] }) {
  if (ipos.length === 0) return null;
  return (
    <section className="space-y-4">
      <div className="flex items-baseline justify-between border-b border-ink-line pb-2">
        <h2 className="text-xl font-semibold">{title}</h2>
        <span className="text-xs tabular-nums text-mute">{ipos.length} emiten</span>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ipos.map(ipo => <IpoCard key={ipo.ticker} ipo={ipo} />)}
      </div>
    </section>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-ink-line bg-ink-soft/50 p-10 text-center text-sm text-mute">
      {children}
    </p>
  );
}

export default async function Home() {
  // Halaman ini di-prerender statis + ISR (revalidate 3600 detik dari fetch di lib/api.ts).
  // Bila backend tidak terjangkau (mis. saat `next build` tanpa backend berjalan),
  // jangan gagalkan render — tampilkan keadaan kosong; ISR akan mengisi data
  // pada revalidasi berikutnya saat backend tersedia.
  let berlangsung: IpoSummary[] = [];
  let segeraListing: IpoSummary[] = [];
  let baruListing: IpoSummary[] = [];
  let totals: { berlangsung: number; segera: number; listed: number } | null = null;
  let loadFailed = false;
  try {
    const [bookbuilding, offering, allotment, listed] = await Promise.all([
      getIpos('?status=bookbuilding'),
      getIpos('?status=offering'),
      getIpos('?status=allotment'),
      getIpos('?status=listed&per_page=8'),
    ]);
    berlangsung = [...bookbuilding.items, ...offering.items];
    segeraListing = allotment.items;
    baruListing = listed.items;
    totals = {
      berlangsung: bookbuilding.total + offering.total,
      segera: allotment.total,
      listed: listed.total,
    };
  } catch {
    loadFailed = true;
  }

  const isEmpty =
    berlangsung.length === 0 && segeraListing.length === 0 && baruListing.length === 0;

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 space-y-10 px-4 py-8 sm:px-6 sm:py-10">
      <header className="space-y-4 border-b-4 border-double border-ink-line pb-8">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-mute">
          Bursa Efek Indonesia · Penawaran Umum Perdana
        </p>
        <h1 className="max-w-2xl text-4xl font-bold sm:text-5xl">IPO Saham Indonesia</h1>
        <p className="max-w-2xl text-sm text-mute sm:text-base">
          Jadwal, harga, dan status terkini penawaran umum perdana saham — dilengkapi kalkulator
          ARA/ARB dan estimasi penjatahan untuk tiap emiten.
        </p>
        {totals && (
          <div className="space-y-3">
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-grass-line bg-grass-bg px-2 py-0.5 text-xs text-grass">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-grass-solid" />
              {totals.berlangsung} IPO sedang berlangsung
            </span>
            <div>
              <Link
                href="/kalkulator"
                className="inline-block rounded-full bg-ember px-4 py-2 text-sm font-medium text-white hover:bg-ember-soft"
              >
                Buka Kalkulator ARA/ARB
              </Link>
            </div>
          </div>
        )}
      </header>

      {loadFailed && (
        <EmptyState>Data IPO belum tersedia. Coba muat ulang beberapa saat lagi.</EmptyState>
      )}
      {!loadFailed && isEmpty && <EmptyState>Belum ada data IPO.</EmptyState>}
      <Section title="Sedang Berlangsung" ipos={berlangsung} />
      <Section title="Segera Listing" ipos={segeraListing} />
      <Section title="Baru Listing" ipos={baruListing} />
    </main>
  );
}
