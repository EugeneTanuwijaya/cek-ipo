import { getIpos, type IpoSummary } from '@/lib/api';
import IpoCard from '@/components/IpoCard';

// Beranda selalu butuh data live dari backend — jangan coba prerender statis
// saat build (build-time fetch akan gagal bila backend tidak berjalan).
export const dynamic = 'force-dynamic';

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
  const [bookbuilding, offering, allotment, listed] = await Promise.all([
    getIpos('?status=bookbuilding'),
    getIpos('?status=offering'),
    getIpos('?status=allotment'),
    getIpos('?status=listed&per_page=8'),
  ]);

  const berlangsung = [...bookbuilding.items, ...offering.items];
  const isEmpty =
    berlangsung.length === 0 && allotment.items.length === 0 && listed.items.length === 0;

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 space-y-10 p-6">
      <h1 className="text-2xl font-bold">IPO Saham Indonesia</h1>
      {isEmpty && <p className="text-sm text-gray-500">Belum ada data IPO.</p>}
      <Section title="Sedang Berlangsung" ipos={berlangsung} />
      <Section title="Segera Listing" ipos={allotment.items} />
      <Section title="Baru Listing" ipos={listed.items} />
    </main>
  );
}
