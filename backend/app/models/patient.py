from datetime import date, datetime

from sqlalchemy import Date, DateTime, Enum, SmallInteger, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Patient(Base):
    __tablename__ = "patients"

    patient_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    full_name: Mapped[str] = mapped_column(String(120))
    mobile: Mapped[str] = mapped_column(String(15), index=True)
    email: Mapped[str] = mapped_column(String(150), index=True)
    gender: Mapped[str] = mapped_column(Enum("Male", "Female", "Other", name="patient_gender"))
    dob: Mapped[date] = mapped_column(Date)
    age: Mapped[int] = mapped_column(SmallInteger)
    society: Mapped[str | None] = mapped_column(String(200), default=None)
    city: Mapped[str | None] = mapped_column(String(100), default=None)
    state: Mapped[str | None] = mapped_column(String(100), default=None)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    appointments: Mapped[list["Appointment"]] = relationship(back_populates="patient")
