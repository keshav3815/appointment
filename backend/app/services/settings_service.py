from sqlalchemy.orm import Session

from app.config import settings
from app.models import AppSetting

_DEFAULTS = {
    "smtp_host": "smtp.gmail.com",
    "smtp_port": "587",
    "smtp_username": "",
    "smtp_password": "",
    "smtp_from_email": "",
    "smtp_from_name": "Doctor Appointment System",
    "smtp_encryption": "tls",
    "dev_mode": "true" if settings.DEV_MODE else "false",
}


def get_all_settings(db: Session) -> dict[str, str]:
    rows = db.query(AppSetting).all()
    values = {row.setting_key: row.setting_value for row in rows}
    merged = {**_DEFAULTS, **{k: v for k, v in values.items() if v is not None}}

    # Allow environment (.env via pydantic BaseSettings) to override SMTP without DB
    from app.config import settings

    if settings.SMTP_HOST:
        merged["smtp_host"] = settings.SMTP_HOST
    if settings.SMTP_PORT:
        merged["smtp_port"] = str(settings.SMTP_PORT)
    if settings.SMTP_USERNAME:
        merged["smtp_username"] = settings.SMTP_USERNAME
    if settings.SMTP_PASSWORD:
        merged["smtp_password"] = settings.SMTP_PASSWORD
    if settings.SMTP_FROM_EMAIL:
        merged["smtp_from_email"] = settings.SMTP_FROM_EMAIL
    if settings.SMTP_FROM_NAME:
        merged["smtp_from_name"] = settings.SMTP_FROM_NAME
    if settings.SMTP_ENCRYPTION:
        merged["smtp_encryption"] = settings.SMTP_ENCRYPTION

    return merged


def get_setting(db: Session, key: str) -> str:
    row = db.get(AppSetting, key)
    if row is not None and row.setting_value is not None:
        return row.setting_value
    return _DEFAULTS.get(key, "")


def is_dev_mode(db: Session) -> bool:
    return get_setting(db, "dev_mode").lower() == "true"
