import { PENJATAHAN as P } from './rules';

export type Golongan = 1 | 2 | 3 | 4 | 5;

/** Golongan Penawaran Umum berdasarkan nilai keseluruhan Efek (SEOJK 25/2025 Romawi VI). */
export function golonganFor(ipoValue: number): Golongan {
  const idx = P.golongan.findIndex(g => ipoValue <= g.maxValue);
  // findIndex hanya bisa -1 bila ipoValue NaN (golongan terakhir maxValue=Infinity
  // menangkap semua angka lain). Amankan ke golongan 5 (terbesar) agar tidak crash.
  return (idx === -1 ? 5 : idx + 1) as Golongan;
}

/**
 * Alokasi Efek untuk Penjatahan Terpusat dalam Rupiah, sudah termasuk
 * penyesuaian akibat oversubscription bila `oversub` diberikan
 * (SEOJK 25/2025 Romawi VII & VIII). Hasil = maks(pct × nilai Efek, floor).
 */
export function poolingAllocation(ipoValue: number, oversub?: number): number {
  const idx = golonganFor(ipoValue) - 1;
  let pct: number = P.golongan[idx].basePct;
  if (oversub !== undefined) {
    for (let t = P.oversubThresholds.length - 1; t >= 0; t--) {
      if (oversub >= P.oversubThresholds[t]) { pct = P.oversubTiers[idx][t]; break; }
    }
  }
  return Math.max(pct * ipoValue, P.golongan[idx].floorRp);
}

export interface AllotmentInput {
  orderLots: number;
  price: number;
  ipoValue: number;
  oversub: number;
}

export interface AllotmentResult {
  estimatedLots: number;
  fillPct: number;
  effectiveValue: number;
  isRetail: boolean;
}

/**
 * Estimasi jumlah lot yang kemungkinan didapat dari Penjatahan Terpusat,
 * berdasarkan rasio oversubscription. Ini adalah ESTIMASI KONSERVATIF, bukan
 * jaminan: pecahan lot dibulatkan ke bawah (floor), meniru pembulatan ke bawah
 * pada penjatahan proporsional per SEOJK 25/2025 Romawi VII angka 7; penjatahan
 * aktual juga bergantung pada urutan waktu pemesanan.
 */
export function estimateAllotment(i: AllotmentInput): AllotmentResult | { error: string } {
  if (!Number.isInteger(i.orderLots) || i.orderLots <= 0)
    return { error: 'Jumlah lot harus bilangan bulat positif.' };
  if (!Number.isFinite(i.price) || i.price <= 0)
    return { error: 'Harga harus lebih dari 0.' };
  if (!Number.isFinite(i.ipoValue) || i.ipoValue <= 0)
    return { error: 'Nilai penawaran tidak valid.' };
  if (!Number.isFinite(i.oversub) || i.oversub <= 0)
    return { error: 'Rasio oversubscription harus lebih dari 0.' };
  const orderValue = i.orderLots * 100 * i.price;
  if (orderValue > P.maxOrderPctOfOffering * i.ipoValue)
    return { error: 'Pesanan melebihi batas 10% dari nilai penawaran (SEOJK 25/2025).' };
  const isRetail = orderValue <= P.retailMaxOrderRp;
  const estimatedLots = Math.min(i.orderLots, Math.max(1, Math.floor(i.orderLots / i.oversub)));
  return {
    estimatedLots,
    fillPct: (estimatedLots / i.orderLots) * 100,
    effectiveValue: estimatedLots * 100 * i.price,
    isRetail,
  };
}
