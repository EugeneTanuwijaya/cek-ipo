from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from app.db import SessionLocal


def _job_eipo():
    from app.scraper.eipo import sync_ipos
    with SessionLocal() as db:
        sync_ipos(db)


def _job_prices():
    from app.scraper.prices import sync_prices
    with SessionLocal() as db:
        sync_prices(db)


def build_scheduler() -> BackgroundScheduler:
    s = BackgroundScheduler(timezone="Asia/Jakarta")
    s.add_job(_job_eipo, CronTrigger(hour=6, minute=0), id="eipo_daily")
    s.add_job(_job_prices, CronTrigger(hour=18, minute=0), id="prices_daily")
    return s
