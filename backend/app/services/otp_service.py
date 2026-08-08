import secrets
from datetime import datetime, timedelta

from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

from app.config import settings
from app.models import OtpVerification

RATE_LIMIT_PER_HOUR = 5
LOCKOUT_ATTEMPTS = 5
LOCKOUT_WINDOW_MINUTES = 15


def generate_otp() -> str:
    return f"{secrets.randbelow(900000) + 100000:06d}"


def db_now(db: Session) -> datetime:
    return db.execute(select(func.now())).scalar()


def is_rate_limited(db: Session, email: str) -> bool:
    count = (
        db.query(OtpVerification)
        .filter(
            OtpVerification.email == email,
            text("created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)"),
        )
        .count()
    )
    return count >= RATE_LIMIT_PER_HOUR


def create_otp_record(db: Session, email: str) -> tuple[OtpVerification, str]:
    db.query(OtpVerification).filter(
        OtpVerification.email == email, OtpVerification.is_verified.is_(False)
    ).delete(synchronize_session=False)

    otp = generate_otp()
    expiry = db_now(db) + timedelta(minutes=settings.OTP_EXPIRY)

    record = OtpVerification(email=email, otp_code=otp, expiry_time=expiry)
    db.add(record)
    db.commit()
    db.refresh(record)

    return record, otp


def is_locked_out(db: Session, email: str) -> bool:
    count = (
        db.query(OtpVerification)
        .filter(
            OtpVerification.email == email,
            OtpVerification.is_verified.is_(False),
            OtpVerification.attempts >= LOCKOUT_ATTEMPTS,
            text(f"created_at > DATE_SUB(NOW(), INTERVAL {LOCKOUT_WINDOW_MINUTES} MINUTE)"),
        )
        .count()
    )
    return count > 0


def verify_otp(db: Session, email: str, otp: str) -> tuple[bool, str, int]:
    """Returns (success, message, http_status_code) mirroring verify_otp.php exactly."""
    if is_locked_out(db, email):
        return False, "Too many wrong attempts. Please request a new OTP.", 429

    record = (
        db.query(OtpVerification)
        .filter(OtpVerification.email == email, OtpVerification.is_verified.is_(False))
        .order_by(OtpVerification.created_at.desc())
        .first()
    )

    if not record:
        return False, "No OTP found. Please request a new one.", 400

    if db_now(db) > record.expiry_time:
        db.delete(record)
        db.commit()
        return False, "OTP has expired. Please request a new one.", 400

    if not secrets.compare_digest(record.otp_code, otp):
        record.attempts += 1
        db.commit()

        attempts_left = LOCKOUT_ATTEMPTS - record.attempts
        message = (
            f"Invalid OTP. {attempts_left} attempt(s) remaining."
            if attempts_left > 0
            else "Too many wrong attempts. Please request a new OTP."
        )
        return False, message, 400

    record.is_verified = True
    db.commit()

    return True, "Email verified successfully.", 200
