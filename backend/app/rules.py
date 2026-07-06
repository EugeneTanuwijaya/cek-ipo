# Peraturan BEI II-A per Juli 2026 — verifikasi ulang di Task 12 (sumber sama dengan frontend/lib/rules.ts)
DAY1_MULTIPLIER = 2

def ara_pct(price: float) -> float:
    if price <= 200:
        return 0.35
    if price <= 5000:
        return 0.25
    return 0.20

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
