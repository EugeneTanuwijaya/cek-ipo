from fastapi import FastAPI
from app.db import init_db

app = FastAPI(title="Saham IPO API")
init_db()

@app.get("/api/health")
def health():
    return {"status": "ok", "last_scrapes": {}}
