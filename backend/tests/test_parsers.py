from datetime import date
from pathlib import Path

from app.scraper.parsers import parse_detail, parse_index

FIX = Path(__file__).parent / "fixtures"


def test_parse_index_finds_entries():
    entries = parse_index((FIX / "index.html").read_text(encoding="utf-8"))
    assert len(entries) >= 10
    ids = {e.eipo_id for e in entries}
    assert 347 in ids
    supa = next(e for e in entries if e.eipo_id == 347)
    assert supa.url == "https://e-ipo.co.id/id/ipo/347/supa-pt-super-bank-indonesia-tbk"
    assert supa.ticker == "SUPA"
    assert supa.status_label == "Closed"
    # a non-closed entry should carry its own real label (fixture has "Offering" entries)
    offering_entry = next(e for e in entries if e.status_label == "Offering")
    assert offering_entry.eipo_id in {350, 351, 353, 354}


def test_parse_detail_supa():
    d = parse_detail((FIX / "detail_347.html").read_text(encoding="utf-8"))
    assert d["ticker"] == "SUPA"
    assert "Super Bank" in d["company_name"]
    assert d["sector"] == "Financials"
    # Real values read from backend/tests/fixtures/detail_347.html:
    assert d["price_low"] == 525
    assert d["price_high"] == 695
    assert d["final_price"] == 635
    assert d["shares_offered"] == 4_406_612_300
    assert d["percent_of_capital"] == 13.0
    assert d["bookbuilding_start"] == date(2025, 11, 25)
    assert d["bookbuilding_end"] == date(2025, 12, 1)
    assert d["offering_start"] == date(2025, 12, 10)
    assert d["offering_end"] == date(2025, 12, 15)
    assert d["allotment_date"] == date(2025, 12, 15)
    assert d["listing_date"] == date(2025, 12, 17)
    assert d["status"] == "listed"  # site label is "Closed" -> canonical "listed"
    assert d["pooling_pct"] is None  # not present in this fixture

    assert isinstance(d["underwriters"], list) and len(d["underwriters"]) == 6
    by_code = {u["code"]: u for u in d["underwriters"]}
    assert by_code["CC"]["name"] == "MANDIRI SEKURITAS"
    assert by_code["CC"]["is_lead"] is True
    assert by_code["LG"]["name"] == "TRIMEGAH SEKURITAS INDONESIA TBK."
    assert by_code["LG"]["is_lead"] is False
    assert {"CC", "LG", "BQ", "AZ", "DX", "KZ"} == set(by_code)


def test_parse_detail_missing_fields_are_none():
    d = parse_detail("<html><body>halaman kosong</body></html>")
    assert d["ticker"] is None and d["final_price"] is None
    assert d["underwriters"] == []
