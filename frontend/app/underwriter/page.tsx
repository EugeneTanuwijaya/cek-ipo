import type { Metadata } from 'next';
import { getUnderwriters, type UnderwriterStats } from '@/lib/api';
import UnderwriterTable from '@/components/UnderwriterTable';

export const metadata: Metadata = {
  title: 'Underwriter',
  description: 'Statistik underwriter IPO: jumlah IPO, tingkat ARA hari-1, rata-rata return, dan total nilai emisi.',
};

export default async function UnderwriterListPage() {
  // Sama seperti halaman beranda: di-prerender statis + ISR (revalidate 3600
  // detik dari fetch di lib/api.ts). Bila backend tidak terjangkau (mis. saat
  // `next build` tanpa backend berjalan), jangan gagalkan render — tampilkan
  // keadaan kosong; ISR akan mengisi data pada revalidasi berikutnya.
  let underwriters: UnderwriterStats[] = [];
  let loadFailed = false;
  try {
    underwriters = await getUnderwriters();
  } catch {
    loadFailed = true;
  }

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-4 py-8 sm:px-6 sm:py-10">
      <header className="space-y-2 border-b border-ink-line pb-6">
        <p className="text-xs font-medium uppercase tracking-[0.15em] text-mute">Penjamin Emisi Efek</p>
        <h1 className="text-2xl font-bold sm:text-3xl">Underwriter</h1>
        <p className="text-sm text-mute">Statistik penjamin emisi berdasarkan IPO yang pernah digarap.</p>
      </header>

      {loadFailed && (
        <p className="rounded-xl border border-dashed border-ink-line bg-ink-soft/50 p-10 text-center text-sm text-mute">
          Data underwriter belum tersedia. Coba muat ulang beberapa saat lagi.
        </p>
      )}
      {!loadFailed && underwriters.length === 0 && (
        <p className="rounded-xl border border-dashed border-ink-line bg-ink-soft/50 p-10 text-center text-sm text-mute">
          Belum ada data underwriter.
        </p>
      )}

      {underwriters.length > 0 && <UnderwriterTable underwriters={underwriters} />}
    </main>
  );
}
