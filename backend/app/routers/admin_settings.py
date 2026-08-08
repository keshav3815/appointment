import platform

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.security import hash_password, verify_password
from app.database import get_db
from app.dependencies import get_current_admin, require_superadmin
from app.models import AdminUser, AppSetting
from app.schemas.admin_settings import AddAdminRequest, ChangePasswordRequest, SmtpSettingsRequest
from app.services.settings_service import get_all_settings

router = APIRouter(prefix="/api/admin/settings", tags=["admin-settings"])


@router.get("/admins", dependencies=[Depends(require_superadmin)])
def list_admins(db: Session = Depends(get_db)):
    admins = db.query(AdminUser).order_by(AdminUser.admin_id).all()
    return {
        "success": True,
        "admins": [
            {
                "admin_id": a.admin_id,
                "username": a.username,
                "full_name": a.full_name,
                "email": a.email,
                "role": a.role,
                "last_login": a.last_login.isoformat() if a.last_login else None,
                "created_at": a.created_at.isoformat(),
            }
            for a in admins
        ],
    }


@router.post("/admins", dependencies=[Depends(require_superadmin)])
def add_admin(payload: AddAdminRequest, db: Session = Depends(get_db)):
    existing = db.query(AdminUser).filter(AdminUser.username == payload.username).first()
    if existing:
        return JSONResponse(
            status_code=409,
            content={"success": False, "error": f"Username '{payload.username}' already exists."},
        )

    admin = AdminUser(
        username=payload.username,
        password=hash_password(payload.password),
        full_name=payload.full_name,
        email=payload.email,
        role=payload.role,
    )
    db.add(admin)
    db.commit()

    return {"success": True, "message": f"Admin user '{payload.username}' created successfully."}


@router.delete("/admins/{admin_id}")
def delete_admin(
    admin_id: int,
    db: Session = Depends(get_db),
    current_admin: AdminUser = Depends(require_superadmin),
):
    if admin_id == current_admin.admin_id:
        return JSONResponse(
            status_code=400, content={"success": False, "error": "Cannot delete your own account."}
        )

    admin = db.get(AdminUser, admin_id)
    if not admin:
        return JSONResponse(status_code=404, content={"success": False, "error": "Admin not found."})

    db.delete(admin)
    db.commit()

    return {"success": True, "message": "Admin user deleted."}


@router.post("/change-password")
def change_password(
    payload: ChangePasswordRequest,
    db: Session = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin),
):
    if not verify_password(payload.current_password, admin.password):
        return JSONResponse(
            status_code=400, content={"success": False, "error": "Current password is incorrect."}
        )
    if len(payload.new_password) < 6:
        return JSONResponse(
            status_code=422,
            content={"success": False, "error": "New password must be at least 6 characters."},
        )
    if payload.new_password != payload.confirm_password:
        return JSONResponse(
            status_code=422, content={"success": False, "error": "Passwords do not match."}
        )

    admin.password = hash_password(payload.new_password)
    db.commit()

    return {"success": True, "message": "Password changed successfully."}


@router.get("/smtp", dependencies=[Depends(require_superadmin)])
def get_smtp_settings(db: Session = Depends(get_db)):
    settings_map = get_all_settings(db)
    return {
        "success": True,
        "settings": {
            "smtp_host": settings_map["smtp_host"],
            "smtp_port": int(settings_map["smtp_port"]),
            "smtp_username": settings_map["smtp_username"],
            "smtp_password": settings_map["smtp_password"],
            "smtp_from_email": settings_map["smtp_from_email"],
            "smtp_from_name": settings_map["smtp_from_name"],
            "smtp_encryption": settings_map["smtp_encryption"],
            "dev_mode": settings_map["dev_mode"].lower() == "true",
        },
    }


@router.put("/smtp", dependencies=[Depends(require_superadmin)])
def update_smtp_settings(payload: SmtpSettingsRequest, db: Session = Depends(get_db)):
    values = {
        "smtp_host": payload.smtp_host,
        "smtp_port": str(payload.smtp_port),
        "smtp_username": payload.smtp_username,
        "smtp_password": payload.smtp_password,
        "smtp_from_email": payload.smtp_from_email,
        "smtp_from_name": payload.smtp_from_name,
        "smtp_encryption": payload.smtp_encryption,
        "dev_mode": "true" if payload.dev_mode else "false",
    }
    for key, value in values.items():
        row = db.get(AppSetting, key)
        if row:
            row.setting_value = value
        else:
            db.add(AppSetting(setting_key=key, setting_value=value))
    db.commit()

    return {"success": True, "message": "SMTP settings updated."}


@router.get("/system-info", dependencies=[Depends(require_superadmin)])
def get_system_info(db: Session = Depends(get_db)):
    mysql_version = db.execute(text("SELECT VERSION()")).scalar()
    dev_mode = get_all_settings(db)["dev_mode"].lower() == "true"

    return {
        "success": True,
        "info": {
            "python_version": platform.python_version(),
            "mysql_version": mysql_version,
            "dev_mode": dev_mode,
        },
    }
