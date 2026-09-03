from datetime import datetime

from sqlalchemy import Boolean, DateTime, Numeric, SmallInteger, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Doctor(Base):
    __tablename__ = "doctors"

    doctor_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String(50), unique=True)
    password: Mapped[str] = mapped_column(String(255))
    full_name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str | None] = mapped_column(String(150), default=None)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    last_login: Mapped[datetime | None] = mapped_column(DateTime, default=None)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    specialization: Mapped[str | None] = mapped_column(String(100), default=None)
    qualification: Mapped[str | None] = mapped_column(String(150), default=None)
    experience_years: Mapped[int | None] = mapped_column(SmallInteger, default=0)
    bio: Mapped[str | None] = mapped_column(Text, default=None)
    consultation_fee: Mapped[float | None] = mapped_column(Numeric(10, 2), default=500)
    clinic_name: Mapped[str | None] = mapped_column(String(150), default=None)
    clinic_address: Mapped[str | None] = mapped_column(String(255), default=None)
    city: Mapped[str | None] = mapped_column(String(100), default=None)
    gender: Mapped[str | None] = mapped_column(String(10), default=None)
    supports_clinic: Mapped[bool] = mapped_column(Boolean, default=True)
    supports_video: Mapped[bool] = mapped_column(Boolean, default=False)
    available_days: Mapped[str | None] = mapped_column(String(50), default="Mon,Tue,Wed,Thu,Fri")
    photo_url: Mapped[str | None] = mapped_column(String(255), default=None)

    photos: Mapped[list["DoctorPhoto"]] = relationship(
        back_populates="doctor", cascade="all, delete-orphan", order_by="DoctorPhoto.sort_order"
    )
    appointments: Mapped[list["Appointment"]] = relationship(back_populates="doctor_ref")
