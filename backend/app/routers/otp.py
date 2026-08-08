import time

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from starlette.requests import Request

from app.database import get_db
from app.schemas.otp import SendOtpRequest, VerifyOtpRequest
from app.services import otp_service
from app.services.email_service import render_otp_email, send_mail
from app.services.settings_service import is_dev_mode

router = APIRouter(prefix="/api/otp", tags=["otp"])


@router.post("/send")
def send_otp(payload: SendOtpRequest, db: Session = Depends(get_db)):
    email = payload.email

    if otp_service.is_rate_limited(db, email):
        return JSONResponse(
            status_code=429,
            content={
                "status": "error",
                "message": "Too many OTP requests. Please try again after some time.",
            },
        )

    _, otp = otp_service.create_otp_record(db, email)

    email_sent = False
    try:
        html_body = render_otp_email(otp)
        send_mail(db, email, "Your Appointment Verification OTP", html_body)
        email_sent = True
    except Exception:
        pass

    response = {
        "status": "success",
        "message": (
            "OTP has been sent to your email address."
            if email_sent
            else "Email delivery failed. OTP auto-filled for testing."
        ),
    }
    if not email_sent and is_dev_mode(db):
        response["dev_otp"] = otp

    return response


@router.post("/verify")
def verify_otp(payload: VerifyOtpRequest, request: Request, db: Session = Depends(get_db)):
    success, message, status_code = otp_service.verify_otp(db, payload.email, payload.otp)

    if not success:
        return JSONResponse(status_code=status_code, content={"status": "error", "message": message})

    request.session["otp_verified"] = True
    request.session["otp_verified_email"] = payload.email
    request.session["otp_verified_at"] = time.time()

    return {"status": "success", "message": message}
