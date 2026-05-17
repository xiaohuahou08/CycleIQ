"""Add rolled_from_id FK to trades for chaining roll operations.

Revision ID: 0006_trade_rolled_from_id
Revises: 0005_trade_prior_roll_premium
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0006_trade_rolled_from_id"
down_revision: Union[str, None] = "0005_trade_prior_roll_premium"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "trades",
        sa.Column("rolled_from_id", sa.String(36), nullable=True),
    )
    op.create_index("ix_trades_rolled_from_id", "trades", ["rolled_from_id"])
    # FK constraint added where supported; SQLite ignores it but the index helps queries.
    with op.batch_alter_table("trades") as batch_op:
        batch_op.create_foreign_key(
            "fk_trades_rolled_from_id",
            "trades",
            ["rolled_from_id"],
            ["id"],
            ondelete="SET NULL",
        )


def downgrade() -> None:
    with op.batch_alter_table("trades") as batch_op:
        batch_op.drop_constraint("fk_trades_rolled_from_id", type_="foreignkey")
    op.drop_index("ix_trades_rolled_from_id", table_name="trades")
    op.drop_column("trades", "rolled_from_id")
