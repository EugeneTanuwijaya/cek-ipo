from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db import get_db
from app.models import Ipo
from app.schemas import IpoDetail, IpoSummary

router = APIRouter(prefix="/api/ipos", tags=["ipos"])

def _summary(ipo: Ipo) -> IpoSummary:
    s = IpoSummary.model_validate(ipo)
    if ipo.performance:
        s.day1_return_pct = ipo.performance.day1_return_pct
    return s

@router.get("")
def list_ipos(status: str | None = None, q: str | None = None,
              page: int = 1, per_page: int = 24, db: Session = Depends(get_db)):
    query = db.query(Ipo).order_by(Ipo.eipo_id.desc())
    if status:
        query = query.filter(Ipo.status == status)
    if q:
        like = f"%{q}%"
        query = query.filter((Ipo.ticker.ilike(like)) | (Ipo.company_name.ilike(like)))
    total = query.count()
    items = query.offset((page - 1) * per_page).limit(per_page).all()
    return {"items": [_summary(i) for i in items], "total": total, "page": page}

@router.get("/{ticker}", response_model=IpoDetail)
def get_ipo(ticker: str, db: Session = Depends(get_db)):
    ipo = db.query(Ipo).filter(Ipo.ticker == ticker.upper()).one_or_none()
    if not ipo:
        raise HTTPException(404, "IPO tidak ditemukan")
    return IpoDetail.model_validate(ipo, from_attributes=True)
