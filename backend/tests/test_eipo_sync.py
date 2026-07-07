from pathlib import Path

from sqlalchemy import select

from app.models import Ipo, ScrapeRun, Underwriter, ipo_underwriters
from app.scraper.eipo import sync_ipos, upsert_detail

FIX = Path(__file__).parent / "fixtures"


def fake_fetch(url: str) -> str:
    if "/ipo/index" in url:
        return (FIX / "index.html").read_text(encoding="utf-8")
    return (FIX / "detail_347.html").read_text(encoding="utf-8")


def test_sync_creates_ipos_and_logs_run(session):
    run = sync_ipos(session, fetch_fn=fake_fetch)
    assert run.status == "success"
    assert session.query(Ipo).count() >= 10
    supa = session.query(Ipo).filter_by(eipo_id=347).one()
    assert supa.ticker == "SUPA"
    assert supa.source_url.startswith("https://e-ipo.co.id/")
    # fake_fetch returns SUPA's detail HTML for every detail URL, so every
    # row's ticker is "SUPA" -- but upsert is keyed by eipo_id from the
    # index, so rows must still be distinct per index entry.
    ipo_ids = [i.eipo_id for i in session.query(Ipo)]
    assert len(set(ipo_ids)) == len(ipo_ids)


def test_sync_is_idempotent(session):
    sync_ipos(session, fetch_fn=fake_fetch)
    n = session.query(Ipo).count()
    sync_ipos(session, fetch_fn=fake_fetch)
    assert session.query(Ipo).count() == n            # upsert, bukan duplikat
    assert session.query(Underwriter).count() == len({u.code for u in session.query(Underwriter)})


def test_listed_ipo_not_rescraped(session):
    sync_ipos(session, fetch_fn=fake_fetch)
    session.query(Ipo).update({"status": "listed"}); session.commit()
    calls = []
    def counting_fetch(url):
        calls.append(url); return fake_fetch(url)
    sync_ipos(session, fetch_fn=counting_fetch)
    assert all("/ipo/index" in u for u in calls)      # hanya indeks, tanpa detail


def test_shared_new_underwriter_across_ipos_one_run(session):
    # Regression: production SessionLocal uses autoflush=False, so a new
    # Underwriter created for one IPO must be visible (flushed) when the next
    # IPO in the same run looks up the same code -- otherwise the final
    # commit dies with UNIQUE(underwriters.code).
    uw = {"code": "ZZ", "name": "Zeta Sekuritas", "is_lead": False}
    upsert_detail(session, 9001, {"underwriters": [dict(uw)]})
    upsert_detail(session, 9002, {"underwriters": [dict(uw)]})
    session.commit()
    assert session.query(Underwriter).filter_by(code="ZZ").count() == 1
    assert session.query(Ipo).count() == 2


def test_is_lead_persisted(session):
    sync_ipos(session, fetch_fn=fake_fetch)
    supa = session.query(Ipo).filter_by(eipo_id=347).one()
    rows = dict(session.execute(
        select(ipo_underwriters.c.underwriter_id, ipo_underwriters.c.is_lead)
        .where(ipo_underwriters.c.ipo_id == supa.id)
    ).all())
    cc = session.query(Underwriter).filter_by(code="CC").one()   # Partisipan Admin (lead)
    lg = session.query(Underwriter).filter_by(code="LG").one()   # plain participant
    assert rows[cc.id] is True
    assert rows[lg.id] is False


def test_failed_fetch_logged_data_kept(session):
    sync_ipos(session, fetch_fn=fake_fetch)
    n = session.query(Ipo).count()
    def boom(url): raise RuntimeError("down")
    run = sync_ipos(session, fetch_fn=boom)
    assert run.status == "failed" and "down" in run.message
    assert session.query(Ipo).count() == n            # data lama utuh


def test_run_level_failure_rolls_back_before_final_commit(session, monkeypatch):
    # Regression: a DB-level failure at the run level (e.g. inside
    # parse_index/fetch_fn, before the per-item loop even starts) must not
    # leave the session's transaction poisoned, or the final db.commit() at
    # the end of sync_ipos would itself raise -- leaving the ScrapeRun row
    # stuck at status "running" forever (silently stale /api/health).
    #
    # A fully faithful reproduction would need a fetch_fn that corrupts the
    # SQLAlchemy transaction mid-flight (e.g. issuing an invalid raw SQL
    # statement on the same session) and then raises, so the exception
    # reaches sync_ipos' run-level `except` with a truly broken transaction.
    # That is fiddly to make deterministic across SQLAlchemy/SQLite
    # versions, so instead we take the acceptable alternative suggested in
    # review: spy on `db.rollback` and assert the run-level except path
    # actually calls it when fetch_fn raises before any per-item processing
    # happens (so this call can only come from the run-level except, not
    # the per-item one).
    calls = []
    orig_rollback = session.rollback
    def spy_rollback():
        calls.append(True)
        orig_rollback()
    monkeypatch.setattr(session, "rollback", spy_rollback)

    def boom(url):
        raise RuntimeError("down")

    run = sync_ipos(session, fetch_fn=boom)

    assert run.status == "failed"
    assert calls, "expected db.rollback() to be called from the run-level except"
