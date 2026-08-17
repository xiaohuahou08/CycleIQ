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
    op.add_column("user_preferences", sa.Column("screener_config", sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column("user_preferences", "screener_config")
