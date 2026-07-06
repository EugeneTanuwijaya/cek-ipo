# Peraturan Nomor II-A tentang Perdagangan Efek Bersifat Ekuitas, SK Direksi
# BEI Kep-00003/BEI/04-2025 (berlaku sejak 8 Apr 2025, menggantikan
# Kep-00055/BEI/03-2023). Diverifikasi ulang di Task 12 (2026-07-07) — sumber
# dan detail lengkap sama dengan frontend/lib/rules.ts (lihat komentar di
# sana): ara_pct 35/25/20 tidak berubah oleh revisi 2025 (primer: teks PDF
# Kep-00055/BEI/03-2023 dibaca via pypdf); DAY1_MULTIPLIER=2 berlaku untuk
# ARA dan ARB pada hari pertama IPO menurut sumber sekunder pasca-Apr-2025
# konsisten (Kompas, CNBC Indonesia, mediaperbankan.com) — PDF resmi 2025
# tidak berhasil diunduh langsung (diblokir 403), lihat catatan di rules.ts.
DAY1_MULTIPLIER = 2

def ara_pct(price: float) -> float:
    if price <= 200:
        return 0.35
    if price <= 5000:
        return 0.25
    return 0.20

# Fraksi harga (VI.5.2.1-VI.5.2.5, tidak diubah oleh revisi 8 Apr 2025):
# <200->1; 200-<500->2; 500-<2000->5; 2000-<5000->10; >=5000->25.
def tick_for(price: float) -> int:
    if price < 200: return 1
    if price < 500: return 2
    if price < 2000: return 5
    if price < 5000: return 10
    return 25

def round_down_to_tick(price: float) -> int:
    t = tick_for(price)
    return int(price // t * t)

def day1_ara_price(ipo_price: int) -> int:
    raw = ipo_price * (1 + ara_pct(ipo_price) * DAY1_MULTIPLIER)
    return round_down_to_tick(raw)

def hit_ara_day1(ipo_price: int, day1_close: float) -> bool:
    return day1_close >= day1_ara_price(ipo_price)
