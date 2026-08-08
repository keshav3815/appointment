from pydantic import BaseModel


class CreatePaymentOrderRequest(BaseModel):
    appointment_id: int


class VerifyPaymentRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


class DemoCompleteRequest(BaseModel):
    appointment_id: int
