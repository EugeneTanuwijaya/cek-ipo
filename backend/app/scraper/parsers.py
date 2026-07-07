"""Parsers for e-ipo.co.id HTML pages.

Selectors here are reverse-engineered from real fixtures
(backend/tests/fixtures/index.html, backend/tests/fixtures/detail_347.html)
downloaded 2026-07-06. The site renders detail-page fields as label/value
pairs: an <h5> label tag immediately followed by one or more <p> value
tags (siblings). Some labels (e.g. "Book Building") carry *two* sibling
<p> tags -- a date range and a price range -- so the lookup helpers below
return a list of values, not just one.
"""

import re
from dataclasses import dataclass
from datetime import date

from bs4 import BeautifulSoup, Tag

BASE = "https://e-ipo.co.id"
DETAIL_RE = re.compile(r"/(?:id|en)/ipo/(\d+)/([a-z0-9]+)-")


@dataclass
class IndexEntry:
    eipo_id: int
    url: str
    ticker: str | None = None
    status_label: str | None = None


def parse_index(html: str) -> list[IndexEntry]:
    soup = BeautifulSoup(html, "html.parser")
    out: dict[int, IndexEntry] = {}
    for a in soup.find_all("a", href=DETAIL_RE):
        m = DETAIL_RE.search(a["href"])
        eid = int(m.group(1))
        if eid in out:
            continue
        status_label = None
        box = a.find_parent("div", class_="pricing-box")
        if box:
            h3 = box.find("h3")
            if h3:
                status_label = h3.get_text(strip=True)
        out[eid] = IndexEntry(eid, BASE + a["href"], m.group(2).upper(), status_label)
    return list(out.values())


# ---------------------------------------------------------------------------
# detail page helpers
# ---------------------------------------------------------------------------

def _find_label_tag(soup: BeautifulSoup, *labels: str) -> Tag | None:
    """Find the <h5> label tag whose text equals or starts with one of `labels`.

    `startswith` is needed because some labels carry a trailing icon/suffix,
    e.g. "Penjatahan (Selesai) <i .../>" -> text "Penjatahan (Selesai)".
    """
    for h5 in soup.find_all("h5"):
        text = h5.get_text(" ", strip=True)
        for label in labels:
            if text == label or text.startswith(label):
                return h5
    return None


def _next_p_tags(tag: Tag) -> list[Tag]:
    out = []
    sib = tag.find_next_sibling()
    while sib is not None and sib.name == "p":
        out.append(sib)
        sib = sib.find_next_sibling()
    return out


def _label_values(soup: BeautifulSoup, *labels: str, sep: str = " ") -> list[str]:
    tag = _find_label_tag(soup, *labels)
    if not tag:
        return []
    return [p.get_text(sep, strip=True) for p in _next_p_tags(tag)]


def _label_value(soup: BeautifulSoup, *labels: str, sep: str = " ") -> str | None:
    vals = _label_values(soup, *labels, sep=sep)
    return vals[0] if vals else None


def _num(text: str | None) -> int | None:
    if not text:
        return None
    digits = re.sub(r"[^\d]", "", text)
    return int(digits) if digits else None


_THOUSANDS_DOTS_RE = re.compile(r"\d{1,3}(\.\d{3})+")


def _pct(text: str | None) -> float | None:
    """Parse a percentage value, tolerating Indonesian number formatting.

    Handles: "13", "13,5" (Indonesian decimal comma), "13.5" (plain decimal
    point), an optional trailing "%", and dots as thousands separators only
    when the digit grouping makes that unambiguous (every dot followed by
    exactly 3 digits, e.g. "1.000" or "1.000.000"); any other dot is treated
    as a decimal point.
    """
    if not text:
        return None
    t = text.strip()
    if t.endswith("%"):
        t = t[:-1].strip()
    if not t:
        return None
    if "," in t:
        # Indonesian format: comma is the decimal separator; any dots are
        # thousands separators ("1.234,5" -> 1234.5).
        t = t.replace(".", "").replace(",", ".")
    elif _THOUSANDS_DOTS_RE.fullmatch(t):
        # Dots are unambiguously thousands separators ("1.000" -> 1000.0).
        t = t.replace(".", "")
    try:
        return float(t)
    except ValueError:
        return None


