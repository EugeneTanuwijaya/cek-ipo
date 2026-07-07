from datetime import date
from sqlalchemy.orm import Session as SASession
from app.models import Ipo, IpoPerformance
from app.scraper.prices import sync_prices

# Timestamps = 2026-06-01 & 2026-06-02 02:00 UTC (09:00 WIB, jam buka IDX)
# agar bar pertama cocok dengan listing_date make_listed (2026-06-01).
# Close 436 = tepat harga ARA hari-1 utk IPO 350 (350*1.25=437.5 -> fraksi 2
# -> 436) sehingga lolos validasi bound dan day1_ara True.
YAHOO_OK = {"chart": {"result": [{"timestamp": [1780279200, 1780365600],
    "indicators": {"quote": [{"open": [400.0, 480.0], "high": [436.0, 500.0],
                              "low": [390.0, 470.0], "close": [436.0, 495.0]}]}}], "error": None}}

# Bar pertama 2026-09-01 — lebih dari MAX_LISTING_GAP_DAYS setelah listing
# 2026-06-01 (kasus nyata: data Yahoo tidak mencakup hari-1 listing).
YAHOO_WRONG_WINDOW = {"chart": {"result": [{"timestamp": [1788228000],
    "indicators": {"quote": [{"open": [5000.0], "high": [5250.0],
                              "low": [4900.0], "close": [5250.0]}]}}], "error": None}}

# Tanggal benar (2026-06-01) tapi harga jauh di bawah floor ARB hari-1 utk
# IPO 350 — pola data split-adjusted Yahoo (kasus riil: CUAN 220 -> 27.4).
YAHOO_SPLIT_ADJUSTED = {"chart": {"result": [{"timestamp": [1780279200],
    "indicators": {"quote": [{"open": [27.4], "high": [42.6],
                              "low": [27.4], "close": [42.6]}]}}], "error": None}}

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
    assert perf.day1_close == 436.0
    assert perf.day1_ara is True            # ARA hari-1 utk 350 = 436 (1x, 25%)
    assert round(perf.day1_return_pct, 1) == 24.6
    assert run.status == "success"

def test_first_bar_far_from_listing_date_is_a_miss(session):
    # Regresi untuk bug backfill: bar pertama yang bukan hari-1 listing
    # (selisih > MAX_LISTING_GAP_DAYS) tidak boleh disimpan sebagai data
    # hari-1 -- itu harga berbulan-bulan kemudian, return/ARA-nya korup.
    make_listed(session)
    run = sync_prices(session, http_get=lambda url: YAHOO_WRONG_WINDOW)
    assert session.query(IpoPerformance).count() == 0
    assert run.status == "partial"
    assert "SUPA" in run.message


def test_split_adjusted_prices_are_a_miss(session):
    # Yahoo meng-adjust harga historis untuk stock split (kasus riil CUAN:
    # IPO 220, "close hari-1" 42.6). Close di luar bound ARB..ARA hari-1
    # secara fisik mustahil -> data tidak valid, jangan disimpan.
    make_listed(session)
    run = sync_prices(session, http_get=lambda url: YAHOO_SPLIT_ADJUSTED)
    assert session.query(IpoPerformance).count() == 0
    assert run.status == "partial"
    assert "SUPA" in run.message


def test_listed_without_listing_date_not_queried(session):
    # Tanpa listing_date jendela period1/period2 tidak bisa dibangun --
    # baris ini dilewati sama sekali (bukan miss, bukan error).
    make_listed(session, listing_date=None)
    calls = []
    def counting(url): calls.append(url); return YAHOO_OK
    run = sync_prices(session, http_get=counting)
    assert calls == []
    assert session.query(IpoPerformance).count() == 0
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
        assert perf1.day1_close == 436.0
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
    assert perf1.day1_close == 436.0                # item 1 committed, not lost
    assert run.status == "partial"
    assert "DUPL" in run.message
