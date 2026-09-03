import secrets

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from starlette.requests import Request

from app.config import settings
from app.database import get_db
from app.models import Appointment, Doctor, Patient, Payment
from app.schemas.payment import CreatePaymentOrderRequest, DemoCompleteRequest, VerifyPaymentRequest
from app.services import razorpay_service
from app.services.email_service import render_confirmation_email, send_mail

router = APIRouter(prefix="/api", tags=["payments"])


@router.post("/payments/order")
def create_payment_order(
    payload: CreatePaymentOrderRequest, request: Request, db: Session = Depends(get_db)
):
    appointment_id = payload.appointment_id
    if appointment_id <= 0:
        return JSONResponse(
            status_code=422,
            content={"status": "error", "message": "Valid appointment ID is required."},
        )

    row = (
        db.query(Appointment, Patient)
        .join(Patient, Patient.patient_id == Appointment.patient_id)
        .filter(Appointment.appointment_id == appointment_id)
        .first()
    )
    if not row:
        return JSONResponse(
            status_code=404, content={"status": "error", "message": "Appointment not found."}
        )
    appointment, patient = row

    if appointment.payment_status == "Paid":
        return JSONResponse(
            status_code=409,
            content={"status": "error", "message": "This appointment has already been paid."},
        )

    existing = (
        db.query(Payment)
        .filter(Payment.appointment_id == appointment_id, Payment.payment_status == "Created")
        .order_by(Payment.created_at.desc())
        .first()
    )
    if existing and existing.razorpay_order_id:
        return {
            "status": "success",
            "order_id": existing.razorpay_order_id,
            "amount": int(existing.amount * 100),
            "currency": settings.CURRENCY,
            "key": settings.RAZORPAY_KEY_ID,
            "name": patient.full_name,
            "email": patient.email,
            "mobile": patient.mobile,
            "demo": settings.payment_demo_mode,
        }

    doctor = db.get(Doctor, appointment.doctor_id) if appointment.doctor_id else None
    amount_inr = float(doctor.consultation_fee) if doctor and doctor.consultation_fee else settings.CONSULTATION_FEE
    amount_paise = int(amount_inr * 100)

    if settings.payment_demo_mode:
        order = {"id": f"demo_order_{secrets.token_hex(10)}"}
    else:
        try:
            order = razorpay_service.create_order(appointment_id, amount_paise, patient.full_name)
        except Exception:
            return JSONResponse(
                status_code=502,
                content={"status": "error", "message": "Payment gateway error. Please try again."},
            )

        if not order.get("id"):
            return JSONResponse(
                status_code=502,
                content={"status": "error", "message": "Payment gateway error. Please try again."},
            )

    db.add(
        Payment(
            appointment_id=appointment_id,
            razorpay_order_id=order["id"],
            amount=amount_inr,
            currency=settings.CURRENCY,
            payment_gateway="Razorpay",
            payment_status="Created",
        )
    )
    db.commit()

    request.session["razorpay_order_id"] = order["id"]

    return {
        "status": "success",
        "order_id": order["id"],
        "amount": amount_paise,
        "currency": settings.CURRENCY,
        "key": settings.RAZORPAY_KEY_ID,
        "name": patient.full_name,
        "email": patient.email,
        "mobile": patient.mobile,
        "demo": settings.payment_demo_mode,
    }


def _finalize_payment(db: Session, request: Request, payment: Payment, transaction_id: str, signature: str | None):
    payment.transaction_id = transaction_id
    payment.razorpay_signature = signature
    payment.payment_status = "Captured"

    appointment = db.get(Appointment, payment.appointment_id)
    appointment.payment_status = "Paid"
    appointment.status = "Confirmed"

    db.commit()

    patient = db.get(Patient, appointment.patient_id)
    try:
        html_body = render_confirmation_email(
            {
                "appointment_id": appointment.appointment_id,
                "full_name": patient.full_name,
                "department": appointment.department,
                "doctor": appointment.doctor,
                "appointment_date": appointment.appointment_date.isoformat(),
                "time_slot": appointment.time_slot,
                "amount": f"{payment.amount:.2f}",
                "transaction_id": payment.transaction_id,
            }
        )
        send_mail(
            db,
            patient.email,
            f"Appointment Confirmed — #{appointment.appointment_id}",
            html_body,
        )
    except Exception:
        pass

    request.session["payment_verified"] = True
    request.session["transaction_id"] = transaction_id
    request.session["appointment_id"] = appointment.appointment_id


