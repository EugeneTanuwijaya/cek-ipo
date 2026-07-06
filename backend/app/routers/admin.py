from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session
from app.config import settings
from app.db import SessionLocal, get_db
from app.models import ScrapeRun

router = APIRouter(prefix="/api", tags=["admin"])
bearer = HTTPBearer(auto_error=False)

def run_full_scrape():
    from app.scraper.eipo import sync_ipos
    from app.scraper.prices import sync_prices
    with SessionLocal() as db:
        sync_ipos(db)
        sync_prices(db)

@router.post("/admin/scrape", status_code=202)
def trigger_scrape(tasks: BackgroundTasks, cred: HTTPAuthorizationCredentials | None = Depends(bearer)):
    if not cred or cred.credentials != settings.admin_token:
        raise HTTPException(401, "Token tidak valid")
    tasks.add_task(run_full_scrape)
    return {"status": "scheduled"}

@router.get("/health")
def health(db: Session = Depends(get_db)):
    last = {}
    for kind in ("eipo", "prices"):
        run = (db.query(ScrapeRun).filter(ScrapeRun.kind == kind, ScrapeRun.status.in_(["success", "partial"]))
               .order_by(ScrapeRun.finished_at.desc()).first())
        last[kind] = run.finished_at.isoformat() if run and run.finished_at else None
    return {"status": "ok", "last_scrapes": last}
