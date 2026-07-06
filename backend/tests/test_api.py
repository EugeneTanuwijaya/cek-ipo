from datetime import date
import pytest
from fastapi.testclient import TestClient
from app.db import get_db
from app.main import app
from app.models import Ipo, IpoPerformance, Underwriter, ipo_underwriters

@pytest.fixture
def client(session):
    # NOTE: `lambda: iter([session])` (as suggested in the task brief) does not
    # work with the installed FastAPI version: dependency override resolution
    # checks `is_gen_callable` on the override callable itself, and a lambda is
    # never a generator function, so FastAPI would inject the raw iterator
    # object instead of calling next() on it. A generator function override is
    # required so FastAPI recognizes and drives it like the real get_db.
    def override_get_db():
        yield session
    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()

@pytest.fixture
def seed(session):
    uw = Underwriter(code="CC", name="Mandiri Sekuritas")
    a = Ipo(eipo_id=1, ticker="AAAA", company_name="PT A Tbk", status="listed",
            final_price=100, shares_offered=500_000_000, listing_date=date(2026, 5, 1))
    a.underwriters.append(uw)
    a.performance = IpoPerformance(day1_close=170, day1_return_pct=70.0, day1_ara=True)
    b = Ipo(eipo_id=2, ticker="BBBB", company_name="PT B Tbk", status="offering",
            price_low=200, price_high=300, shares_offered=100_000_000)
    b.underwriters.append(uw)
    session.add_all([a, b]); session.commit()
    # Mark CC as lead on AAAA via the association row directly (same pattern
    # as the scraper; relationship append leaves the column default False).
    session.execute(
        ipo_underwriters.update()
        .where(ipo_underwriters.c.ipo_id == a.id, ipo_underwriters.c.underwriter_id == uw.id)
        .values(is_lead=True))
    session.commit()

def test_list_and_filter(client, seed):
    assert client.get("/api/ipos").json()["total"] == 2
    items = client.get("/api/ipos?status=offering").json()["items"]
    assert [i["ticker"] for i in items] == ["BBBB"]
    assert client.get("/api/ipos?q=PT A").json()["total"] == 1

def test_detail(client, seed):
    d = client.get("/api/ipos/AAAA").json()
    assert d["lots_offered"] == 5_000_000
    assert d["day1_return_pct"] == 70.0
    assert d["underwriters"][0]["code"] == "CC"
    assert d["underwriters"][0]["is_lead"] is True
    assert d["performance"]["day1_ara"] is True
    assert client.get("/api/ipos/ZZZZ").status_code == 404

def test_underwriter_stats(client, seed):
    u = client.get("/api/underwriters").json()[0]
    assert u["total_ipos"] == 2
    assert u["ara_rate_pct"] == 100.0          # 1 dari 1 IPO ber-data
    assert u["avg_day1_return_pct"] == 70.0
    det = client.get("/api/underwriters/CC").json()
    assert {i["ticker"] for i in det["ipos"]} == {"AAAA", "BBBB"}

def test_admin_scrape_auth(client, seed, monkeypatch):
    import app.routers.admin as admin
    monkeypatch.setattr(admin, "run_full_scrape", lambda: None)
    assert client.post("/api/admin/scrape").status_code in (401, 403)
    ok = client.post("/api/admin/scrape", headers={"Authorization": "Bearer change-me"})
    assert ok.status_code == 202

def test_health(client):
    r = client.get("/api/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
    assert "last_scrapes" in body
