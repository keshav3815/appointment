from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session
from starlette.requests import Request

from app.core.security import (
    decode_admin_token,
    decode_doctor_token,
    decode_patient_token,
    ADMIN_COOKIE_NAME,
    DOCTOR_COOKIE_NAME,
    PATIENT_COOKIE_NAME,
)
from app.database import get_db
from app.models import AdminUser, Doctor, Patient


def require_otp_verified(request: Request) -> None:
    if request.session.get("otp_verified") is not True:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email not verified. Please verify OTP first.",
        )


def get_current_admin(request: Request, db: Session = Depends(get_db)) -> AdminUser:
    token = request.cookies.get(ADMIN_COOKIE_NAME)
    payload = decode_admin_token(token) if token else None
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated.")

    admin = db.get(AdminUser, payload["admin_id"])
    if not admin or not admin.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated.")

    return admin


def require_superadmin(admin: AdminUser = Depends(get_current_admin)) -> AdminUser:
    if admin.role != "superadmin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Superadmin only.")
    return admin


def get_optional_patient(request: Request, db: Session = Depends(get_db)) -> Patient | None:
    token = request.cookies.get(PATIENT_COOKIE_NAME)
    payload = decode_patient_token(token) if token else None
    if not payload:
        return None
    return db.get(Patient, payload["patient_id"])


def get_current_patient(patient: Patient | None = Depends(get_optional_patient)) -> Patient:
    if not patient:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated.")
    return patient


def get_current_doctor(request: Request, db: Session = Depends(get_db)) -> Doctor:
    token = request.cookies.get(DOCTOR_COOKIE_NAME)
    payload = decode_doctor_token(token) if token else None
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated.")

    doctor = db.get(Doctor, payload["doctor_id"])
    if not doctor or not doctor.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated.")

    return doctor
