import type { Metadata } from 'next';
import AraCalculator from '@/components/AraCalculator';

// Halaman statis — tidak ada fetch data, jadi tanpa isu build-time seperti
// halaman lain yang bergantung pada backend.
export const metadata: Metadata = {
  title: 'Kalkulator ARA/ARB',
  description: 'Hitung batas Auto Rejection Atas/Bawah dan potensi profit/loss untuk harga IPO berapa pun.',
};

export default function KalkulatorPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">Kalkulator ARA/ARB Mandiri</h1>
        <p className="text-sm text-gray-600">
          Masukkan harga saham dan jumlah lot untuk melihat proyeksi batas Auto Rejection Atas (ARA)
          dan Auto Rejection Bawah (ARB) selama 5 hari perdagangan pertama, beserta estimasi profit/loss-nya.
        </p>
      </header>

      <AraCalculator />

      <section className="space-y-2 rounded-xl border p-4 text-sm">
        <h2 className="font-semibold">Aturan ARA/ARB</h2>
        <ul className="list-disc space-y-1 pl-5 text-gray-700">
          <li>Harga ≤ Rp200: batas ARA 35%.</li>
          <li>Rp200 &lt; harga ≤ Rp5.000: batas ARA 25%.</li>
          <li>Harga &gt; Rp5.000: batas ARA 20%.</li>
          <li>ARB (batas bawah) berlaku flat 15% untuk semua rentang harga.</li>
          <li>Khusus hari pertama perdagangan (hari-1), baik batas ARA maupun ARB dikalikan 2× dari persentase normal di atas.</li>
        </ul>
        <p className="text-gray-500">
          Sumber: Peraturan BEI Nomor II-A tentang Perdagangan Efek Bersifat Ekuitas.
        </p>
        <p className="text-gray-500">
          Perhitungan mengikuti ketentuan auto rejection BEI yang berlaku; selalu cek pengumuman bursa terbaru.
        </p>
      </section>
    </main>
  );
}
