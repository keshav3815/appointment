from datetime import datetime

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from starlette.requests import Request

from app.config import settings
from app.core.security import ADMIN_COOKIE_NAME, create_admin_token, verify_password
from app.database import get_db
from app.dependencies import get_current_admin
from app.models import AdminUser
from app.schemas.admin import AdminLoginRequest

router = APIRouter(prefix="/api/admin/auth", tags=["admin-auth"])


@router.post("/login")
def login(payload: AdminLoginRequest, db: Session = Depends(get_db)):
    admin = db.query(AdminUser).filter(AdminUser.username == payload.username).first()

    if not admin or not verify_password(payload.password, admin.password):
        return JSONResponse(
            status_code=401,
            content={"success": False, "error": "Invalid username or password."},
        )

    if not admin.is_active:
        return JSONResponse(
            status_code=403,
            content={
                "success": False,
                "error": "Your account has been deactivated. Contact super admin.",
            },
        )

    admin.last_login = datetime.utcnow()
    db.commit()

    token = create_admin_token(admin.admin_id, admin.role)

    resp = JSONResponse(
        content={
            "success": True,
            "admin": {"id": admin.admin_id, "name": admin.full_name, "role": admin.role},
        }
    )
    resp.set_cookie(
        key=ADMIN_COOKIE_NAME,
        value=token,
        httponly=True,
        samesite="lax",
        secure=not settings.DEV_MODE,
        max_age=settings.JWT_EXPIRE_MINUTES * 60,
    )
    return resp


@router.post("/logout")
def logout():
    resp = JSONResponse(content={"success": True})
    resp.delete_cookie(ADMIN_COOKIE_NAME)
    return resp


@router.get("/me")
def me(admin: AdminUser = Depends(get_current_admin)):
    return {
        "success": True,
        "admin": {"id": admin.admin_id, "name": admin.full_name, "role": admin.role},
    }
