from datetime import date, datetime, timezone
from sqlalchemy import BigInteger, Boolean, Column, Date, DateTime, Float, ForeignKey, Integer, String, Table, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db import Base

def now():
    return datetime.now(timezone.utc)

ipo_underwriters = Table(
    "ipo_underwriters", Base.metadata,
    Column("ipo_id", ForeignKey("ipos.id"), primary_key=True),
    Column("underwriter_id", ForeignKey("underwriters.id"), primary_key=True),
    Column("is_lead", Boolean, default=False),
)

class Ipo(Base):
    __tablename__ = "ipos"
    id: Mapped[int] = mapped_column(primary_key=True)
    eipo_id: Mapped[int] = mapped_column(unique=True, index=True)
    ticker: Mapped[str | None] = mapped_column(String(8), index=True)
    company_name: Mapped[str | None] = mapped_column(String(160))
    sector: Mapped[str | None] = mapped_column(String(80))
    description: Mapped[str | None] = mapped_column(Text)
    logo_url: Mapped[str | None] = mapped_column(String(400))
    prospectus_url: Mapped[str | None] = mapped_column(String(400))
    source_url: Mapped[str | None] = mapped_column(String(400))
    price_low: Mapped[int | None]
    price_high: Mapped[int | None]
    final_price: Mapped[int | None]
    shares_offered: Mapped[int | None] = mapped_column(BigInteger)
    percent_of_capital: Mapped[float | None]
    bookbuilding_start: Mapped[date | None]
    bookbuilding_end: Mapped[date | None]
    offering_start: Mapped[date | None]
    offering_end: Mapped[date | None]
    allotment_date: Mapped[date | None]
    listing_date: Mapped[date | None]
    status: Mapped[str] = mapped_column(String(16), default="bookbuilding", index=True)
    pooling_pct: Mapped[float | None]
    oversub_ratio: Mapped[float | None]
    scraped_at: Mapped[datetime | None]
    created_at: Mapped[datetime] = mapped_column(default=now)
    updated_at: Mapped[datetime] = mapped_column(default=now, onupdate=now)

    underwriters: Mapped[list["Underwriter"]] = relationship(secondary=ipo_underwriters, back_populates="ipos")
    performance: Mapped["IpoPerformance | None"] = relationship(back_populates="ipo", uselist=False)

    @property
    def effective_price(self) -> int | None:
        if self.final_price:
            return self.final_price
        if self.price_low and self.price_high:
            return (self.price_low + self.price_high) // 2
        return self.price_low or self.price_high

    @property
    def lots_offered(self) -> int | None:
        return self.shares_offered // 100 if self.shares_offered else None

    @property
    def ipo_value(self) -> int | None:
        p = self.effective_price
        return p * self.shares_offered if p and self.shares_offered else None

class Underwriter(Base):
    __tablename__ = "underwriters"
    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(8), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(160))
    ipos: Mapped[list[Ipo]] = relationship(secondary=ipo_underwriters, back_populates="underwriters")

class IpoPerformance(Base):
    __tablename__ = "ipo_performance"
    id: Mapped[int] = mapped_column(primary_key=True)
    ipo_id: Mapped[int] = mapped_column(ForeignKey("ipos.id"), unique=True)
    day1_open: Mapped[float | None]
    day1_high: Mapped[float | None]
    day1_low: Mapped[float | None]
    day1_close: Mapped[float | None]
    day1_return_pct: Mapped[float | None]
    day1_ara: Mapped[bool | None]
    fetched_at: Mapped[datetime] = mapped_column(default=now)
    ipo: Mapped[Ipo] = relationship(back_populates="performance")

class ScrapeRun(Base):
    __tablename__ = "scrape_runs"
    id: Mapped[int] = mapped_column(primary_key=True)
    kind: Mapped[str] = mapped_column(String(16))  # "eipo" | "prices"
    started_at: Mapped[datetime] = mapped_column(default=now)
    finished_at: Mapped[datetime | None]
    status: Mapped[str] = mapped_column(String(16), default="running")  # running|success|partial|failed
    items_processed: Mapped[int] = mapped_column(Integer, default=0)
    message: Mapped[str | None] = mapped_column(Text)
