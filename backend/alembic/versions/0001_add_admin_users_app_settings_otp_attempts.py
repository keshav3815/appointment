"""add admin_users, app_settings tables and otp_verification.attempts column

Purely additive migration: nothing on patients/appointments/payments/
csrf_tokens/otp_verification's existing columns is altered or dropped.

Revision ID: 0001
Revises:
Create Date: 2026-08-08

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# bcrypt hash of "admin123" — matches the "Default: admin / admin123" hint
# shown on the current PHP admin login page.
SEED_ADMIN_PASSWORD_HASH = "$2b$12$DyU1MOiB9cWaMQs0gZfve..b9G/fKSwTOHLkkndrPiRWAUNMW94Vm"


def upgrade() -> None:
    op.add_column(
        "otp_verification",
        sa.Column("attempts", sa.Integer(), nullable=False, server_default="0"),
    )

    op.create_table(
        "admin_users",
        sa.Column("admin_id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("username", sa.String(length=50), nullable=False, unique=True),
        sa.Column("password", sa.String(length=255), nullable=False),
        sa.Column("full_name", sa.String(length=120), nullable=False),
        sa.Column("email", sa.String(length=150), nullable=True),
        sa.Column(
            "role",
            sa.Enum("admin", "superadmin", name="admin_role"),
            nullable=False,
            server_default="admin",
        ),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("last_login", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        mysql_engine="InnoDB",
        mysql_charset="utf8mb4",
        mysql_collate="utf8mb4_unicode_ci",
    )

    op.create_table(
        "app_settings",
        sa.Column("setting_key", sa.String(length=100), primary_key=True),
        sa.Column("setting_value", sa.Text(), nullable=True),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            server_default=sa.func.now(),
            onupdate=sa.func.now(),
            nullable=False,
        ),
        mysql_engine="InnoDB",
        mysql_charset="utf8mb4",
        mysql_collate="utf8mb4_unicode_ci",
    )

    admin_users = sa.table(
        "admin_users",
        sa.column("username", sa.String),
        sa.column("password", sa.String),
        sa.column("full_name", sa.String),
        sa.column("role", sa.String),
        sa.column("is_active", sa.Boolean),
    )
    op.bulk_insert(
        admin_users,
        [
            {
                "username": "admin",
                "password": SEED_ADMIN_PASSWORD_HASH,
                "full_name": "Administrator",
                "role": "superadmin",
                "is_active": True,
            }
        ],
    )

    app_settings = sa.table(
        "app_settings",
        sa.column("setting_key", sa.String),
        sa.column("setting_value", sa.Text),
    )
    op.bulk_insert(
        app_settings,
        [
            {"setting_key": "smtp_host", "setting_value": "smtp.gmail.com"},
            {"setting_key": "smtp_port", "setting_value": "587"},
            {"setting_key": "smtp_username", "setting_value": ""},
            {"setting_key": "smtp_password", "setting_value": ""},
            {"setting_key": "smtp_from_email", "setting_value": ""},
            {"setting_key": "smtp_from_name", "setting_value": "Doctor Appointment System"},
            {"setting_key": "smtp_encryption", "setting_value": "tls"},
            {"setting_key": "dev_mode", "setting_value": "true"},
        ],
    )


def downgrade() -> None:
    op.drop_table("app_settings")
    op.drop_table("admin_users")
    op.drop_column("otp_verification", "attempts")
