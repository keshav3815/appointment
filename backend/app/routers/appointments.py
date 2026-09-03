from datetime import date

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from starlette.requests import Request

from app.database import get_db
from app.dependencies import get_optional_patient
from app.models import Appointment, Doctor, Patient
from app.schemas.appointment import CreateAppointmentRequest
from app.services.csrf_service import validate_csrf_token

router = APIRouter(prefix="/api", tags=["appointments"])


def _calculate_age(dob: date) -> int:
    today = date.today()
    years = today.year - dob.year
    if (today.month, today.day) < (dob.month, dob.day):
        years -= 1
    return years


@router.post("/appointments")
def create_appointment(
    payload: CreateAppointmentRequest,
    request: Request,
    db: Session = Depends(get_db),
    logged_in_patient: Patient | None = Depends(get_optional_patient),
):
    if not validate_csrf_token(request, db, payload.csrf_token):
        return JSONResponse(
            status_code=403,
            content={
                "status": "error",
                "message": "Invalid or expired security token. Please reload the page.",
            },
        )

    # An authenticated account already owns a verified email; a guest must
    # have just verified this exact email via the OTP box on the form.
    if not logged_in_patient:
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

    if payload.doctor_id is not None:
        doctor = db.get(Doctor, payload.doctor_id)
        if not doctor or not doctor.is_active:
            return JSONResponse(
                status_code=422,
                content={"status": "error", "message": "Selected doctor is not available."},
            )
        # Clinic and video are independent tracks for the same doctor — only
        # a booking in the *same* mode at this date+time counts as a clash.
        double_booked = (
            db.query(Appointment)
            .filter(
                Appointment.doctor_id == payload.doctor_id,
                Appointment.appointment_date == payload.appointment_date,
                Appointment.time_slot == payload.time_slot,
                Appointment.consultation_mode == payload.consultation_mode,
                Appointment.status != "Cancelled",
            )
            .first()
        )
        if double_booked:
            return JSONResponse(
                status_code=409,
                content={
                    "status": "error",
                    "message": "This time slot has just been booked by another patient. Please select another slot.",
                },
            )
        doctor_name = doctor.full_name
    else:
        doctor_name = payload.doctor or "Any Available"

    age = _calculate_age(payload.dob)

    try:
        if logged_in_patient:
            # Reuse the authenticated account's own record rather than
            # spawning a duplicate patient row per booking.
            patient = logged_in_patient
            patient.full_name = payload.full_name
            patient.mobile = payload.mobile
            patient.gender = payload.gender
            patient.dob = payload.dob
            patient.age = age
            patient.society = payload.society or patient.society
            patient.city = payload.city or patient.city
            patient.state = payload.state or patient.state
        else:
            # Guest checkout: reuse an existing patient row for this email if
            # one already exists (e.g. a returning guest), instead of always
            # inserting a fresh duplicate.
            patient = (
                db.query(Patient)
                .filter(Patient.email == payload.email)
                .order_by(Patient.patient_id.desc())
                .first()
            )
            if patient:
                patient.full_name = payload.full_name
                patient.mobile = payload.mobile
                patient.gender = payload.gender
                patient.dob = payload.dob
                patient.age = age
                patient.society = payload.society or patient.society
                patient.city = payload.city or patient.city
                patient.state = payload.state or patient.state
            else:
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
            doctor=doctor_name,
            doctor_id=payload.doctor_id,
            consultation_mode=payload.consultation_mode,
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
    except IntegrityError:
        # The pre-check above is only a fast-path courtesy — it can still
        # race with another request between the SELECT and this INSERT. The
        # database's partial unique index (doctor_id + appointment_date +
        # consultation_mode + time_slot, excluding Cancelled) is the real
        # guarantee: it rejects the loser here, so only one booking per slot
        # can ever land no matter how close together the requests arrive.
        db.rollback()
        return JSONResponse(
            status_code=409,
            content={
                "status": "error",
                "message": "This time slot has just been booked by another patient. Please select another slot.",
            },
        )
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
