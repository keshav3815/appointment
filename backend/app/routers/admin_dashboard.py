from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_admin
from app.models import Appointment, Patient, Payment

router = APIRouter(
    prefix="/api/admin/dashboard", tags=["admin-dashboard"], dependencies=[Depends(get_current_admin)]
)


@router.get("")
def get_dashboard(db: Session = Depends(get_db)):
    total_appointments = db.query(Appointment).count()
    today_appointments = (
        db.query(Appointment).filter(Appointment.appointment_date == date.today()).count()
    )
    total_patients = db.query(Patient).count()
    total_revenue = (
        db.query(func.coalesce(func.sum(Payment.amount), 0))
        .filter(Payment.payment_status == "Captured")
        .scalar()
    )

    pending_count = db.query(Appointment).filter(Appointment.status == "Pending").count()
    confirmed_count = db.query(Appointment).filter(Appointment.status == "Confirmed").count()
    cancelled_count = db.query(Appointment).filter(Appointment.status == "Cancelled").count()
    paid_count = db.query(Appointment).filter(Appointment.payment_status == "Paid").count()
    unpaid_count = db.query(Appointment).filter(Appointment.payment_status == "Unpaid").count()

    recent_appointments = (
        db.query(Appointment, Patient)
        .join(Patient, Patient.patient_id == Appointment.patient_id)
        .order_by(Appointment.created_at.desc())
        .limit(10)
        .all()
    )
    recent_appointments_data = [
        {
            "appointment_id": a.appointment_id,
            "department": a.department,
            "doctor": a.doctor,
            "appointment_date": a.appointment_date.isoformat(),
            "time_slot": a.time_slot,
            "status": a.status,
            "payment_status": a.payment_status,
            "full_name": p.full_name,
            "email": p.email,
        }
        for a, p in recent_appointments
    ]

    recent_payments = (
        db.query(Payment, Appointment, Patient)
        .join(Appointment, Appointment.appointment_id == Payment.appointment_id)
        .join(Patient, Patient.patient_id == Appointment.patient_id)
        .order_by(Payment.created_at.desc())
        .limit(5)
        .all()
    )
    recent_payments_data = [
        {
            "payment_id": py.payment_id,
            "amount": f"{py.amount:.2f}",
            "transaction_id": py.transaction_id,
            "payment_status": py.payment_status,
            "created_at": py.created_at.isoformat(),
            "full_name": p.full_name,
            "appointment_id": a.appointment_id,
        }
        for py, a, p in recent_payments
    ]

    dept_rows = (
        db.query(Appointment.department, func.count().label("cnt"))
        .group_by(Appointment.department)
        .order_by(func.count().desc())
        .limit(6)
        .all()
    )
    department_breakdown = [{"department": d, "count": c} for d, c in dept_rows]

    return {
        "total_appointments": total_appointments,
        "today_appointments": today_appointments,
        "total_patients": total_patients,
        "total_revenue": float(total_revenue),
        "pending_count": pending_count,
        "confirmed_count": confirmed_count,
        "cancelled_count": cancelled_count,
        "paid_count": paid_count,
        "unpaid_count": unpaid_count,
        "recent_appointments": recent_appointments_data,
        "recent_payments": recent_payments_data,
        "department_breakdown": department_breakdown,
    }
