from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_doctor
from app.models import Appointment, Doctor, Patient
from app.schemas.doctor_auth import CancelAppointmentRequest, RescheduleAppointmentRequest

router = APIRouter(prefix="/api/doctor", tags=["doctor-dashboard"])


def _serialize(appointment: Appointment, patient: Patient) -> dict:
    return {
        "appointment_id": appointment.appointment_id,
        "patient_id": patient.patient_id,
        "patient_name": patient.full_name,
        "patient_mobile": patient.mobile,
        "patient_email": patient.email,
        "department": appointment.department,
        "consultation_mode": appointment.consultation_mode,
        "appointment_date": appointment.appointment_date.isoformat(),
        "time_slot": appointment.time_slot,
        "appointment_type": appointment.appointment_type,
        "reason": appointment.reason,
        "symptoms": appointment.symptoms,
        "status": appointment.status,
        "payment_status": appointment.payment_status,
        "doctor_remarks": appointment.doctor_remarks,
    }


def _get_own_appointment(db: Session, doctor: Doctor, appointment_id: int) -> Appointment:
    appointment = db.get(Appointment, appointment_id)
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found.")
    # Ownership is enforced by doctor_id, never by matching on a free-text name.
    if appointment.doctor_id != doctor.doctor_id:
        raise HTTPException(status_code=403, detail="This appointment does not belong to you.")
    return appointment


@router.get("/appointments")
def list_my_appointments(
    status: str | None = Query(None),
    appointment_date: str | None = Query(None),
    doctor: Doctor = Depends(get_current_doctor),
    db: Session = Depends(get_db),
):
    q = (
        db.query(Appointment, Patient)
        .join(Patient, Patient.patient_id == Appointment.patient_id)
        .filter(Appointment.doctor_id == doctor.doctor_id)
    )
    if status:
        q = q.filter(Appointment.status == status)
    if appointment_date:
        q = q.filter(Appointment.appointment_date == appointment_date)

    rows = q.order_by(Appointment.appointment_date.desc(), Appointment.time_slot.asc()).all()
    return {"status": "success", "appointments": [_serialize(a, p) for a, p in rows]}


@router.get("/appointments/{appointment_id}")
def get_my_appointment(
    appointment_id: int, doctor: Doctor = Depends(get_current_doctor), db: Session = Depends(get_db)
):
    appointment = _get_own_appointment(db, doctor, appointment_id)
    patient = db.get(Patient, appointment.patient_id)
    return {"status": "success", "appointment": _serialize(appointment, patient)}


@router.patch("/appointments/{appointment_id}/reschedule")
def reschedule_appointment(
    appointment_id: int,
    payload: RescheduleAppointmentRequest,
    doctor: Doctor = Depends(get_current_doctor),
    db: Session = Depends(get_db),
):
    appointment = _get_own_appointment(db, doctor, appointment_id)
    if appointment.status in ("Cancelled", "Completed"):
        raise HTTPException(
            status_code=409, detail=f"Cannot reschedule an appointment that is already {appointment.status}."
        )

    clash = (
        db.query(Appointment)
        .filter(
            Appointment.doctor_id == doctor.doctor_id,
            Appointment.appointment_id != appointment_id,
            Appointment.appointment_date == payload.appointment_date,
            Appointment.time_slot == payload.time_slot,
            Appointment.status != "Cancelled",
        )
        .first()
    )
    if clash:
        raise HTTPException(status_code=409, detail="You already have another appointment in that slot.")

    appointment.appointment_date = payload.appointment_date
    appointment.time_slot = payload.time_slot
    appointment.doctor_remarks = payload.remarks
    appointment.status = "Confirmed"
    db.commit()
    db.refresh(appointment)

    patient = db.get(Patient, appointment.patient_id)
    return {"status": "success", "appointment": _serialize(appointment, patient)}


@router.patch("/appointments/{appointment_id}/cancel")
def cancel_appointment(
    appointment_id: int,
    payload: CancelAppointmentRequest,
    doctor: Doctor = Depends(get_current_doctor),
    db: Session = Depends(get_db),
):
    appointment = _get_own_appointment(db, doctor, appointment_id)
    if appointment.status == "Cancelled":
        raise HTTPException(status_code=409, detail="Appointment is already cancelled.")

    appointment.status = "Cancelled"
    appointment.doctor_remarks = payload.remarks
    db.commit()
    db.refresh(appointment)

    patient = db.get(Patient, appointment.patient_id)
    return {"status": "success", "appointment": _serialize(appointment, patient)}
