from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models import Ipo, ScrapeRun, Underwriter, ipo_underwriters
from app.scraper.http import BASE, fetch
from app.scraper.parsers import parse_detail, parse_index

INDEX_URL = f"{BASE}/id/ipo/index"


def upsert_detail(db: Session, eipo_id: int, data: dict, source_url: str | None = None) -> Ipo:
    ipo = db.query(Ipo).filter_by(eipo_id=eipo_id).one_or_none() or Ipo(eipo_id=eipo_id)
    db.add(ipo)  # attach before touching relationships, else autoflush errors on a transient object
    uws = data.pop("underwriters", []) or []
    for k, v in data.items():
        if v is not None:
            setattr(ipo, k, v)
    if source_url:
        ipo.source_url = source_url
    ipo.scraped_at = datetime.now(timezone.utc)
    for u in uws:
        uw = db.query(Underwriter).filter_by(code=u["code"]).one_or_none()
        if uw is None:
            uw = Underwriter(code=u["code"], name=u["name"])
            db.add(uw)
            # SessionLocal runs with autoflush=False: flush now so the next
            # lookup of the same code (later IPO, same run) sees this row
            # instead of inserting a UNIQUE-violating duplicate.
            db.flush()
        if uw not in ipo.underwriters:
            ipo.underwriters.append(uw)
        # The plain relationship append inserts the association row with the
        # column default is_lead=False; persist the parsed flag explicitly.
        db.flush()  # ensure ipo.id/uw.id and the association row exist
        db.execute(
            ipo_underwriters.update()
            .where(
                ipo_underwriters.c.ipo_id == ipo.id,
                ipo_underwriters.c.underwriter_id == uw.id,
            )
            .values(is_lead=bool(u.get("is_lead", False)))
        )
    return ipo


def sync_ipos(db: Session, fetch_fn=fetch) -> ScrapeRun:
    run = ScrapeRun(kind="eipo")
    db.add(run)
    db.commit()
    warnings = []
    try:
        entries = parse_index(fetch_fn(INDEX_URL))
        listed = {i.eipo_id for i in db.query(Ipo).filter(Ipo.status == "listed")}
        todo = [e for e in entries if e.eipo_id not in listed]
        for e in todo:
            try:
                upsert_detail(db, e.eipo_id, parse_detail(fetch_fn(e.url)), source_url=e.url)
                run.items_processed += 1
                db.commit()  # persist this item; keeps earlier items safe from a later bad one
            except Exception as ex:  # per-item: warning, lanjut
                # A DB-level failure leaves the transaction unusable; roll it
                # back so it does not poison later items or the final commit.
                db.rollback()
                warnings.append(f"{e.eipo_id}: {ex}")
        run.status = "partial" if warnings else "success"
        run.message = "; ".join(warnings) or None
    except Exception as ex:  # run-level: gagal total, data lama utuh
        # A DB-level failure here (e.g. inside parse_index/fetch_fn after a
        # partial flush) leaves the session's transaction unusable; roll it
        # back so the final db.commit() below doesn't itself raise and leave
        # this ScrapeRun stuck at status "running" (silently stale /api/health).
        db.rollback()
        run.status = "failed"
        run.message = str(ex)
    run.finished_at = datetime.now(timezone.utc)
    db.commit()
    return run