@router.post("/payments/verify")
def verify_payment(payload: VerifyPaymentRequest, request: Request, db: Session = Depends(get_db)):
    if not razorpay_service.verify_signature(
        payload.razorpay_order_id, payload.razorpay_payment_id, payload.razorpay_signature
    ):
        return JSONResponse(
            status_code=400,
            content={
                "status": "error",
                "message": "Payment verification failed. Signature mismatch.",
            },
        )

    payment = (
        db.query(Payment).filter(Payment.razorpay_order_id == payload.razorpay_order_id).first()
    )
    if not payment:
        return JSONResponse(
            status_code=404, content={"status": "error", "message": "Payment record not found."}
        )

    try:
        _finalize_payment(db, request, payment, payload.razorpay_payment_id, payload.razorpay_signature)
    except Exception:
        db.rollback()
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": "Failed to update payment records."},
        )

    return {
        "status": "success",
        "message": "Payment verified and appointment confirmed.",
        "redirect": "/success",
    }


@router.post("/payments/demo-complete")
def demo_complete_payment(payload: DemoCompleteRequest, request: Request, db: Session = Depends(get_db)):
    """Simulates a successful payment when no real Razorpay keys are configured
    (settings.payment_demo_mode). Lets the booking flow be demoed end-to-end
    without live credentials; automatically disabled once real keys are set."""
    if not settings.payment_demo_mode:
        return JSONResponse(
            status_code=403,
            content={"status": "error", "message": "Demo payment is disabled."},
        )

    payment = (
        db.query(Payment)
        .filter(Payment.appointment_id == payload.appointment_id, Payment.payment_status == "Created")
        .order_by(Payment.created_at.desc())
        .first()
    )
    if not payment:
        return JSONResponse(
            status_code=404, content={"status": "error", "message": "Payment record not found."}
        )

    try:
        _finalize_payment(db, request, payment, f"demo_pay_{secrets.token_hex(10)}", None)
    except Exception:
        db.rollback()
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": "Failed to update payment records."},
        )

    return {
        "status": "success",
        "message": "Demo payment completed and appointment confirmed.",
        "redirect": "/success",
    }


@router.get("/appointments/{appointment_id}/summary")
def get_appointment_summary(appointment_id: int, request: Request, db: Session = Depends(get_db)):
    if (
        request.session.get("appointment_id") != appointment_id
        or request.session.get("payment_verified") is not True
    ):
        return JSONResponse(
            status_code=403, content={"status": "error", "message": "Not authorized."}
        )

    row = (
        db.query(Appointment, Patient, Payment)
        .join(Patient, Patient.patient_id == Appointment.patient_id)
        .join(Payment, Payment.appointment_id == Appointment.appointment_id)
        .filter(Appointment.appointment_id == appointment_id)
        .order_by(Payment.created_at.desc())
        .first()
    )
    if not row:
        return JSONResponse(
            status_code=404,
            content={"status": "error", "message": "Appointment details not found."},
        )
    appointment, patient, payment = row
    doctor = db.get(Doctor, appointment.doctor_id) if appointment.doctor_id else None

    video_link = (
        f"{settings.FRONTEND_ORIGIN.rstrip('/')}/video/{appointment.appointment_id}"
        if appointment.consultation_mode == "video"
        else None
    )

    data = {
        "appointment_id": appointment.appointment_id,
        "department": appointment.department,
        "doctor": appointment.doctor or "Any Available",
        "consultation_mode": appointment.consultation_mode,
        "clinic_address": doctor.clinic_address if doctor and appointment.consultation_mode == "clinic" else None,
        "video_link": video_link,
        "appointment_date": appointment.appointment_date.isoformat(),
        "time_slot": appointment.time_slot,
        "appointment_type": appointment.appointment_type,
        "reason": appointment.reason,
        "status": appointment.status,
        "apt_payment_status": appointment.payment_status,
        "full_name": patient.full_name,
        "email": patient.email,
        "mobile": patient.mobile,
        "gender": patient.gender,
        "age": patient.age,
        "transaction_id": payment.transaction_id,
        "amount": f"{payment.amount:.2f}",
        "pay_status": payment.payment_status,
        "razorpay_order_id": payment.razorpay_order_id,
    }

    for key in ("otp_verified", "otp_verified_email", "otp_verified_at", "razorpay_order_id", "payment_verified"):
        request.session.pop(key, None)

    return {"status": "success", "appointment": data}
