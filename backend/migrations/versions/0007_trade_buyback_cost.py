"""Add buyback_cost_per_share to trades for tracking roll debit costs.

When a position is rolled, the cost paid to close the original leg (buy-to-close)
must be stored so that the net roll cashflow (premium collected − buyback paid)
can be correctly applied to realized P&L and stock cost-basis reduction.

Revision ID: 0007_trade_buyback_cost
Revises: 0006_trade_rolled_from_id
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0007_trade_buyback_cost"
down_revision: Union[str, None] = "0006_trade_rolled_from_id"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "trades",
        sa.Column("buyback_cost_per_share", sa.Numeric(precision=10, scale=4), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("trades", "buyback_cost_per_share")
