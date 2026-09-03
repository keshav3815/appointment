from datetime import date

from pydantic import BaseModel, field_validator


class DoctorLoginRequest(BaseModel):
    username: str
    password: str


class RescheduleAppointmentRequest(BaseModel):
    appointment_date: date
    time_slot: str
    remarks: str

    @field_validator("remarks")
    @classmethod
    def remarks_required(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 3:
            raise ValueError("remarks are required when rescheduling")
        return v

    @field_validator("appointment_date")
    @classmethod
    def not_past(cls, v: date) -> date:
        if v < date.today():
            raise ValueError("new date must be today or a future date")
        return v


class CancelAppointmentRequest(BaseModel):
    remarks: str

    @field_validator("remarks")
    @classmethod
    def remarks_required(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 3:
            raise ValueError("remarks are required when cancelling")
        return v
