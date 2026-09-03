from datetime import date, datetime, time, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Appointment, Doctor, DoctorPhoto

router = APIRouter(prefix="/api/doctors", tags=["doctors"])

# Full 1-hour consultation slots across the working day, 09:00–21:00, with a
# 13:00–14:00 lunch break excluded — real, generated availability (not a
# hardcoded handful of arbitrary blocks), grouped client-side into Morning /
# Afternoon / Evening / Night bands for the time-slot picker. Each slot's
# stored value ("10:00 – 11:00") already carries both its start and end time.
_DAY_START = time(9, 0)
_DAY_END = time(20, 0)
_LUNCH_START = time(13, 0)
_LUNCH_END = time(14, 0)
_SLOT_MINUTES = 60


def _generate_time_slots() -> list[str]:
    slots: list[str] = []
    anchor = date.today()
    cur = datetime.combine(anchor, _DAY_START)
    end = datetime.combine(anchor, _DAY_END)
    while cur <= end:
        t = cur.time()
        if not (_LUNCH_START <= t < _LUNCH_END):
            slot_end = cur + timedelta(minutes=_SLOT_MINUTES)
            slots.append(f"{cur.strftime('%H:%M')} – {slot_end.strftime('%H:%M')}")
        cur += timedelta(minutes=_SLOT_MINUTES)
    return slots


TIME_SLOTS = _generate_time_slots()

WEEKDAY_CODES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]


def _card(doctor: Doctor) -> dict:
    return {
        "doctor_id": doctor.doctor_id,
        "full_name": doctor.full_name,
        "specialization": doctor.specialization,
        "qualification": doctor.qualification,
        "experience_years": doctor.experience_years,
        "consultation_fee": float(doctor.consultation_fee) if doctor.consultation_fee is not None else None,
        "city": doctor.city,
        "clinic_name": doctor.clinic_name,
        "gender": doctor.gender,
        "supports_clinic": doctor.supports_clinic,
        "supports_video": doctor.supports_video,
        "photo_url": doctor.photo_url,
    }


@router.get("")
def list_doctors(
    specialization: str | None = Query(None),
    city: str | None = Query(None),
    gender: str | None = Query(None),
    mode: str | None = Query(None, description="clinic or video"),
    min_experience: int | None = Query(None),
    max_fee: float | None = Query(None),
    sort: str | None = Query(None, description="fee_asc | fee_desc | experience_desc"),
    db: Session = Depends(get_db),
):
    q = db.query(Doctor).filter(Doctor.is_active.is_(True))

    if specialization:
        q = q.filter(Doctor.specialization.ilike(f"%{specialization}%"))
    if city:
        q = q.filter(Doctor.city.ilike(f"%{city}%"))
    if gender:
        q = q.filter(Doctor.gender == gender)
    if mode == "clinic":
        q = q.filter(Doctor.supports_clinic.is_(True))
    elif mode == "video":
        q = q.filter(Doctor.supports_video.is_(True))
    if min_experience is not None:
        q = q.filter(Doctor.experience_years >= min_experience)
    if max_fee is not None:
        q = q.filter(Doctor.consultation_fee <= max_fee)

    if sort == "fee_asc":
        q = q.order_by(Doctor.consultation_fee.asc())
    elif sort == "fee_desc":
        q = q.order_by(Doctor.consultation_fee.desc())
    elif sort == "experience_desc":
        q = q.order_by(Doctor.experience_years.desc())
    else:
        q = q.order_by(Doctor.full_name.asc())

    doctors = q.all()
    return {"status": "success", "doctors": [_card(d) for d in doctors]}


@router.get("/specializations")
def list_specializations(db: Session = Depends(get_db)):
    rows = (
        db.query(Doctor.specialization)
        .filter(Doctor.is_active.is_(True), Doctor.specialization.isnot(None))
        .distinct()
        .all()
    )
    return {"status": "success", "specializations": sorted({r[0] for r in rows if r[0]})}


@router.get("/{doctor_id}")
def get_doctor(doctor_id: int, db: Session = Depends(get_db)):
    doctor = db.get(Doctor, doctor_id)
    if not doctor or not doctor.is_active:
        raise HTTPException(status_code=404, detail="Doctor not found.")

    photos = (
        db.query(DoctorPhoto)
        .filter(DoctorPhoto.doctor_id == doctor_id)
        .order_by(DoctorPhoto.sort_order)
        .all()
    )

    return {
        "status": "success",
        "doctor": {
            **_card(doctor),
            "bio": doctor.bio,
            "clinic_address": doctor.clinic_address,
            "available_days": (doctor.available_days or "").split(",") if doctor.available_days else [],
            "clinic_photos": [p.photo_url for p in photos],
        },
    }


@router.get("/{doctor_id}/slots")
def get_doctor_slots(
    doctor_id: int,
    date_str: str = Query(..., alias="date"),
    mode: str | None = Query(None, description="clinic or video — kept as separate availability"),
    db: Session = Depends(get_db),
):
    doctor = db.get(Doctor, doctor_id)
    if not doctor or not doctor.is_active:
        raise HTTPException(status_code=404, detail="Doctor not found.")

    try:
        requested_date = datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid date format, expected YYYY-MM-DD.")

    if requested_date < date.today():
        raise HTTPException(status_code=422, detail="Date must be today or a future date.")

    available_days = [d.strip() for d in (doctor.available_days or "").split(",") if d.strip()]
    weekday_code = WEEKDAY_CODES[requested_date.weekday()]
    is_available_day = weekday_code in available_days

    # A clinic booking and a video booking at the same time never collide —
    # each consultation mode keeps its own independent set of taken slots —
    # so the booked-slot lookup is scoped to this mode wherever one is given.
    booked_query = db.query(Appointment.time_slot).filter(
        Appointment.doctor_id == doctor_id,
        Appointment.appointment_date == requested_date,
        Appointment.status != "Cancelled",
    )
    if mode:
        booked_query = booked_query.filter(Appointment.consultation_mode == mode)
    booked_slots = {row[0] for row in booked_query.all()}

    slots = [
        {"time_slot": slot, "available": is_available_day and slot not in booked_slots}
        for slot in TIME_SLOTS
    ]

    return {
        "status": "success",
        "date": date_str,
        "mode": mode,
        "available_days": available_days,
        "is_available_day": is_available_day,
        "slots": slots,
        "available_count": sum(1 for s in slots if s["available"]),
    }
