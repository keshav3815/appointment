from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_admin
from app.models import Appointment, Patient

router = APIRouter(
    prefix="/api/admin/patients", tags=["admin-patients"], dependencies=[Depends(get_current_admin)]
)

PER_PAGE = 15


@router.get("")
def list_patients(db: Session = Depends(get_db), search: str = "", page: int = Query(1, ge=1)):
    apt_count_sq = (
        db.query(func.count(Appointment.appointment_id))
        .filter(Appointment.patient_id == Patient.patient_id)
        .correlate(Patient)
        .scalar_subquery()
    )
    last_visit_sq = (
        db.query(func.max(Appointment.appointment_date))
        .filter(Appointment.patient_id == Patient.patient_id)
        .correlate(Patient)
        .scalar_subquery()
    )

    query = db.query(Patient, apt_count_sq.label("apt_count"), last_visit_sq.label("last_visit"))

    search = search.strip()
    if search:
        like = f"%{search}%"
        query = query.filter(
            or_(Patient.full_name.like(like), Patient.email.like(like), Patient.mobile.like(like))
        )

    total = query.count()
    total_pages = max(1, -(-total // PER_PAGE))

    rows = (
        query.order_by(Patient.created_at.desc())
        .offset((page - 1) * PER_PAGE)
        .limit(PER_PAGE)
        .all()
    )

    items = [
        {
            "patient_id": p.patient_id,
            "full_name": p.full_name,
            "email": p.email,
            "mobile": p.mobile,
            "gender": p.gender,
            "age": p.age,
            "city": p.city,
            "state": p.state,
            "apt_count": apt_count,
            "last_visit": last_visit.isoformat() if last_visit else None,
            "created_at": p.created_at.isoformat(),
        }
        for p, apt_count, last_visit in rows
    ]

    return {"items": items, "total": total, "page": page, "total_pages": total_pages}
