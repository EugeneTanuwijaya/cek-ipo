from datetime import date, datetime
from pydantic import BaseModel, ConfigDict

class UnderwriterOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    code: str
    name: str

class PerformanceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    day1_close: float | None
    day1_return_pct: float | None
    day1_ara: bool | None

class IpoSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    ticker: str | None
    company_name: str | None
    status: str
    final_price: int | None
    price_low: int | None
    price_high: int | None
    lots_offered: int | None
    listing_date: date | None
    offering_end: date | None
    logo_url: str | None
    day1_return_pct: float | None = None

class IpoDetail(IpoSummary):
    sector: str | None
    description: str | None
    prospectus_url: str | None
    source_url: str | None
    shares_offered: int | None
    percent_of_capital: float | None
    bookbuilding_start: date | None
    bookbuilding_end: date | None
    offering_start: date | None
    allotment_date: date | None
    pooling_pct: float | None
    oversub_ratio: float | None
    effective_price: int | None
    ipo_value: int | None
    scraped_at: datetime | None
    underwriters: list[UnderwriterOut] = []
    performance: PerformanceOut | None = None

class UnderwriterStats(BaseModel):
    code: str
    name: str
    total_ipos: int
    ara_rate_pct: float | None
    avg_day1_return_pct: float | None
    total_value: int
