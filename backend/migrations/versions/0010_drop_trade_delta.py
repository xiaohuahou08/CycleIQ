"""Drop unused trades.delta column.

Revision ID: 0010_drop_trade_delta
Revises: 0009_total_capital_budget
"""

from typing import Sequence, Union

from alembic import op
from sqlalchemy import inspect

revision: str = "0010_drop_trade_delta"
down_revision: Union[str, None] = "0009_total_capital_budget"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    cols = {c["name"] for c in inspect(bind).get_columns("trades")}
    if "delta" in cols:
        op.drop_column("trades", "delta")


def downgrade() -> None:
    import sqlalchemy as sa

    bind = op.get_bind()
    cols = {c["name"] for c in inspect(bind).get_columns("trades")}
    if "delta" not in cols:
        op.add_column("trades", sa.Column("delta", sa.Numeric(precision=5, scale=3), nullable=True))
