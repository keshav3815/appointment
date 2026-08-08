from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from starlette.requests import Request

from app.database import get_db
from app.services.csrf_service import generate_csrf_token

router = APIRouter(prefix="/api", tags=["csrf"])


@router.get("/csrf-token")
def get_csrf_token(request: Request, db: Session = Depends(get_db)):
    return {"csrf_token": generate_csrf_token(request, db)}
