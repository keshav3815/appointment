from datetime import datetime

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.config import settings
from app.core.security import DOCTOR_COOKIE_NAME, create_doctor_token, verify_password
from app.database import get_db
from app.dependencies import get_current_doctor
from app.models import Doctor
from app.schemas.doctor_auth import DoctorLoginRequest

router = APIRouter(prefix="/api/doctor/auth", tags=["doctor-auth"])


def _serialize(doctor: Doctor) -> dict:
    return {
        "doctor_id": doctor.doctor_id,
        "full_name": doctor.full_name,
        "username": doctor.username,
        "email": doctor.email,
        "specialization": doctor.specialization,
    }


@router.post("/login")
def login(payload: DoctorLoginRequest, db: Session = Depends(get_db)):
    doctor = db.query(Doctor).filter(Doctor.username == payload.username).first()

    if not doctor or not verify_password(payload.password, doctor.password):
        return JSONResponse(
            status_code=401, content={"status": "error", "message": "Invalid credentials."}
        )
    if not doctor.is_active:
        return JSONResponse(
            status_code=403,
            content={"status": "error", "message": "Your account has been deactivated."},
        )

    doctor.last_login = datetime.utcnow()
    db.commit()

    token = create_doctor_token(doctor.doctor_id)
    resp = JSONResponse(content={"status": "success", "doctor": _serialize(doctor)})
    resp.set_cookie(
        key=DOCTOR_COOKIE_NAME,
        value=token,
        httponly=True,
        samesite="lax",
        secure=not settings.DEV_MODE,
        max_age=settings.JWT_EXPIRE_MINUTES * 60,
    )
    return resp


@router.post("/logout")
def logout():
    resp = JSONResponse(content={"status": "success"})
    resp.delete_cookie(DOCTOR_COOKIE_NAME)
    return resp


@router.get("/me")
def me(doctor: Doctor = Depends(get_current_doctor)):
    return {"status": "success", "doctor": _serialize(doctor)}
