import re
from datetime import date

from pydantic import BaseModel, EmailStr, field_validator

MOBILE_RE = re.compile(r"^[6-9]\d{9}$")


class PatientSignupRequest(BaseModel):
    full_name: str
    mobile: str
    email: EmailStr
    password: str
    gender: str
    dob: date

    @field_validator("full_name")
    @classmethod
    def not_blank(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 2:
            raise ValueError("full name is required")
        return v

    @field_validator("mobile")
    @classmethod
    def valid_mobile(cls, v: str) -> str:
        if not MOBILE_RE.match(v):
            raise ValueError("invalid 10-digit mobile number")
        return v

    @field_validator("password")
    @classmethod
    def valid_password(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("password must be at least 6 characters")
        return v

    @field_validator("gender")
    @classmethod
    def valid_gender(cls, v: str) -> str:
        if v not in ("Male", "Female", "Other"):
            raise ValueError("invalid gender selection")
        return v

    @field_validator("dob")
    @classmethod
    def dob_not_future(cls, v: date) -> date:
        if v > date.today():
            raise ValueError("invalid date of birth")
        return v


class PatientLoginRequest(BaseModel):
    email: EmailStr
    password: str


class PatientUpdateRequest(BaseModel):
    full_name: str | None = None
    mobile: str | None = None
    gender: str | None = None
    dob: date | None = None
    society: str | None = None
    city: str | None = None
    state: str | None = None

    @field_validator("mobile")
    @classmethod
    def valid_mobile(cls, v: str | None) -> str | None:
        if v is not None and not MOBILE_RE.match(v):
            raise ValueError("invalid 10-digit mobile number")
        return v


class ForgotPasswordResetRequest(BaseModel):
    email: EmailStr
    otp: str
    new_password: str
    confirm_password: str

    @field_validator("new_password")
    @classmethod
    def valid_password(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("password must be at least 6 characters")
        return v

    @field_validator("confirm_password")
    @classmethod
    def passwords_match(cls, v: str, info) -> str:
        if "new_password" in info.data and v != info.data["new_password"]:
            raise ValueError("passwords do not match")
        return v
