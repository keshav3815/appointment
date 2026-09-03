from datetime import date, datetime

from sqlalchemy import Date, DateTime, Enum, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Appointment(Base):
    __tablename__ = "appointments"

    appointment_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    patient_id: Mapped[int] = mapped_column(
        ForeignKey("patients.patient_id", ondelete="CASCADE", onupdate="CASCADE"),
        index=True,
    )
    department: Mapped[str] = mapped_column(String(100))
    doctor: Mapped[str | None] = mapped_column(String(120), default=None)
    doctor_id: Mapped[int | None] = mapped_column(
        ForeignKey("doctors.doctor_id", ondelete="SET NULL", onupdate="CASCADE"),
        default=None,
        index=True,
    )
    consultation_mode: Mapped[str | None] = mapped_column(String(10), default=None)
    appointment_date: Mapped[date] = mapped_column(Date, index=True)
    time_slot: Mapped[str] = mapped_column(String(30))
    appointment_type: Mapped[str] = mapped_column(
        Enum("New", "Follow-up", name="appointment_type"), default="New"
    )
    reason: Mapped[str] = mapped_column(String(255))
    symptoms: Mapped[str | None] = mapped_column(Text, default=None)
    duration: Mapped[str | None] = mapped_column(String(50), default=None)
    status: Mapped[str] = mapped_column(
        Enum("Pending", "Confirmed", "Cancelled", "Completed", name="appointment_status"),
        default="Pending",
        index=True,
    )
    payment_status: Mapped[str] = mapped_column(
        Enum("Unpaid", "Paid", "Failed", "Refunded", name="appointment_payment_status"),
        default="Unpaid",
    )
    doctor_remarks: Mapped[str | None] = mapped_column(Text, default=None)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    patient: Mapped["Patient"] = relationship(back_populates="appointments")
    payments: Mapped[list["Payment"]] = relationship(back_populates="appointment")
    doctor_ref: Mapped["Doctor | None"] = relationship(back_populates="appointments")
