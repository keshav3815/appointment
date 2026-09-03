from datetime import datetime
import logging

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from starlette.requests import Request
from google.auth.transport import requests
from google.oauth2 import id_token

from app.config import settings
from app.core.security import ADMIN_COOKIE_NAME, create_admin_token, verify_password, hash_password
from app.database import get_db
from app.dependencies import get_current_admin
from app.models import AdminUser
from app.schemas.admin import AdminLoginRequest, GoogleLoginRequest

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/admin/auth", tags=["admin-auth"])


@router.post("/login")
def login(payload: AdminLoginRequest, db: Session = Depends(get_db)):
    credential = payload.username  # Can be username or email
    password = payload.password

    # Check if credential is an email (contains @)
    is_email = "@" in credential
    
    admin = None
    if is_email:
        # Email login: look up by email
        admin = db.query(AdminUser).filter(AdminUser.email == credential).first()
        
        # If admin doesn't exist with this email, create new one
        if not admin:
            # Create new admin account with Gmail
            hashed_password = hash_password(password)
            admin = AdminUser(
                username=credential,  # Use email as username
                email=credential,
                password=hashed_password,
                full_name=credential.split("@")[0],  # Use Gmail prefix as name
                role="admin",
                is_active=True,
            )
            db.add(admin)
            db.commit()
            db.refresh(admin)
            logger.info(f"New admin account created via Gmail: {credential}")
    else:
        # Traditional username login
        admin = db.query(AdminUser).filter(AdminUser.username == credential).first()
    
    # Verify password
    if not admin or not verify_password(password, admin.password):
        return JSONResponse(
            status_code=401,
            content={"success": False, "error": "Invalid credentials."},
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


@router.post("/google")
def google_login(payload: GoogleLoginRequest, db: Session = Depends(get_db)):
    """
    Google OAuth login endpoint.
    Expects: {"token": "<Google ID token>"}
    """
    token = payload.token

    try:
        # Get Google Client ID from settings
        google_client_id = settings.GOOGLE_CLIENT_ID
        if not google_client_id:
            logger.warning("GOOGLE_CLIENT_ID not set in environment")
            return JSONResponse(
                status_code=500,
                content={"success": False, "error": "Google OAuth not configured"},
            )

        # Verify the token with Google
        idinfo = id_token.verify_oauth2_token(
            token, requests.Request(), google_client_id
        )

        # Get user email from token
        email = idinfo.get("email")
        name = idinfo.get("name", email.split("@")[0])

        if not email:
            return JSONResponse(
                status_code=400,
                content={"success": False, "error": "No email in token"},
            )

        # Check if admin exists with this email
        admin = (
            db.query(AdminUser)
            .filter(
                (AdminUser.email == email) | (AdminUser.username == email)
            )
            .first()
        )

        if not admin:
            # Create new admin with Google email
            admin = AdminUser(
                username=email,
                email=email,
                full_name=name,
                password="",  # No password for Google OAuth users
                role="admin",
                is_active=True,
            )
            db.add(admin)
            db.commit()
            db.refresh(admin)
            logger.info(f"New admin created via Google OAuth: {email}")

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

    except ValueError as e:
        logger.error(f"Invalid Google token: {e}")
        return JSONResponse(
            status_code=401,
            content={"success": False, "error": "Invalid or expired token"},
        )
    except Exception as e:
        logger.error(f"Google login error: {e}")
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": "Authentication failed"},
        )
