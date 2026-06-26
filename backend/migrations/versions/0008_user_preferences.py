"""Add user_preferences for per-user trading defaults.

Revision ID: 0008_user_preferences
Revises: 0007_trade_buyback_cost
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0008_user_preferences"
down_revision: Union[str, None] = "0007_trade_buyback_cost"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "user_preferences",
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("commission_per_contract", sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column("default_contracts", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("default_dte", sa.Integer(), nullable=False, server_default="45"),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("user_id"),
    )


def downgrade() -> None:
    op.drop_table("user_preferences")
