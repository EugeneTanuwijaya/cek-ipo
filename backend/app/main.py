from fastapi import FastAPI

app = FastAPI(title="Saham IPO API")

@app.get("/api/health")
def health():
    return {"status": "ok", "last_scrapes": {}}
