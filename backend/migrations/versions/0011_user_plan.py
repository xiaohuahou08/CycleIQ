"""Add plan column to user_preferences (basic | premium).

Revision ID: 0011_user_plan
Revises: 0010_drop_trade_delta
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0011_user_plan"
down_revision: Union[str, None] = "0010_drop_trade_delta"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "user_preferences",
        sa.Column("plan", sa.String(length=20), nullable=False, server_default="basic"),
    )


def downgrade() -> None:
    op.drop_column("user_preferences", "plan")
