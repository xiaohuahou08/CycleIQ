"""Add commission_fee to trades.

Revision ID: 0003_trade_commission_fee
Revises: 0002_trade_expire_fields
Create Date: 2026-04-29
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0003_trade_commission_fee"
down_revision: Union[str, None] = "0002_trade_expire_fields"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("trades", sa.Column("commission_fee", sa.Numeric(10, 2), nullable=True))


def downgrade() -> None:
    op.drop_column("trades", "commission_fee")