# Indonesian month names/abbreviations mapped alongside their English
# equivalents, since e-ipo.co.id mixes both ("Nov"/"Dec" as seen on the SUPA
# fixture, but other pages are documented to use "Jun"/"Juni").
_MONTHS = {
    "jan": 1, "januari": 1,
    "feb": 2, "februari": 2,
    "mar": 3, "maret": 3,
    "apr": 4, "april": 4,
    "mei": 5, "may": 5,
    "jun": 6, "juni": 6, "june": 6,
    "jul": 7, "juli": 7, "july": 7,
    "agu": 8, "ags": 8, "agustus": 8, "aug": 8, "august": 8,
    "sep": 9, "sept": 9, "september": 9,
    "okt": 10, "oktober": 10, "oct": 10, "october": 10,
    "nov": 11, "november": 11,
    "des": 12, "desember": 12, "dec": 12, "december": 12,
}
_DATE_RE = re.compile(r"(\d{1,2})\s+([A-Za-z]+)\.?\s+(\d{4})")
_DATE_RANGE_RE = re.compile(
    r"(\d{1,2}\s+[A-Za-z]+\.?\s+\d{4})\s*-\s*(\d{1,2}\s+[A-Za-z]+\.?\s+\d{4})"
)
_PRICE_RANGE_RE = re.compile(r"Rp\.?\s*([\d.,]+)\s*-\s*Rp\.?\s*([\d.,]+)")


def _date(text: str | None) -> date | None:
    if not text:
        return None
    m = _DATE_RE.search(text)
    if not m:
        return None
    day, mon, year = m.groups()
    month = _MONTHS.get(mon.lower().rstrip("."))
    if not month:
        return None
    try:
        return date(int(year), month, int(day))
    except ValueError:
        return None


def _date_range(text: str | None) -> tuple[date | None, date | None]:
    if not text:
        return None, None
    m = _DATE_RANGE_RE.search(text)
    if m:
        return _date(m.group(1)), _date(m.group(2))
    return _date(text), None


def _price_range(text: str | None) -> tuple[int | None, int | None]:
    if not text:
        return None, None
    m = _PRICE_RANGE_RE.search(text)
    if m:
        return _num(m.group(1)), _num(m.group(2))
    return _num(text), None


_UNDERWRITER_LINE_RE = re.compile(r"^([A-Za-z0-9]{1,6})\s*-\s*(.+)$")


def _parse_underwriter_line(line: str) -> tuple[str | None, str]:
    m = _UNDERWRITER_LINE_RE.match(line.strip())
    if m:
        return m.group(1).upper(), m.group(2).strip()
    return None, line.strip()


def _underwriters(soup: BeautifulSoup) -> list[dict]:
    # Some e-ipo detail pages spell out "Penjamin Pelaksana Emisi Efek"
    # (lead underwriter[s]) as its own label distinct from "Penjamin Emisi
    # Efek" (full underwriting syndicate) -- brief's documented pattern.
    # The SUPA fixture instead exposes the lead via "Partisipan Admin" (a
    # single admin/lead underwriter) alongside the full "Penjamin Emisi
    # Efek" list, so both patterns are supported here.
    explicit_lead_raw = _label_value(soup, "Penjamin Pelaksana Emisi Efek", sep="\n")
    explicit_lead_codes = set()
    if explicit_lead_raw:
        for line in explicit_lead_raw.split("\n"):
            if not line.strip():
                continue
            code, _name = _parse_underwriter_line(line)
            if code:
                explicit_lead_codes.add(code)

    admin_raw = _label_value(soup, "Partisipan Admin")
    admin_code = None
    if admin_raw:
        admin_code, _name = _parse_underwriter_line(admin_raw)

    participants_raw = _label_value(soup, "Penjamin Emisi Efek", sep="\n")
    underwriters: list[dict] = []
    seen: set[str] = set()
    if participants_raw:
        for line in participants_raw.split("\n"):
            if not line.strip():
                continue
            code, name = _parse_underwriter_line(line)
            if not code or code in seen:
                continue
            seen.add(code)
            is_lead = code in explicit_lead_codes or code == admin_code
            underwriters.append({"code": code, "name": name, "is_lead": is_lead})
    return underwriters


