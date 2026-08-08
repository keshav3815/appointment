from datetime import date

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from starlette.requests import Request

from app.database import get_db
from app.dependencies import require_otp_verified
from app.models import Appointment, Patient
from app.schemas.appointment import CreateAppointmentRequest
from app.services.csrf_service import validate_csrf_token

router = APIRouter(prefix="/api", tags=["appointments"])


def _calculate_age(dob: date) -> int:
    today = date.today()
    years = today.year - dob.year
    if (today.month, today.day) < (dob.month, dob.day):
        years -= 1
    return years


@router.post("/appointments", dependencies=[Depends(require_otp_verified)])
def create_appointment(
    payload: CreateAppointmentRequest, request: Request, db: Session = Depends(get_db)
):
    if not validate_csrf_token(request, db, payload.csrf_token):
        return JSONResponse(
            status_code=403,
            content={
                "status": "error",
                "message": "Invalid or expired security token. Please reload the page.",
            },
        )

    otp_verified_email = request.session.get("otp_verified_email")
    if payload.email != otp_verified_email:
        return JSONResponse(
            status_code=422,
            content={"status": "error", "message": "Email does not match the verified email."},
        )

    duplicate = (
        db.query(Appointment)
        .join(Patient, Patient.patient_id == Appointment.patient_id)
        .filter(
            Patient.email == payload.email,
            Appointment.appointment_date == payload.appointment_date,
            Appointment.time_slot == payload.time_slot,
            Appointment.status != "Cancelled",
        )
        .first()
    )
    if duplicate:
        return JSONResponse(
            status_code=409,
            content={
                "status": "error",
                "message": "You already have an appointment booked for this date and time slot.",
            },
        )

    age = _calculate_age(payload.dob)

    try:
        patient = Patient(
            full_name=payload.full_name,
            mobile=payload.mobile,
            email=payload.email,
            gender=payload.gender,
            dob=payload.dob,
            age=age,
            society=payload.society or None,
            city=payload.city or None,
            state=payload.state or None,
        )
        db.add(patient)
        db.flush()

        appointment = Appointment(
            patient_id=patient.patient_id,
            department=payload.department,
            doctor=payload.doctor or "Any Available",
            appointment_date=payload.appointment_date,
            time_slot=payload.time_slot,
            appointment_type=payload.appointment_type,
            reason=payload.reason,
            symptoms=payload.symptoms or None,
            duration=payload.duration or None,
            status="Pending",
            payment_status="Unpaid",
        )
        db.add(appointment)
        db.commit()
        db.refresh(appointment)
        db.refresh(patient)
    except Exception:
        db.rollback()
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": "Failed to create appointment. Please try again."},
        )

    request.session["appointment_id"] = appointment.appointment_id
    request.session["patient_id"] = patient.patient_id
    request.session["patient_name"] = patient.full_name
    request.session["patient_email"] = patient.email

    return {
        "status": "success",
        "message": "Appointment created successfully.",
        "appointment_id": appointment.appointment_id,
        "patient_id": patient.patient_id,
    }
