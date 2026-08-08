from fastapi import APIRouter

from app.config import settings

router = APIRouter(prefix="/api", tags=["config"])


@router.get("/config/public")
def get_public_config():
    return {
        "consultation_fee": settings.CONSULTATION_FEE,
        "currency": settings.CURRENCY,
        "payment_demo_mode": settings.payment_demo_mode,
    }