# Site status labels (see the "status_id" filter options on the index page)
# mapped to the plan's canonical Ipo.status values, termasuk "cancelled"
# untuk penawaran yang dibatalkan/ditunda (verified: eipo 300 CABR-C1 dan
# 89 NPII menampilkan h5.panel-heading "Canceled").
#
# Fixture coverage: "closed" is verified by detail_347.html (SUPA) and
# "allotment" by detail_351.html (EMMI). The remaining mappings
# ("pre-effective", "book building", "waiting for offering", "offering")
# are inferred from the index page's status filter options and are NOT yet
# verified against a real detail-page fixture in that state.
_STATUS_MAP = {
    "pre-effective": "bookbuilding",
    "book building": "bookbuilding",
    "waiting for offering": "bookbuilding",
    "offering": "offering",
    "allotment": "allotment",
    "closed": "listed",
    # Penawaran yang tidak berlanjut; tanpa mapping ini status jatuh ke None
    # -> default model "bookbuilding" -> IPO batal muncul di daftar aktif.
    "canceled": "cancelled",
    "cancelled": "cancelled",
    "postpone": "cancelled",
    "postponed": "cancelled",
}

EMPTY = dict(
    ticker=None, company_name=None, sector=None, description=None,
    logo_url=None, prospectus_url=None,
    price_low=None, price_high=None, final_price=None, shares_offered=None,
    percent_of_capital=None, bookbuilding_start=None, bookbuilding_end=None,
    offering_start=None, offering_end=None, allotment_date=None,
    listing_date=None, status=None, pooling_pct=None, underwriters=None,
)


def _abs_url(path: str | None) -> str | None:
    if not path:
        return None
    if path.startswith(("http://", "https://")):
        return path
    return BASE + path


def parse_detail(html: str) -> dict:
    soup = BeautifulSoup(html, "html.parser")
    d = dict(EMPTY, underwriters=[])

    kode = _label_value(soup, "Kode Emiten", "Kode Saham", "Kode", "Ticker")
    if kode:
        d["ticker"] = kode.split()[0].upper()

    h1 = soup.find("h1", class_="panel-title")
    if h1:
        d["company_name"] = h1.get_text(strip=True)

    d["sector"] = _label_value(soup, "Sektor", "Sector")

    desc_paragraphs = [p for p in _label_values(soup, "Ringkasan Perusahaan Emiten") if p]
    if desc_paragraphs:
        d["description"] = "\n\n".join(desc_paragraphs)

    d["shares_offered"] = _num(_label_value(soup, "Jumlah Saham Ditawarkan", "Total Shares Offered"))
    d["percent_of_capital"] = _pct(_label_value(soup, "% dari Total Saham Dicatatkan"))

    bb = _label_values(soup, "Book Building")
    if bb:
        d["bookbuilding_start"], d["bookbuilding_end"] = _date_range(bb[0])
        if len(bb) > 1:
            d["price_low"], d["price_high"] = _price_range(bb[1])

    offer = _label_values(soup, "Penawaran Umum", "Masa Penawaran Umum")
    if offer:
        d["offering_start"], d["offering_end"] = _date_range(offer[0])
        if len(offer) > 1:
            d["final_price"] = _num(offer[1])

    logo_img = soup.find("img", class_="img-detail")
    if logo_img and logo_img.get("src"):
        d["logo_url"] = _abs_url(logo_img["src"])

    # First a.prospec link is the full prospectus (type=); the second, when
    # present, is the summary prospectus (type=summary).
    prospectus_a = soup.find("a", class_="prospec")
    if prospectus_a and prospectus_a.get("href"):
        d["prospectus_url"] = _abs_url(prospectus_a["href"])

    d["allotment_date"] = _date(_label_value(soup, "Penjatahan"))
    d["listing_date"] = _date(_label_value(soup, "Tanggal Pencatatan", "Listing Date"))
    d["pooling_pct"] = _pct(_label_value(soup, "Pooling", "Alokasi Pooling"))

    status_tag = soup.find("h5", class_="panel-heading")
    if status_tag:
        raw = status_tag.get_text(strip=True)
        d["status"] = _STATUS_MAP.get(raw.lower())

    d["underwriters"] = _underwriters(soup)

    return d
