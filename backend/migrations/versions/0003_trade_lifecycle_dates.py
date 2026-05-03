"""Add lifecycle event dates for trades.

Revision ID: 0003_trade_lifecycle_dates
Revises: 0002_trade_expire_fields
Create Date: 2026-05-03
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0003_trade_lifecycle_dates"
down_revision: Union[str, None] = "0002_trade_expire_fields"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("trades", sa.Column("closed_at", sa.Date(), nullable=True))
    op.add_column("trades", sa.Column("assigned_at", sa.Date(), nullable=True))
    op.add_column("trades", sa.Column("called_away_at", sa.Date(), nullable=True))
    op.add_column("trades", sa.Column("rolled_at", sa.Date(), nullable=True))


def downgrade() -> None:
    op.drop_column("trades", "rolled_at")
    op.drop_column("trades", "called_away_at")
    op.drop_column("trades", "assigned_at")
    op.drop_column("trades", "closed_at")
