"""Drop unused capital_flows table (Settings UI and API removed).

Revision ID: 0016_drop_capital_flows
Revises: 0015_screener_config
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0016_drop_capital_flows"
down_revision: Union[str, None] = "0015_screener_config"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("DROP TABLE IF EXISTS capital_flows")


def downgrade() -> None:
    op.create_table(
        "capital_flows",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("event_date", sa.Date(), nullable=False),
        sa.Column("amount", sa.Numeric(precision=14, scale=2), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_capital_flows_user_id", "capital_flows", ["user_id"])
