from fastapi import FastAPI
from app.db import init_db
from app.routers import admin, ipos, underwriters

init_db()
app = FastAPI(title="Saham IPO API")
app.include_router(ipos.router)
app.include_router(underwriters.router)
app.include_router(admin.router)
