"""Add Stripe billing columns to user_preferences.

Revision ID: 0013_stripe_billing
Revises: 0012_capital_flows
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0013_stripe_billing"
down_revision: Union[str, None] = "0012_capital_flows"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "user_preferences",
        sa.Column("stripe_customer_id", sa.String(length=255), nullable=True),
    )
    op.add_column(
        "user_preferences",
        sa.Column("stripe_subscription_id", sa.String(length=255), nullable=True),
    )
    op.add_column(
        "user_preferences",
        sa.Column("subscription_status", sa.String(length=50), nullable=True),
    )
    op.add_column(
        "user_preferences",
        sa.Column("current_period_end", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("user_preferences", "current_period_end")
    op.drop_column("user_preferences", "subscription_status")
    op.drop_column("user_preferences", "stripe_subscription_id")
    op.drop_column("user_preferences", "stripe_customer_id")
