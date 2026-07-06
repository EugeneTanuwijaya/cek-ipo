from pathlib import Path

from app.models import Ipo, ScrapeRun, Underwriter
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


def test_failed_fetch_logged_data_kept(session):
    sync_ipos(session, fetch_fn=fake_fetch)
    n = session.query(Ipo).count()
    def boom(url): raise RuntimeError("down")
    run = sync_ipos(session, fetch_fn=boom)
    assert run.status == "failed" and "down" in run.message
    assert session.query(Ipo).count() == n            # data lama utuh
