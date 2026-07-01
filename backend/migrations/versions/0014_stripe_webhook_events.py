"""Add stripe_webhook_events table and unique index on stripe_customer_id.

Revision ID: 0014_stripe_webhook_events
Revises: 0013_stripe_billing
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0014_stripe_webhook_events"
down_revision: Union[str, None] = "0013_stripe_billing"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "stripe_webhook_events",
        sa.Column("event_id", sa.String(length=255), primary_key=True),
        sa.Column("event_type", sa.String(length=100), nullable=True),
        sa.Column(
            "processed_at",
            sa.DateTime(timezone=True),
            nullable=False,
        ),
    )
    # Enforce a 1:1 mapping between users and Stripe customers so concurrent
    # checkout requests cannot create duplicate customers undetected.
    op.create_index(
        "uq_user_preferences_stripe_customer_id",
        "user_preferences",
        ["stripe_customer_id"],
        unique=True,
        postgresql_where=sa.text("stripe_customer_id IS NOT NULL"),
    )


def downgrade() -> None:
    op.drop_index(
        "uq_user_preferences_stripe_customer_id",
        table_name="user_preferences",
    )
    op.drop_table("stripe_webhook_events")
