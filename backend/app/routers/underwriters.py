from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db import get_db
from app.models import Underwriter
from app.routers.ipos import _summary
from app.schemas import UnderwriterStats

router = APIRouter(prefix="/api/underwriters", tags=["underwriters"])

def _stats(uw: Underwriter) -> UnderwriterStats:
    with_perf = [i for i in uw.ipos if i.performance and i.performance.day1_return_pct is not None]
    return UnderwriterStats(
        code=uw.code, name=uw.name, total_ipos=len(uw.ipos),
        ara_rate_pct=(100.0 * sum(1 for i in with_perf if i.performance.day1_ara) / len(with_perf)) if with_perf else None,
        avg_day1_return_pct=(sum(i.performance.day1_return_pct for i in with_perf) / len(with_perf)) if with_perf else None,
        total_value=sum(i.ipo_value or 0 for i in uw.ipos))

@router.get("")
def list_underwriters(db: Session = Depends(get_db)):
    return [_stats(u) for u in db.query(Underwriter).order_by(Underwriter.code)]

@router.get("/{code}")
def get_underwriter(code: str, db: Session = Depends(get_db)):
    uw = db.query(Underwriter).filter(Underwriter.code == code.upper()).one_or_none()
    if not uw:
        raise HTTPException(404, "Underwriter tidak ditemukan")
    out = _stats(uw).model_dump()
    out["ipos"] = [_summary(i) for i in uw.ipos]
    return out
