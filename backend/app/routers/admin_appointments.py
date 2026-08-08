from datetime import date

from fastapi import APIRouter, Depends, Query
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_admin
from app.models import Appointment, Patient, Payment
from app.schemas.admin_appointment import PatchAppointmentRequest

router = APIRouter(
    prefix="/api/admin/appointments",
    tags=["admin-appointments"],
    dependencies=[Depends(get_current_admin)],
)

PER_PAGE = 15


def _serialize(a: Appointment, p: Patient) -> dict:
    return {
        "appointment_id": a.appointment_id,
        "patient_id": p.patient_id,
        "full_name": p.full_name,
        "email": p.email,
        "mobile": p.mobile,
        "gender": p.gender,
        "age": p.age,
        "society": p.society,
        "city": p.city,
        "state": p.state,
        "department": a.department,
        "doctor": a.doctor,
        "appointment_date": a.appointment_date.isoformat(),
        "time_slot": a.time_slot,
        "appointment_type": a.appointment_type,
        "reason": a.reason,
        "symptoms": a.symptoms,
        "duration": a.duration,
        "status": a.status,
        "payment_status": a.payment_status,
        "created_at": a.created_at.isoformat(),
    }


@router.get("")
def list_appointments(
    db: Session = Depends(get_db),
    search: str = "",
    status: str = "",
    payment: str = "",
    date_from: date | None = None,
    date_to: date | None = None,
    page: int = Query(1, ge=1),
):
    query = db.query(Appointment, Patient).join(Patient, Patient.patient_id == Appointment.patient_id)

    search = search.strip()
    if search:
        like = f"%{search}%"
        conditions = [Patient.full_name.like(like), Patient.email.like(like), Patient.mobile.like(like)]
        if search.isdigit():
            conditions.append(Appointment.appointment_id == int(search))
        from sqlalchemy import or_

        query = query.filter(or_(*conditions))

    if status in {"Pending", "Confirmed", "Cancelled", "Completed"}:
        query = query.filter(Appointment.status == status)
    if payment in {"Paid", "Unpaid", "Failed", "Refunded"}:
        query = query.filter(Appointment.payment_status == payment)
    if date_from:
        query = query.filter(Appointment.appointment_date >= date_from)
    if date_to:
        query = query.filter(Appointment.appointment_date <= date_to)

    total = query.count()
    total_pages = max(1, -(-total // PER_PAGE))

    rows = (
        query.order_by(Appointment.created_at.desc())
        .offset((page - 1) * PER_PAGE)
        .limit(PER_PAGE)
        .all()
    )

    return {
        "items": [_serialize(a, p) for a, p in rows],
        "total": total,
        "page": page,
        "total_pages": total_pages,
    }


@router.get("/{appointment_id}")
def get_appointment_detail(appointment_id: int, db: Session = Depends(get_db)):
    row = (
        db.query(Appointment, Patient)
        .join(Patient, Patient.patient_id == Appointment.patient_id)
        .filter(Appointment.appointment_id == appointment_id)
        .first()
    )
    if not row:
        return JSONResponse(status_code=404, content={"success": False, "error": "Appointment not found"})

    a, p = row
    return {"success": True, "appointment": _serialize(a, p)}


@router.patch("/{appointment_id}")
def patch_appointment(appointment_id: int, payload: PatchAppointmentRequest, db: Session = Depends(get_db)):
    if not payload.validate_value():
        return JSONResponse(
            status_code=422,
            content={"success": False, "error": f"Invalid value for {payload.field}"},
        )

    appointment = db.get(Appointment, appointment_id)
    if not appointment:
        return JSONResponse(status_code=404, content={"success": False, "error": "Appointment not found"})

    setattr(appointment, payload.field, payload.value)
    db.commit()

    field_label = payload.field.replace("_", " ").capitalize()
    return {"success": True, "message": f"{field_label} updated"}


@router.delete("/{appointment_id}")
def delete_appointment(appointment_id: int, db: Session = Depends(get_db)):
    appointment = db.get(Appointment, appointment_id)
    if not appointment:
        return JSONResponse(status_code=404, content={"success": False, "error": "Appointment not found"})

    db.query(Payment).filter(Payment.appointment_id == appointment_id).delete()
    db.delete(appointment)
    db.commit()

    return {"success": True, "message": "Appointment deleted"}
