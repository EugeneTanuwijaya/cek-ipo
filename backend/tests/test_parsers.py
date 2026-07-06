from datetime import date
from pathlib import Path

import pytest

from app.scraper.parsers import _pct, parse_detail, parse_index

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

    assert d["logo_url"] == "https://e-ipo.co.id/id/pipeline/get-logo?id=347"
    assert d["prospectus_url"] == "https://e-ipo.co.id/id/pipeline/get-propectus-file?id=347&type="

    # Description: multiple real paragraphs joined with blank lines.
    desc = d["description"]
    assert desc is not None
    assert desc.startswith('PT Super Bank Indonesia Tbk ("Perseroan") adalah sebuah bank')
    assert "Pinjaman Atur Sendiri" in desc  # phrase from a later paragraph
    assert desc.count("\n\n") >= 2  # several paragraphs were joined

    assert isinstance(d["underwriters"], list) and len(d["underwriters"]) == 6
    by_code = {u["code"]: u for u in d["underwriters"]}
    assert by_code["CC"]["name"] == "MANDIRI SEKURITAS"
    assert by_code["CC"]["is_lead"] is True
    assert by_code["LG"]["name"] == "TRIMEGAH SEKURITAS INDONESIA TBK."
    assert by_code["LG"]["is_lead"] is False
    assert {"CC", "LG", "BQ", "AZ", "DX", "KZ"} == set(by_code)


def test_parse_detail_emmi_non_closed_status():
    # detail_351.html (EMMI) was captured while the IPO was in "Allotment"
    # state -- a non-Closed page, verifying the status mapping beyond
    # "Closed" -> "listed".
    d = parse_detail((FIX / "detail_351.html").read_text(encoding="utf-8"))
    assert d["ticker"] == "EMMI"
    assert "ESA MEDIKA MANDIRI" in d["company_name"].upper()
    assert d["sector"] == "Healthcare"
    assert d["status"] == "allotment"  # site label "Allotment"
    assert d["price_low"] == 446
    assert d["price_high"] == 515
    assert d["final_price"] == 470
    assert d["shares_offered"] == 522_857_000
    assert d["percent_of_capital"] == 30.0
    assert d["bookbuilding_start"] == date(2026, 6, 22)
    assert d["bookbuilding_end"] == date(2026, 6, 24)
    assert d["offering_start"] == date(2026, 7, 2)
    assert d["offering_end"] == date(2026, 7, 6)
    assert d["allotment_date"] == date(2026, 7, 6)
    assert d["listing_date"] == date(2026, 7, 8)
    assert d["logo_url"] == "https://e-ipo.co.id/id/pipeline/get-logo?id=351"
    assert d["prospectus_url"] == "https://e-ipo.co.id/id/pipeline/get-propectus-file?id=351&type="

    # This page also marks the lead via "Partisipan Admin" (no explicit
    # "Penjamin Pelaksana Emisi Efek" label on either committed fixture).
    by_code = {u["code"]: u for u in d["underwriters"]}
    assert set(by_code) == {"OD", "RB", "RS", "IN"}
    assert by_code["OD"]["name"] == "BRI DANAREKSA SEKURITAS"
    assert by_code["OD"]["is_lead"] is True
    assert by_code["RB"]["is_lead"] is False


def test_parse_detail_explicit_lead_label():
    # Neither committed fixture uses the "Penjamin Pelaksana Emisi Efek"
    # label, but the brief documents it as the lead-underwriter marker on
    # some e-IPO pages; cover that branch with a minimal synthetic page.
    html = """
    <html><body>
    <h5>Penjamin Pelaksana Emisi Efek</h5><p>AA - LEAD SEKURITAS<br/></p>
    <h5>Penjamin Emisi Efek</h5><p>AA - LEAD SEKURITAS<br/>BB - PESERTA SEKURITAS<br/></p>
    </body></html>
    """
    d = parse_detail(html)
    by_code = {u["code"]: u for u in d["underwriters"]}
    assert set(by_code) == {"AA", "BB"}
    assert by_code["AA"]["is_lead"] is True
    assert by_code["BB"]["is_lead"] is False


def test_parse_detail_missing_fields_are_none():
    d = parse_detail("<html><body>halaman kosong</body></html>")
    assert d["ticker"] is None and d["final_price"] is None
    assert d["logo_url"] is None and d["prospectus_url"] is None
    assert d["underwriters"] == []


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("13", 13.0),
        ("13,5", 13.5),        # Indonesian decimal comma
        ("13.5", 13.5),        # plain decimal point (NOT thousands)
        ("13%", 13.0),
        ("13.5%", 13.5),
        ("13,5 %", 13.5),
        ("1.000", 1000.0),     # unambiguous thousands grouping
        ("1.000.000", 1000000.0),
        ("1.234,5", 1234.5),   # thousands dot + decimal comma
        ("", None),
        (None, None),
        ("%", None),
        ("abc", None),
    ],
)
def test_pct(text, expected):
    assert _pct(text) == expected
