"""Add prior_roll_premium_per_share to trades for accumulated roll premium tracking.

Revision ID: 0005_trade_prior_roll_premium
Revises: 0004_trade_cost_basis
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0005_trade_prior_roll_premium"
down_revision: Union[str, Sequence[str], None] = ("0004_trade_cost_basis", "0003_trade_lifecycle_dates")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "trades",
        sa.Column("prior_roll_premium_per_share", sa.Numeric(precision=10, scale=4), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("trades", "prior_roll_premium_per_share")
