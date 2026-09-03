import re
from datetime import date

from pydantic import BaseModel, EmailStr, field_validator

MOBILE_RE = re.compile(r"^[6-9]\d{9}$")


class CreateAppointmentRequest(BaseModel):
    csrf_token: str
    full_name: str
    mobile: str
    email: EmailStr
    gender: str
    dob: date
    department: str
    doctor: str | None = None
    doctor_id: int | None = None
    consultation_mode: str | None = None
    appointment_date: date
    time_slot: str
    appointment_type: str
    reason: str
    symptoms: str | None = ""
    duration: str | None = ""
    society: str | None = ""
    city: str | None = ""
    state: str | None = ""

    @field_validator("full_name", "department", "time_slot", "reason")
    @classmethod
    def not_blank(cls, v: str, info) -> str:
        v = v.strip()
        if not v:
            raise ValueError(f"{info.field_name.replace('_', ' ')} is required")
        return v

    @field_validator("mobile")
    @classmethod
    def valid_mobile(cls, v: str) -> str:
        if not MOBILE_RE.match(v):
            raise ValueError("invalid 10-digit mobile number")
        return v

    @field_validator("gender")
    @classmethod
    def valid_gender(cls, v: str) -> str:
        if v not in ("Male", "Female", "Other"):
            raise ValueError("invalid gender selection")
        return v

    @field_validator("appointment_type")
    @classmethod
    def valid_appointment_type(cls, v: str) -> str:
        if v not in ("New", "Follow-up"):
            raise ValueError("invalid appointment type")
        return v

    @field_validator("consultation_mode")
    @classmethod
    def valid_consultation_mode(cls, v: str | None) -> str | None:
        if v is not None and v not in ("clinic", "video"):
            raise ValueError("invalid consultation mode")
        return v

    @field_validator("dob")
    @classmethod
    def dob_not_future(cls, v: date) -> date:
        if v > date.today():
            raise ValueError("invalid date of birth")
        return v

    @field_validator("appointment_date")
    @classmethod
    def appointment_date_not_past(cls, v: date) -> date:
        if v < date.today():
            raise ValueError("appointment date must be today or a future date")
        return v
