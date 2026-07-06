// Aturan BEI per Juli 2026 — Peraturan II-A; ARB 15% seragam sejak 8 Apr 2025.
// Diverifikasi ulang terhadap teks resmi pada Task 12. Ubah di sini bila BEI merevisi.
export const AUTO_REJECT = {
  day1Multiplier: 2,
  minPrice: 50,
  araBands: [
    { maxPrice: 200, pct: 0.35 },
    { maxPrice: 5000, pct: 0.25 },
    { maxPrice: Infinity, pct: 0.2 },
  ],
  arbFlatPct: 0.15,
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
