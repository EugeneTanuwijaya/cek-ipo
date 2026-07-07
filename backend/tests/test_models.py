from datetime import date
from app.models import Ipo, Underwriter, IpoPerformance, ScrapeRun

def make_ipo(**kw):
    d = dict(eipo_id=347, ticker="SUPA", company_name="PT Super Bank Indonesia Tbk",
             final_price=350, shares_offered=1_000_000_000, status="listed",
             listing_date=date(2026, 6, 1))
    d.update(kw)
    return Ipo(**d)

def test_ipo_roundtrip_and_derived(session):
    ipo = make_ipo()
    session.add(ipo); session.commit()
    got = session.query(Ipo).filter_by(eipo_id=347).one()
    assert got.lots_offered == 10_000_000
    assert got.ipo_value == 350 * 1_000_000_000
    assert got.effective_price == 350

def test_effective_price_fallback_midpoint(session):
    ipo = make_ipo(eipo_id=1, final_price=None, price_low=100, price_high=200)
    session.add(ipo); session.commit()
    assert ipo.effective_price == 150

def test_underwriter_relationship(session):
    uw = Underwriter(code="CC", name="Mandiri Sekuritas")
    ipo = make_ipo(); ipo.underwriters.append(uw)
    session.add(ipo); session.commit()
    assert session.query(Underwriter).one().ipos[0].ticker == "SUPA"

def test_performance_one_to_one(session):
    ipo = make_ipo()
    ipo.performance = IpoPerformance(day1_open=420, day1_high=490, day1_low=400,
                                     day1_close=490, day1_return_pct=40.0, day1_ara=True)
    session.add(ipo); session.commit()
    assert session.query(Ipo).one().performance.day1_ara is True

def test_scrape_run(session):
    session.add(ScrapeRun(kind="eipo", status="success", items_processed=3)); session.commit()
    assert session.query(ScrapeRun).one().kind == "eipo"
