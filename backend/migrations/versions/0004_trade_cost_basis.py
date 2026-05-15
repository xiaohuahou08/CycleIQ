"""Add fees_on_assignment and stock_cost_basis_per_share to trades.

Revision ID: 0004_trade_cost_basis
Revises: 0003_trade_commission_fee
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0004_trade_cost_basis"
down_revision: Union[str, None] = "0003_trade_commission_fee"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "trades",
        sa.Column("fees_on_assignment", sa.Numeric(precision=10, scale=2), nullable=True),
    )
    op.add_column(
        "trades",
        sa.Column("stock_cost_basis_per_share", sa.Numeric(precision=14, scale=4), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("trades", "stock_cost_basis_per_share")
    op.drop_column("trades", "fees_on_assignment")
