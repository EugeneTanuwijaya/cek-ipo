import sys

from app.db import SessionLocal, init_db
from app.scraper.eipo import upsert_detail
from app.scraper.http import BASE, fetch
from app.scraper.parsers import parse_detail, parse_index


def main(max_pages: int = 30):
    init_db()
    with SessionLocal() as db:
        for page in range(1, max_pages + 1):
            try:
                entries = parse_index(fetch(f"{BASE}/id/ipo/index?page={page}&per-page=12"))
            except Exception as ex:
                print("skip page", page, ex)
                continue
            if not entries:
                break
            for e in entries:
                try:
                    upsert_detail(db, e.eipo_id, parse_detail(fetch(e.url)), source_url=e.url)
                    db.commit()
                    print("ok", e.eipo_id, e.ticker)
                except Exception as ex:
                    db.rollback()  # a failed item must not poison later commits
                    print("skip", e.eipo_id, ex)


if __name__ == "__main__":
    main(int(sys.argv[1]) if len(sys.argv) > 1 else 30)
