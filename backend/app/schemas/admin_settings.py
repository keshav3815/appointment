from pydantic import BaseModel, EmailStr, field_validator


class AddAdminRequest(BaseModel):
    username: str
    password: str
    full_name: str
    email: EmailStr | None = None
    role: str = "admin"

    @field_validator("role")
    @classmethod
    def valid_role(cls, v: str) -> str:
        return v if v in ("admin", "superadmin") else "admin"


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str
    confirm_password: str


class SmtpSettingsRequest(BaseModel):
    smtp_host: str
    smtp_port: int
    smtp_username: str
    smtp_password: str
    smtp_from_email: str
    smtp_from_name: str
    smtp_encryption: str
    dev_mode: bool
