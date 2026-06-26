"""Add total_capital_budget to user_preferences.

Revision ID: 0009_total_capital_budget
Revises: 0008_user_preferences
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0009_total_capital_budget"
down_revision: Union[str, None] = "0008_user_preferences"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "user_preferences",
        sa.Column(
            "total_capital_budget",
            sa.Numeric(precision=14, scale=2),
            nullable=False,
            server_default="10000",
        ),
    )


def downgrade() -> None:
    op.drop_column("user_preferences", "total_capital_budget")
