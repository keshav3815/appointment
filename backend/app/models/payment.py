from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, Enum, ForeignKey, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Payment(Base):
    __tablename__ = "payments"

    payment_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    appointment_id: Mapped[int] = mapped_column(
        ForeignKey("appointments.appointment_id", ondelete="CASCADE", onupdate="CASCADE"),
        index=True,
    )
    razorpay_order_id: Mapped[str | None] = mapped_column(String(100), unique=True, default=None)
    amount: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    currency: Mapped[str] = mapped_column(String(3), default="INR")
    payment_gateway: Mapped[str] = mapped_column(String(30), default="Razorpay")
    payment_status: Mapped[str] = mapped_column(
        Enum("Created", "Authorized", "Captured", "Failed", "Refunded", name="payment_status"),
        default="Created",
    )
    transaction_id: Mapped[str | None] = mapped_column(String(100), index=True, default=None)
    razorpay_signature: Mapped[str | None] = mapped_column(String(255), default=None)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    appointment: Mapped["Appointment"] = relationship(back_populates="payments")
