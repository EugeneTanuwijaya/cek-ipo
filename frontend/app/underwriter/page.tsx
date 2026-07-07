import Link from 'next/link';
import type { Metadata } from 'next';
import { getUnderwriters, type UnderwriterStats } from '@/lib/api';
import { rupiah, pct } from '@/lib/format';

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
    <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 p-6">
      <h1 className="text-2xl font-bold">Underwriter</h1>

      {loadFailed && (
        <p className="text-sm text-gray-500">Data underwriter belum tersedia. Coba muat ulang beberapa saat lagi.</p>
      )}
      {!loadFailed && underwriters.length === 0 && (
        <p className="text-sm text-gray-500">Belum ada data underwriter.</p>
      )}

      {underwriters.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="py-2 pr-4 font-normal">Kode</th>
                <th className="py-2 pr-4 font-normal">Nama</th>
                <th className="py-2 pr-4 font-normal">Jumlah IPO</th>
                <th className="py-2 pr-4 font-normal">% ARA Hari-1</th>
                <th className="py-2 pr-4 font-normal">Rata-rata Return Hari-1</th>
                <th className="py-2 pr-4 font-normal">Total Nilai Emisi</th>
              </tr>
            </thead>
            <tbody>
              {underwriters.map(u => (
                <tr key={u.code} className="border-b last:border-0">
                  <td className="py-2 pr-4">
                    <Link href={`/underwriter/${u.code}`} className="font-medium text-blue-600 hover:underline">
                      {u.code}
                    </Link>
                  </td>
                  <td className="py-2 pr-4">{u.name}</td>
                  <td className="py-2 pr-4">{u.total_ipos}</td>
                  <td className="py-2 pr-4">{u.ara_rate_pct != null ? pct(u.ara_rate_pct) : '—'}</td>
                  <td className="py-2 pr-4">{u.avg_day1_return_pct != null ? pct(u.avg_day1_return_pct) : '—'}</td>
                  <td className="py-2 pr-4">{rupiah(u.total_value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
