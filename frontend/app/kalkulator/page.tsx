import type { Metadata } from 'next';
import AraCalculator, { type StockOption } from '@/components/AraCalculator';
import { getIpo, type IpoDetail } from '@/lib/api';

// Emiten yang sedang berlangsung/baru listing bulan ini — dipilih manual, bukan
// dari status API, karena kalkulator ini berumur pendek (ganti tiap batch IPO baru).
const FEATURED_TICKERS = ['JELI', 'JECX', 'PRDL', 'BACH', 'RANS', 'EMMI'];

// Halaman ini sekarang fetch harga tiap emiten unggulan (ISR, revalidate 3600
// detik dari lib/api.ts). Ticker yang gagal dimuat (404/backend mati) di-skip
// diam-diam — kalkulator tetap jalan dengan mode harga manual.
async function loadFeaturedStocks(): Promise<StockOption[]> {
  const results = await Promise.allSettled(FEATURED_TICKERS.map(t => getIpo(t)));
  return results
    .filter((r): r is PromiseFulfilledResult<IpoDetail> => r.status === 'fulfilled')
    .map(({ value: ipo }) => ({
      ticker: ipo.ticker,
      company_name: ipo.company_name,
      price: ipo.effective_price ?? ipo.final_price ?? ipo.price_high ?? 0,
    }))
    .filter(s => s.price > 0);
}

export const metadata: Metadata = {
  title: 'Kalkulator ARA/ARB',
  description: 'Hitung batas Auto Rejection Atas/Bawah dan potensi profit/loss untuk harga IPO berapa pun.',
};

export default async function KalkulatorPage() {
  const stocks = await loadFeaturedStocks();

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-4 py-8 sm:px-6 sm:py-10">
      <header className="space-y-2 border-b border-ink-line pb-6">
        <p className="text-xs font-medium uppercase tracking-[0.15em] text-mute">Alat Bantu</p>
        <h1 className="text-2xl font-bold sm:text-3xl">Kalkulator ARA/ARB Mandiri</h1>
        <p className="text-sm text-mute">
          Pilih saham yang sedang berlangsung atau baru listing bulan ini, lalu masukkan jumlah lot —
          harga terisi otomatis. Lihat proyeksi batas Auto Rejection Atas (ARA) dan Auto Rejection Bawah
          (ARB) selama 5 hari perdagangan pertama, beserta estimasi profit/loss-nya.
        </p>
      </header>

      <AraCalculator stocks={stocks} />

      <section className="space-y-2 rounded-xl border border-ink-line bg-ink-soft p-4 text-sm">
        <h2 className="font-semibold">Aturan ARA/ARB</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Harga ≤ Rp200: batas ARA 35%.</li>
          <li>Rp200 &lt; harga ≤ Rp5.000: batas ARA 25%.</li>
          <li>Harga &gt; Rp5.000: batas ARA 20%.</li>
          <li>ARB (batas bawah) berlaku flat 15% untuk semua rentang harga.</li>
          <li>Batas hari pertama perdagangan (hari-1) memakai persentase normal di atas — terverifikasi dari data hari-1 IPO riil (mis. COIN +35%, EMAS +25% terkunci ARA).</li>
        </ul>
        <p className="text-mute">
          Sumber: Peraturan BEI Nomor II-A tentang Perdagangan Efek Bersifat Ekuitas.
        </p>
        <p className="text-mute">
          Perhitungan mengikuti ketentuan auto rejection BEI yang berlaku; selalu cek pengumuman bursa terbaru.
        </p>
      </section>
    </main>
  );
}
