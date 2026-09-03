"""add partial unique index locking appointment slots

Enforces the real "one seat, one booking" guarantee at the database level:
no two non-cancelled appointments can share the same
(doctor_id, appointment_date, consultation_mode, time_slot). This is what
makes concurrent double-booking attempts safe even when two requests race
past the application-level pre-check at the same instant — the database
itself rejects the second INSERT.

SQLite-only (partial/filtered unique index syntax); guarded with
IF NOT EXISTS / IF EXISTS so it's safe to re-run.

Revision ID: 0003
Revises: 0002
Create Date: 2026-08-16

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0003"
down_revision: Union[str, None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

INDEX_NAME = "ux_appointments_slot_lock"


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "sqlite":
        bind.execute(
            sa.text(
                f"CREATE UNIQUE INDEX IF NOT EXISTS {INDEX_NAME} "
                "ON appointments (doctor_id, appointment_date, consultation_mode, time_slot) "
                "WHERE status != 'Cancelled' AND doctor_id IS NOT NULL"
            )
        )


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "sqlite":
        bind.execute(sa.text(f"DROP INDEX IF EXISTS {INDEX_NAME}"))
