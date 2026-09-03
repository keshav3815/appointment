"""add doctors/doctor_photos tables, doctor_id + consultation_mode + doctor_remarks
on appointments, photo_url + password_hash on patients

Idempotent: guarded with inspector checks so it is safe to run both against a
fresh checkout (creates everything) and against a dev database that already
drifted ahead via a since-deleted migration (skips whatever already exists).
Nothing existing is altered or dropped — purely additive, no data loss.

Revision ID: 0002
Revises: 0001
Create Date: 2026-08-15

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

# revision identifiers, used by Alembic.
revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_table(bind, table: str) -> bool:
    return table in inspect(bind).get_table_names()


def _has_column(bind, table: str, column: str) -> bool:
    return column in [c["name"] for c in inspect(bind).get_columns(table)]


def upgrade() -> None:
    bind = op.get_bind()

    if not _has_table(bind, "doctors"):
        op.create_table(
            "doctors",
            sa.Column("doctor_id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("username", sa.String(length=50), nullable=False, unique=True),
            sa.Column("password", sa.String(length=255), nullable=False),
            sa.Column("full_name", sa.String(length=120), nullable=False),
            sa.Column("email", sa.String(length=150), nullable=True),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
            sa.Column("last_login", sa.DateTime(), nullable=True),
            sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
            mysql_engine="InnoDB",
            mysql_charset="utf8mb4",
            mysql_collate="utf8mb4_unicode_ci",
        )

    doctor_profile_columns = [
        ("specialization", sa.String(length=100), None),
        ("qualification", sa.String(length=150), None),
        ("experience_years", sa.SmallInteger(), "0"),
        ("bio", sa.Text(), None),
        ("consultation_fee", sa.Numeric(10, 2), "500"),
        ("clinic_name", sa.String(length=150), None),
        ("clinic_address", sa.String(length=255), None),
        ("city", sa.String(length=100), None),
        ("gender", sa.String(length=10), None),
        ("supports_clinic", sa.Boolean(), sa.true()),
        ("supports_video", sa.Boolean(), sa.false()),
        ("available_days", sa.String(length=50), sa.text("'Mon,Tue,Wed,Thu,Fri'")),
        ("photo_url", sa.String(length=255), None),
    ]
    for name, coltype, default in doctor_profile_columns:
        if not _has_column(bind, "doctors", name):
            op.add_column("doctors", sa.Column(name, coltype, nullable=True, server_default=default))

    if not _has_table(bind, "doctor_photos"):
        op.create_table(
            "doctor_photos",
            sa.Column("doctor_photo_id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column(
                "doctor_id",
                sa.Integer(),
                sa.ForeignKey("doctors.doctor_id", ondelete="CASCADE", onupdate="CASCADE"),
                nullable=False,
            ),
            sa.Column("photo_url", sa.String(length=255), nullable=False),
            sa.Column("sort_order", sa.SmallInteger(), nullable=False, server_default="0"),
            mysql_engine="InnoDB",
            mysql_charset="utf8mb4",
            mysql_collate="utf8mb4_unicode_ci",
        )
        op.create_index("ix_doctor_photos_doctor_id", "doctor_photos", ["doctor_id"])

    if not _has_column(bind, "appointments", "doctor_id"):
        op.add_column("appointments", sa.Column("doctor_id", sa.Integer(), nullable=True))
        op.create_index("ix_appointments_doctor_id", "appointments", ["doctor_id"])
    if not _has_column(bind, "appointments", "consultation_mode"):
        op.add_column(
            "appointments", sa.Column("consultation_mode", sa.String(length=10), nullable=True)
        )
    if not _has_column(bind, "appointments", "doctor_remarks"):
        op.add_column("appointments", sa.Column("doctor_remarks", sa.Text(), nullable=True))

    if not _has_column(bind, "patients", "photo_url"):
        op.add_column("patients", sa.Column("photo_url", sa.String(length=255), nullable=True))
    if not _has_column(bind, "patients", "password_hash"):
        op.add_column("patients", sa.Column("password_hash", sa.String(length=255), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()

    if _has_column(bind, "patients", "password_hash"):
        op.drop_column("patients", "password_hash")
    if _has_column(bind, "patients", "photo_url"):
        op.drop_column("patients", "photo_url")

    if _has_column(bind, "appointments", "doctor_remarks"):
        op.drop_column("appointments", "doctor_remarks")
    if _has_column(bind, "appointments", "consultation_mode"):
        op.drop_column("appointments", "consultation_mode")
    if _has_column(bind, "appointments", "doctor_id"):
        op.drop_index("ix_appointments_doctor_id", table_name="appointments")
        op.drop_column("appointments", "doctor_id")

    if _has_table(bind, "doctor_photos"):
        op.drop_table("doctor_photos")

    if _has_table(bind, "doctors"):
        op.drop_table("doctors")
