from sqlalchemy import ForeignKey, SmallInteger, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class DoctorPhoto(Base):
    __tablename__ = "doctor_photos"

    doctor_photo_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    doctor_id: Mapped[int] = mapped_column(
        ForeignKey("doctors.doctor_id", ondelete="CASCADE", onupdate="CASCADE"), index=True
    )
    photo_url: Mapped[str] = mapped_column(String(255))
    sort_order: Mapped[int] = mapped_column(SmallInteger, default=0)

    doctor: Mapped["Doctor"] = relationship(back_populates="photos")
