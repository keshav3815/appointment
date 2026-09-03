from datetime import date, datetime

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from starlette.requests import Request

from app.config import settings
from app.core.security import (
    PATIENT_COOKIE_NAME,
    create_patient_token,
    hash_password,
    verify_password,
)
from app.database import get_db
from app.dependencies import get_current_patient, get_optional_patient
from app.models import Patient
from app.schemas.patient_auth import (
    ForgotPasswordResetRequest,
    PatientLoginRequest,
    PatientSignupRequest,
    PatientUpdateRequest,
)
from app.services import otp_service

router = APIRouter(prefix="/api/patient", tags=["patient-auth"])


def _calculate_age(dob: date) -> int:
    today = date.today()
    years = today.year - dob.year
    if (today.month, today.day) < (dob.month, dob.day):
        years -= 1
    return years


def _serialize(patient: Patient) -> dict:
    return {
        "patient_id": patient.patient_id,
        "full_name": patient.full_name,
        "mobile": patient.mobile,
        "email": patient.email,
        "gender": patient.gender,
        "dob": patient.dob.isoformat() if patient.dob else None,
        "age": patient.age,
        "society": patient.society,
        "city": patient.city,
        "state": patient.state,
        "photo_url": patient.photo_url,
    }


def _set_patient_cookie(resp: JSONResponse, patient_id: int) -> None:
    token = create_patient_token(patient_id)
    resp.set_cookie(
        key=PATIENT_COOKIE_NAME,
        value=token,
        httponly=True,
        samesite="lax",
        secure=not settings.DEV_MODE,
        max_age=settings.JWT_EXPIRE_MINUTES * 60,
    )


@router.post("/signup")
def signup(payload: PatientSignupRequest, request: Request, db: Session = Depends(get_db)):
    otp_verified_email = request.session.get("otp_verified_email")
    if payload.email != otp_verified_email:
        return JSONResponse(
            status_code=422,
            content={"status": "error", "message": "Please verify your email with OTP first."},
        )

    existing = db.query(Patient).filter(Patient.email == payload.email).order_by(
        Patient.patient_id.desc()
    ).first()

    if existing and existing.password_hash:
        return JSONResponse(
            status_code=409,
            content={
                "status": "error",
                "message": "An account already exists for this email. Please log in instead.",
            },
        )

    age = _calculate_age(payload.dob)
    password_hash = hash_password(payload.password)

    if existing:
        # A patient record already exists from a prior guest booking with this
        # email — attach the new account to it instead of fragmenting history.
        existing.full_name = payload.full_name
        existing.mobile = payload.mobile
        existing.gender = payload.gender
        existing.dob = payload.dob
        existing.age = age
        existing.password_hash = password_hash
        patient = existing
    else:
        patient = Patient(
            full_name=payload.full_name,
            mobile=payload.mobile,
            email=payload.email,
            gender=payload.gender,
            dob=payload.dob,
            age=age,
            password_hash=password_hash,
        )
        db.add(patient)

    db.commit()
    db.refresh(patient)

    request.session.pop("otp_verified", None)
    request.session.pop("otp_verified_email", None)
    request.session.pop("otp_verified_at", None)

    resp = JSONResponse(content={"status": "success", "patient": _serialize(patient)})
    _set_patient_cookie(resp, patient.patient_id)
    return resp


@router.post("/login")
def login(payload: PatientLoginRequest, db: Session = Depends(get_db)):
    patient = (
        db.query(Patient)
        .filter(Patient.email == payload.email, Patient.password_hash.isnot(None))
        .order_by(Patient.patient_id.desc())
        .first()
    )

    if not patient or not verify_password(payload.password, patient.password_hash):
        return JSONResponse(
            status_code=401,
            content={"status": "error", "message": "Invalid email or password."},
        )

    resp = JSONResponse(content={"status": "success", "patient": _serialize(patient)})
    _set_patient_cookie(resp, patient.patient_id)
    return resp


@router.post("/logout")
def logout():
    resp = JSONResponse(content={"status": "success"})
    resp.delete_cookie(PATIENT_COOKIE_NAME)
    return resp


@router.get("/me")
def me(patient: Patient | None = Depends(get_optional_patient)):
    if not patient:
        return JSONResponse(status_code=401, content={"status": "error", "message": "Not authenticated."})
    return {"status": "success", "patient": _serialize(patient)}


@router.put("/me")
def update_me(
    payload: PatientUpdateRequest,
    patient: Patient = Depends(get_current_patient),
    db: Session = Depends(get_db),
):
    data = payload.model_dump(exclude_unset=True)
    if "dob" in data and data["dob"]:
        patient.age = _calculate_age(data["dob"])
    for field, value in data.items():
        setattr(patient, field, value)
    db.commit()
    db.refresh(patient)
    return {"status": "success", "patient": _serialize(patient)}


@router.get("/appointments")
def my_appointments(patient: Patient = Depends(get_current_patient), db: Session = Depends(get_db)):
    from app.models import Appointment, Doctor

    rows = (
        db.query(Appointment, Doctor)
        .outerjoin(Doctor, Doctor.doctor_id == Appointment.doctor_id)
        .filter(Appointment.patient_id == patient.patient_id)
        .order_by(Appointment.appointment_date.desc(), Appointment.appointment_id.desc())
        .all()
    )

    return {
        "status": "success",
        "appointments": [
            {
                "appointment_id": a.appointment_id,
                "department": a.department,
                "doctor": a.doctor,
                "doctor_id": a.doctor_id,
                "doctor_name": d.full_name if d else a.doctor,
                "consultation_mode": a.consultation_mode,
                "appointment_date": a.appointment_date.isoformat(),
                "time_slot": a.time_slot,
                "appointment_type": a.appointment_type,
                "status": a.status,
                "payment_status": a.payment_status,
                "doctor_remarks": a.doctor_remarks,
            }
            for a, d in rows
        ],
    }


@router.post("/forgot-password/reset")
def reset_password(
    payload: ForgotPasswordResetRequest, request: Request, db: Session = Depends(get_db)
):
    success, message, status_code = otp_service.verify_otp(db, payload.email, payload.otp)
    if not success:
        return JSONResponse(status_code=status_code, content={"status": "error", "message": message})

    patient = (
        db.query(Patient)
        .filter(Patient.email == payload.email, Patient.password_hash.isnot(None))
        .order_by(Patient.patient_id.desc())
        .first()
    )
    if not patient:
        return JSONResponse(
            status_code=404,
            content={"status": "error", "message": "No account found for this email."},
        )

    patient.password_hash = hash_password(payload.new_password)
    db.commit()

    return {"status": "success", "message": "Password updated. Please log in with your new password."}
