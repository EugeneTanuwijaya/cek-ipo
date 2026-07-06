import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.db import init_db
from app.routers import admin, ipos, underwriters
from app.scheduler import build_scheduler

init_db()


@asynccontextmanager
async def lifespan(app: FastAPI):
    scheduler = None
    if not os.environ.get("DISABLE_SCHEDULER"):
        scheduler = build_scheduler()
        scheduler.start()
    yield
    if scheduler:
        scheduler.shutdown(wait=False)


app = FastAPI(title="Saham IPO API", lifespan=lifespan)
app.include_router(ipos.router)
app.include_router(underwriters.router)
app.include_router(admin.router)
