from datetime import datetime, timezone
import requests
from sqlalchemy.orm import Session
from app.models import Ipo, IpoPerformance, ScrapeRun
from app.rules import hit_ara_day1
from app.scraper.http import UA

CHART_URL = "https://query1.finance.yahoo.com/v8/finance/chart/{t}.JK?interval=1d&range=3mo"

def _default_get(url: str) -> dict:
    r = requests.get(url, headers={"User-Agent": UA}, timeout=30)
    r.raise_for_status()
    return r.json()

def fetch_day1(ticker: str, http_get=_default_get) -> dict | None:
    data = http_get(CHART_URL.format(t=ticker))
    result = (data.get("chart") or {}).get("result") or []
    if not result:
        return None
    q = result[0]["indicators"]["quote"][0]
    if not q.get("close"):
        return None
    i = next((n for n, c in enumerate(q["close"]) if c is not None), None)
    if i is None:
        return None
    return {"open": q["open"][i], "high": q["high"][i], "low": q["low"][i], "close": q["close"][i]}

def sync_prices(db: Session, http_get=_default_get) -> ScrapeRun:
    run = ScrapeRun(kind="prices")
    db.add(run); db.commit()
    misses = []
    pending = (db.query(Ipo)
               .filter(Ipo.status == "listed", Ipo.final_price.isnot(None), Ipo.ticker.isnot(None))
               .filter(~Ipo.id.in_(db.query(IpoPerformance.ipo_id))).all())
    for ipo in pending:
        try:
            d1 = fetch_day1(ipo.ticker, http_get=http_get)
            if d1 is None:
                misses.append(ipo.ticker); continue
            db.add(IpoPerformance(
                ipo_id=ipo.id, day1_open=d1["open"], day1_high=d1["high"],
                day1_low=d1["low"], day1_close=d1["close"],
                day1_return_pct=(d1["close"] / ipo.final_price - 1) * 100,
                day1_ara=hit_ara_day1(ipo.final_price, d1["close"])))
            run.items_processed += 1
        except Exception:
            misses.append(ipo.ticker)
    run.status = "partial" if misses else "success"
    run.message = ("belum tersedia: " + ", ".join(misses)) if misses else None
    run.finished_at = datetime.now(timezone.utc)
    db.commit()
    return run
