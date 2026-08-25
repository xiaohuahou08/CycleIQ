"""Add screener_config JSON column to user_preferences.

Revision ID: 0015_screener_config
Revises: 0014_stripe_webhook_events
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0015_screener_config"
down_revision: Union[str, None] = "0014_stripe_webhook_events"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Idempotent: boot safety net may already have added this column while
    # alembic_version was still at 0014, which made a plain ADD COLUMN fail
    # and blocked later revisions (0016_drop_capital_flows).
    op.execute(
        "ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS screener_config JSON"
    )


def downgrade() -> None:
    op.drop_column("user_preferences", "screener_config")
