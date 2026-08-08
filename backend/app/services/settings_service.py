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
    return {**_DEFAULTS, **{k: v for k, v in values.items() if v is not None}}


def get_setting(db: Session, key: str) -> str:
    row = db.get(AppSetting, key)
    if row is not None and row.setting_value is not None:
        return row.setting_value
    return _DEFAULTS.get(key, "")


def is_dev_mode(db: Session) -> bool:
    return get_setting(db, "dev_mode").lower() == "true"
