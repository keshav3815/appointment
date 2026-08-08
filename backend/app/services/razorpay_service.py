import time

import razorpay
from razorpay.errors import SignatureVerificationError

from app.config import settings


def _client() -> razorpay.Client:
    return razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))


def create_order(appointment_id: int, amount_paise: int, patient_name: str) -> dict:
    client = _client()
    return client.order.create(
        data={
            "amount": amount_paise,
            "currency": settings.CURRENCY,
            "receipt": f"APT_{appointment_id}_{int(time.time())}",
            "payment_capture": 1,
            "notes": {
                "appointment_id": str(appointment_id),
                "patient_name": patient_name,
            },
        }
    )


def verify_signature(order_id: str, payment_id: str, signature: str) -> bool:
    try:
        _client().utility.verify_payment_signature(
            {
                "razorpay_order_id": order_id,
                "razorpay_payment_id": payment_id,
                "razorpay_signature": signature,
            }
        )
        return True
    except SignatureVerificationError:
        return False
