from datetime import date
from app.models import Ipo, IpoPerformance
from app.scraper.prices import sync_prices

YAHOO_OK = {"chart": {"result": [{"timestamp": [1750000000, 1750086400],
    "indicators": {"quote": [{"open": [420.0, 480.0], "high": [490.0, 500.0],
                              "low": [400.0, 470.0], "close": [490.0, 495.0]}]}}], "error": None}}

def make_listed(session, **kw):
    d = dict(eipo_id=347, ticker="SUPA", final_price=350, status="listed",
             shares_offered=1_000_000_000, listing_date=date(2026, 6, 1))
    d.update(kw)
    ipo = Ipo(**d); session.add(ipo); session.commit()
    return ipo

def test_sync_prices_fills_day1(session):
    ipo = make_listed(session)
    run = sync_prices(session, http_get=lambda url: YAHOO_OK)
    perf = session.query(IpoPerformance).filter_by(ipo_id=ipo.id).one()
    assert perf.day1_close == 490.0
    assert perf.day1_ara is False           # ARA hari-1 utk 350 = 525
    assert round(perf.day1_return_pct, 1) == 40.0
    assert run.status == "success"

def test_ticker_not_yet_on_yahoo_is_skipped(session):
    make_listed(session)
    def not_found(url): raise RuntimeError("404")
    run = sync_prices(session, http_get=not_found)
    assert session.query(IpoPerformance).count() == 0
    assert run.status == "partial"          # dicoba lagi run berikutnya

def test_already_fetched_not_repeated(session):
    ipo = make_listed(session)
    sync_prices(session, http_get=lambda url: YAHOO_OK)
    calls = []
    def counting(url): calls.append(url); return YAHOO_OK
    sync_prices(session, http_get=counting)
    assert calls == []
