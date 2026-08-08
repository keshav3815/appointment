from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_admin
from app.models import Appointment, Patient, Payment

router = APIRouter(
    prefix="/api/admin/payments", tags=["admin-payments"], dependencies=[Depends(get_current_admin)]
)

PER_PAGE = 15
VALID_STATUSES = {"Created", "Authorized", "Captured", "Failed", "Refunded"}


@router.get("")
def list_payments(
    db: Session = Depends(get_db), search: str = "", status: str = "", page: int = Query(1, ge=1)
):
    query = (
        db.query(Payment, Appointment, Patient)
        .join(Appointment, Appointment.appointment_id == Payment.appointment_id)
        .join(Patient, Patient.patient_id == Appointment.patient_id)
    )

    search = search.strip()
    if search:
        like = f"%{search}%"
        query = query.filter(
            or_(
                Patient.full_name.like(like),
                Payment.transaction_id.like(like),
                Payment.razorpay_order_id.like(like),
            )
        )
    if status in VALID_STATUSES:
        query = query.filter(Payment.payment_status == status)

    total = query.count()
    total_pages = max(1, -(-total // PER_PAGE))

    rows = (
        query.order_by(Payment.created_at.desc())
        .offset((page - 1) * PER_PAGE)
        .limit(PER_PAGE)
        .all()
    )

    items = [
        {
            "payment_id": py.payment_id,
            "appointment_id": a.appointment_id,
            "department": a.department,
            "appointment_date": a.appointment_date.isoformat(),
            "full_name": p.full_name,
            "email": p.email,
            "mobile": p.mobile,
            "amount": f"{py.amount:.2f}",
            "razorpay_order_id": py.razorpay_order_id,
            "transaction_id": py.transaction_id,
            "payment_gateway": py.payment_gateway,
            "payment_status": py.payment_status,
            "created_at": py.created_at.isoformat(),
        }
        for py, a, p in rows
    ]

    total_captured = (
        db.query(func.coalesce(func.sum(Payment.amount), 0))
        .filter(Payment.payment_status == "Captured")
        .scalar()
    )
    total_created = db.query(Payment).filter(Payment.payment_status == "Created").count()
    total_failed = db.query(Payment).filter(Payment.payment_status == "Failed").count()

    return {
        "items": items,
        "total": total,
        "page": page,
        "total_pages": total_pages,
        "summary": {
            "total_captured": float(total_captured),
            "pending_orders": total_created,
            "failed_count": total_failed,
        },
    }
