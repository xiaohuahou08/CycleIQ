"""Add trade expiration metadata fields.

Revision ID: 0002_trade_expire_fields
Revises: 0001_initial_schema
Create Date: 2026-04-29
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0002_trade_expire_fields"
down_revision: Union[str, None] = "0001_initial_schema"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("trades", sa.Column("expired_at", sa.Date(), nullable=True))
    op.add_column("trades", sa.Column("expire_type", sa.String(length=30), nullable=True))


def downgrade() -> None:
    op.drop_column("trades", "expire_type")
    op.drop_column("trades", "expired_at")
