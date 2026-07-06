// Aturan BEI per Juli 2026 — Peraturan Nomor II-A tentang Perdagangan Efek
// Bersifat Ekuitas, SK Direksi BEI Kep-00003/BEI/04-2025 (berlaku sejak 8 Apr
// 2025, menggantikan Kep-00055/BEI/03-2023). Diverifikasi ulang pada Task 12
// (2026-07-07):
// - araBands 35/25/20 (VI.7.1.2.1-3 pada teks 2023): TIDAK berubah oleh
//   revisi 8 Apr 2025 — revisi itu hanya menyeragamkan ARB. Primer: teks PDF
//   Kep-00055/BEI/03-2023 (idx.co.id) dibaca langsung (pypdf); dikonfirmasi
//   masih berlaku oleh siaran pers BEI & liputan media (Kompas 14 Apr 2025,
//   Kontan) yang hanya menyebut ARB yang diubah.
// - arbFlatPct 15% seragam semua rentang: berlaku sejak 8 Apr 2025 (sebelumnya
//   mengikuti tier ARA 35/25/20). Sumber: idx.co.id/id/berita/siaran-pers/2352
//   (siaran pers BEI) + Kontan/Kompas/CNBC Indonesia (8 Apr 2025). Tidak ada
//   perubahan lebih lanjut ditemukan sampai Juli 2026 (satu-satunya berita
//   terbaru, suara.com 5 Jul 2026, adalah USULAN yang HANYA menyasar Papan
//   Pemantauan Khusus, belum berlaku, dan tidak memengaruhi konstanta ini).
// - day1Multiplier 2x berlaku untuk ARA **dan** ARB pada hari pertama IPO:
//   dikonfirmasi oleh sumber sekunder pasca-8-Apr-2025 (Kompas 14 Apr 2025,
//   mediaperbankan.com Mei 2025, CNBC Indonesia) yang konsisten menyebut
//   "2 (dua) kali dari persentase batasan Auto Rejection" tanpa membedakan
//   ARA/ARB. CATATAN: teks resmi Kep-00055/BEI/03-2023 (berlaku sebelum revisi
//   8 Apr 2025) sebenarnya menetapkan 1x (diturunkan dari 2x sejak 13 Mar
//   2020); PDF resmi Kep-00003/BEI/04-2025 tidak berhasil diunduh langsung
//   (wplibrary.co.id & idx.co.id memblokir akses otomatis dgn 403) sehingga
//   nilai 2x saat ini bersandar pada sumber sekunder yang konsisten, bukan
//   teks primer — perlu diverifikasi ulang bila ada keraguan.
export const AUTO_REJECT = {
  day1Multiplier: 2,
  minPrice: 50,
  araBands: [
    { maxPrice: 200, pct: 0.35 },
    { maxPrice: 5000, pct: 0.25 },
    { maxPrice: Infinity, pct: 0.2 },
  ],
  arbFlatPct: 0.15,
  // Fraksi harga (VI.5.2.1-VI.5.2.5, Kep-00055/BEI/03-2023, tidak diubah oleh
  // revisi 8 Apr 2025): <200→1; 200–<500→2; 500–<2000→5; 2000–<5000→10;
  // ≥5000→25. Primer: teks PDF dibaca langsung (pypdf) pada Task 12.
  ticks: [
    { belowPrice: 200, tick: 1 },
    { belowPrice: 500, tick: 2 },
    { belowPrice: 2000, tick: 5 },
    { belowPrice: 5000, tick: 10 },
    { belowPrice: Infinity, tick: 25 },
  ],
} as const;

// SEOJK 25/SEOJK.04/2025 (ditetapkan & berlaku 17 Nov 2025), tentang Verifikasi
// Pesanan dan Dana, Alokasi Penjatahan, dan Penyelesaian Pemesanan Efek dalam
// Penawaran Umum Saham Secara Elektronik — menggantikan SEOJK 15/SEOJK.04/2020.
// Seluruh angka di bawah DIVERIFIKASI LANGSUNG dari salinan resmi PDF di
// ojk.go.id (Romawi VI Penggolongan Penawaran Umum, Romawi VII Alokasi Efek
// untuk Penjatahan Terpusat — tabel angka 4, dan Romawi VIII Penyesuaian
// Alokasi untuk Penjatahan Terpusat — tabel angka 2) pada Task 11 (2026-07-06).
// Tidak ada nilai fallback/PERLU VERIFIKASI — lampiran resmi berhasil diunduh
// dan tabel lengkap 5 golongan terbaca utuh.
export const PENJATAHAN = {
  // Romawi I angka 9: Pemesan Ritel = nilai pesanan ≤ Rp100.000.000.
  retailMaxOrderRp: 100_000_000,
  // Romawi VII angka 5: alokasi Penjatahan Terpusat Ritel : selain ritel = 1:1.
  retailShareOfPooling: 0.5,
  // Romawi IV angka 2 huruf b: pesanan per calon pemodal maks 10% nilai Efek
  // yang ditawarkan (kumulatif); lebih dari itu pesanan tidak diproses (huruf c).
  maxOrderPctOfOffering: 0.1,
  // Romawi VI angka 2 (batas golongan) + Romawi VII angka 1 & tabel angka 4
  // (alokasi minimum = maks(basePct × nilai Efek, floorRp)).
  golongan: [
    { maxValue: 100e9, basePct: 0.20, floorRp: 10e9 },    // golongan I:  IPO ≤ Rp100 M
    { maxValue: 250e9, basePct: 0.15, floorRp: 20e9 },    // golongan II: Rp100 M < IPO ≤ Rp250 M
    { maxValue: 500e9, basePct: 0.10, floorRp: 37.5e9 },  // golongan III: Rp250 M < IPO ≤ Rp500 M
    { maxValue: 1e12, basePct: 0.075, floorRp: 50e9 },    // golongan IV: Rp500 M < IPO ≤ Rp1 T
    { maxValue: Infinity, basePct: 0.025, floorRp: 75e9 },// golongan V:  IPO > Rp1 T
  ],
  // Romawi VIII angka 2 (tabel penyesuaian): pct minimum baru per ambang
  // oversubscription [2,5x–<10x, 10x–<25x, ≥25x], indeks 0 = golongan I.
  oversubTiers: [
    [0.225, 0.25, 0.30],   // golongan I
    [0.175, 0.20, 0.25],   // golongan II
    [0.125, 0.15, 0.20],   // golongan III
    [0.10, 0.125, 0.175],  // golongan IV
    [0.05, 0.075, 0.125],  // golongan V
  ],
  oversubThresholds: [2.5, 10, 25],
} as const;
