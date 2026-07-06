from datetime import date
from sqlalchemy.orm import Session as SASession
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

def test_fetch_failure_on_one_item_keeps_others(session):
    # Item 1 succeeds, item 2's fetch raises. With per-item commit, item 1 is
    # already in the DB when item 2's failure triggers db.rollback(); if item 1
    # had merely been staged (batch commit), that rollback would discard it.
    # The fresh-session query proves the row is in the database, not just in
    # this session's identity map. (StaticPool shares the single in-memory
    # connection, so both sessions see the same DB; the check is meaningful
    # because sync_prices has already ended its transaction when we query.)
    ipo1 = make_listed(session)
    make_listed(session, eipo_id=348, ticker="GAGL")
    def flaky(url):
        if "GAGL" in url:
            raise RuntimeError("404")
        return YAHOO_OK
    run = sync_prices(session, http_get=flaky)
    with SASession(session.get_bind()) as fresh:
        perf1 = fresh.query(IpoPerformance).filter_by(ipo_id=ipo1.id).one()
        assert perf1.day1_close == 490.0
        assert fresh.query(IpoPerformance).count() == 1
    assert run.status == "partial"
    assert "GAGL" in run.message

def test_db_level_failure_isolated_per_item(session):
    # Sharp regression for per-item commit isolation: item 2's INSERT violates
    # the ipo_performance.ipo_id unique constraint *at commit time*. The
    # conflicting row is inserted from inside http_get — i.e. after the
    # pending query has already selected ipo2 — so sync_prices still tries the
    # duplicate insert. A single batch commit after the loop would raise
    # IntegrityError uncaught and lose the other item's row too; per-item
    # commit + rollback confines the damage to ipo2.
    ipo1 = make_listed(session)
    ipo2 = make_listed(session, eipo_id=348, ticker="DUPL")
    def http_get(url):
        if "DUPL" in url:
            session.add(IpoPerformance(ipo_id=ipo2.id, day1_close=1.0))
            session.commit()
        return YAHOO_OK
    run = sync_prices(session, http_get=http_get)   # must not raise
    perf1 = session.query(IpoPerformance).filter_by(ipo_id=ipo1.id).one()
    assert perf1.day1_close == 490.0                # item 1 committed, not lost
    assert run.status == "partial"
    assert "DUPL" in run.message
