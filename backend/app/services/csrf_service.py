import secrets
from datetime import datetime, timedelta

from sqlalchemy.orm import Session
from starlette.requests import Request

from app.models import CsrfToken

CSRF_TOKEN_TTL = timedelta(hours=1)


def generate_csrf_token(request: Request, db: Session) -> str:
    token = secrets.token_hex(32)
    request.session["csrf_token"] = token

    db.add(CsrfToken(token=token, expires_at=datetime.utcnow() + CSRF_TOKEN_TTL))
    db.commit()

    return token


def validate_csrf_token(request: Request, db: Session, token: str) -> bool:
    if not token:
        return False

    session_token = request.session.get("csrf_token")
    if not session_token or not secrets.compare_digest(session_token, token):
        return False

    row = (
        db.query(CsrfToken)
        .filter(CsrfToken.token == token, CsrfToken.expires_at > datetime.utcnow())
        .first()
    )
    return row is not None
