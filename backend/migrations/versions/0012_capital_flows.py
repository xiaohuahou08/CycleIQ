"""Add capital_flows for budget deposit/withdrawal history.

Revision ID: 0012_capital_flows
Revises: 0011_user_plan
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0012_capital_flows"
down_revision: Union[str, None] = "0011_user_plan"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "capital_flows",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("event_date", sa.Date(), nullable=False),
        sa.Column("amount", sa.Numeric(14, 2), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_capital_flows_user_id", "capital_flows", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_capital_flows_user_id", table_name="capital_flows")
    op.drop_table("capital_flows")
