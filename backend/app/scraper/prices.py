from datetime import date, datetime, time, timedelta, timezone
import requests
from sqlalchemy.orm import Session
from app.models import Ipo, IpoPerformance, ScrapeRun
from app.rules import day1_ara_price, hit_ara_day1
from app.scraper.http import UA

# Jendela eksplisit period1/period2 di sekitar listing_date, interval=1d.
# JANGAN pakai range=max: untuk ticker berhistori panjang Yahoo diam-diam
# menurunkan granularity ke 1wk (bar "hari-1" jadi bar seminggu penuh), dan
# range pendek (3mo) salah untuk backfill (bar pertama = harga ~3 bulan lalu).
CHART_URL = ("https://query1.finance.yahoo.com/v8/finance/chart/{t}.JK"
             "?interval=1d&period1={p1}&period2={p2}")

# Bar pertama harus jatuh pada listing_date..listing_date+2 hari; lebih dari
# itu data hari-1 tidak tersedia -> miss (dicoba lagi run berikutnya).
MAX_LISTING_GAP_DAYS = 2

# Batas bawah sanity untuk close hari-1: ARB hari-1 tidak pernah lebih dalam
# dari 15% sejak 2020 (era pandemi malah 7%); 0.83 memberi ruang pembulatan
# fraksi. Close di luar [floor, harga ARA] berarti data Yahoo sudah
# di-adjust aksi korporasi (mis. CUAN 220 -> 27.4 karena stock split) atau
# junk -> jangan disimpan.
DAY1_FLOOR_FACTOR = 0.83


def _epoch(d: date) -> int:
    return int(datetime.combine(d, time.min, tzinfo=timezone.utc).timestamp())


def _default_get(url: str) -> dict:
    r = requests.get(url, headers={"User-Agent": UA}, timeout=30)
    r.raise_for_status()
    return r.json()

def fetch_day1(ticker: str, listing_date: date, http_get=_default_get) -> dict | None:
    url = CHART_URL.format(t=ticker,
                           p1=_epoch(listing_date - timedelta(days=3)),
                           p2=_epoch(listing_date + timedelta(days=11)))
    data = http_get(url)
    result = (data.get("chart") or {}).get("result") or []
    if not result:
        return None
    q = result[0]["indicators"]["quote"][0]
    if not q.get("close"):
        return None
    i = next((n for n, c in enumerate(q["close"]) if c is not None), None)
    if i is None:
        return None
    ts = result[0].get("timestamp") or []
    bar_date = (datetime.fromtimestamp(ts[i], tz=timezone.utc).date()
                if i < len(ts) else None)
    return {"date": bar_date, "open": q["open"][i], "high": q["high"][i],
            "low": q["low"][i], "close": q["close"][i]}


def _day1_valid(ipo: Ipo, d1: dict) -> bool:
    if d1["date"] is None:
        return False
    delta = (d1["date"] - ipo.listing_date).days
    if delta < 0 or delta > MAX_LISTING_GAP_DAYS:
        return False
    # Close hari-1 secara fisik tidak bisa menembus harga ARA, dan tidak
    # pernah lebih rendah dari floor ARB historis. Di luar itu = data
    # ter-adjust (split) / salah -> miss, bukan data untuk disimpan.
    return (ipo.final_price * DAY1_FLOOR_FACTOR <= d1["close"]
            <= day1_ara_price(ipo.final_price))

def sync_prices(db: Session, http_get=_default_get) -> ScrapeRun:
    run = ScrapeRun(kind="prices")
    db.add(run); db.commit()
    misses = []
    pending = (db.query(Ipo)
               .filter(Ipo.status == "listed", Ipo.final_price.isnot(None),
                       Ipo.ticker.isnot(None), Ipo.listing_date.isnot(None))
               .filter(~Ipo.id.in_(db.query(IpoPerformance.ipo_id))).all())
    for ipo in pending:
        try:
            d1 = fetch_day1(ipo.ticker, ipo.listing_date, http_get=http_get)
            if d1 is None or not _day1_valid(ipo, d1):
                misses.append(ipo.ticker); continue
            db.add(IpoPerformance(
                ipo_id=ipo.id, day1_open=d1["open"], day1_high=d1["high"],
                day1_low=d1["low"], day1_close=d1["close"],
                day1_return_pct=(d1["close"] / ipo.final_price - 1) * 100,
                day1_ara=hit_ara_day1(ipo.final_price, d1["close"])))
            run.items_processed += 1
            db.commit()  # persist this item; keeps earlier items safe from a later bad one
        except Exception:
            # A DB-level failure leaves the transaction unusable; roll it
            # back so it does not poison later items or the final commit.
            db.rollback()
            misses.append(ipo.ticker)
    run.status = "partial" if misses else "success"
    run.message = ("belum tersedia: " + ", ".join(misses)) if misses else None
    run.finished_at = datetime.now(timezone.utc)
    db.commit()
    return run
