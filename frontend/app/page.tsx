import { getIpos, type IpoSummary } from '@/lib/api';
import IpoCard from '@/components/IpoCard';

function Section({ title, ipos }: { title: string; ipos: IpoSummary[] }) {
  if (ipos.length === 0) return null;
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">{title}</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ipos.map(ipo => <IpoCard key={ipo.ticker} ipo={ipo} />)}
      </div>
    </section>
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
  } catch {
    loadFailed = true;
  }

  const isEmpty =
    berlangsung.length === 0 && segeraListing.length === 0 && baruListing.length === 0;

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 space-y-10 p-6">
      <h1 className="text-2xl font-bold">IPO Saham Indonesia</h1>
      {loadFailed && (
        <p className="text-sm text-gray-500">Data IPO belum tersedia. Coba muat ulang beberapa saat lagi.</p>
      )}
      {!loadFailed && isEmpty && <p className="text-sm text-gray-500">Belum ada data IPO.</p>}
      <Section title="Sedang Berlangsung" ipos={berlangsung} />
      <Section title="Segera Listing" ipos={segeraListing} />
      <Section title="Baru Listing" ipos={baruListing} />
    </main>
  );
}
