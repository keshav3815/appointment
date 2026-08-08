from pydantic import BaseModel, field_validator

ALLOWED_FIELD_VALUES = {
    "status": {"Pending", "Confirmed", "Cancelled", "Completed"},
    "payment_status": {"Unpaid", "Paid", "Failed", "Refunded"},
}


class PatchAppointmentRequest(BaseModel):
    field: str
    value: str

    @field_validator("field")
    @classmethod
    def valid_field(cls, v: str) -> str:
        if v not in ALLOWED_FIELD_VALUES:
            raise ValueError("invalid field")
        return v

    def validate_value(self) -> bool:
        return self.value in ALLOWED_FIELD_VALUES.get(self.field, set())
