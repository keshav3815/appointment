import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape
from sqlalchemy.orm import Session

from app.config import settings
from app.services.settings_service import get_all_settings

TEMPLATES_DIR = Path(__file__).resolve().parent.parent / "templates" / "email"

_jinja_env = Environment(
    loader=FileSystemLoader(str(TEMPLATES_DIR)),
    autoescape=select_autoescape(["html"]),
)


def render_otp_email(otp: str) -> str:
    template = _jinja_env.get_template("otp_email.html")
    return template.render(otp=otp, otp_expiry=settings.OTP_EXPIRY)


def render_confirmation_email(data: dict) -> str:
    template = _jinja_env.get_template("confirmation_email.html")
    return template.render(
        appointment_id=data.get("appointment_id", ""),
        full_name=data.get("full_name", ""),
        department=data.get("department", ""),
        doctor=data.get("doctor") or "Any Available",
        appointment_date=data.get("appointment_date", ""),
        time_slot=data.get("time_slot", ""),
        amount=data.get("amount", ""),
        transaction_id=data.get("transaction_id", ""),
    )


def send_mail(db: Session, to_email: str, subject: str, html_body: str) -> None:
    """Send an HTML email via SMTP. Raises on failure — caller decides fallback behavior."""
    smtp = get_all_settings(db)

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{smtp['smtp_from_name']} <{smtp['smtp_from_email']}>"
    msg["To"] = to_email
    msg.attach(MIMEText(html_body, "html", "utf-8"))

    port = int(smtp["smtp_port"])
    with smtplib.SMTP(smtp["smtp_host"], port, timeout=15) as server:
        if smtp["smtp_encryption"] == "tls":
            server.starttls()
        if smtp["smtp_username"]:
            server.login(smtp["smtp_username"], smtp["smtp_password"])
        server.sendmail(smtp["smtp_from_email"], [to_email], msg.as_string())
