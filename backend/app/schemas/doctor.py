from pydantic import BaseModel


class DoctorCardResponse(BaseModel):
    doctor_id: int
    full_name: str
    specialization: str | None
    qualification: str | None
    experience_years: int | None
    consultation_fee: float | None
    city: str | None
    clinic_name: str | None
    gender: str | None
    supports_clinic: bool
    supports_video: bool
    photo_url: str | None

    class Config:
        from_attributes = True


class DoctorProfileResponse(DoctorCardResponse):
    bio: str | None
    clinic_address: str | None
    available_days: str | None
    clinic_photos: list[str]

    class Config:
        from_attributes = True


class SlotsResponse(BaseModel):
    date: str
    available_days: list[str]
    is_available_day: bool
    slots: list[dict]
