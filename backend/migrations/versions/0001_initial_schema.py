"""Initial schema: wheel_cycles, trades (users managed by Supabase Auth).

Revision ID: 0001_initial_schema
Revises:
Create Date: 2026-04-22
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0001_initial_schema"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ------------------------------------------------------------------
    # wheel_cycles
    # user_id references auth.users(id) which is managed by Supabase Auth.
    # ------------------------------------------------------------------
    op.create_table(
        "wheel_cycles",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column("ticker", sa.String(20), nullable=False),
        sa.Column("state", sa.String(50), nullable=False, server_default="IDLE"),
        sa.Column("capital_committed", sa.Numeric(18, 4), nullable=True),
        sa.Column(
            "total_premium_collected",
            sa.Numeric(18, 4),
            nullable=False,
            server_default="0",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index("ix_wheel_cycles_user_id", "wheel_cycles", ["user_id"])
    op.create_index("ix_wheel_cycles_ticker", "wheel_cycles", ["ticker"])

    # ------------------------------------------------------------------
    # trades
    # ------------------------------------------------------------------
    op.create_table(
        "trades",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "wheel_cycle_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("wheel_cycles.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("option_type", sa.String(10), nullable=True),
        sa.Column("action", sa.String(10), nullable=False),
        sa.Column("strike", sa.Numeric(18, 4), nullable=True),
        sa.Column("expiration_date", sa.Date(), nullable=True),
        sa.Column("contracts", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("premium_per_contract", sa.Numeric(18, 4), nullable=True),
        sa.Column("stock_price", sa.Numeric(18, 4), nullable=True),
        sa.Column("event", sa.String(50), nullable=False),
        sa.Column("trade_date", sa.Date(), nullable=False),
        sa.Column("notes", sa.String(1000), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index("ix_trades_wheel_cycle_id", "trades", ["wheel_cycle_id"])

    # ------------------------------------------------------------------
    # Row Level Security (RLS) – enable on Supabase PostgreSQL
    # NOTE: Policies are created via Supabase Dashboard or raw SQL after
    # migration.  The commands below are wrapped in execute() so they run
    # on PostgreSQL but are silently ignored on SQLite during local tests.
    # ------------------------------------------------------------------
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute("ALTER TABLE wheel_cycles ENABLE ROW LEVEL SECURITY;")
        op.execute("ALTER TABLE trades ENABLE ROW LEVEL SECURITY;")

        # Allow the service-role (backend) to bypass RLS
        op.execute(
            """
            CREATE POLICY "service_role_all_wheel_cycles"
              ON wheel_cycles FOR ALL
              TO service_role
              USING (true) WITH CHECK (true);
            """
        )
        op.execute(
            """
            CREATE POLICY "service_role_all_trades"
              ON trades FOR ALL
              TO service_role
              USING (true) WITH CHECK (true);
            """
        )

        # User-level RLS: each authenticated user can only see their own rows.
        # These policies apply when the frontend queries Supabase directly using
        # the anon key with a valid Supabase Auth JWT.
        op.execute(
            """
            CREATE POLICY "user_own_wheel_cycles"
              ON wheel_cycles FOR ALL
              TO authenticated
              USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
            """
        )
        op.execute(
            """
            CREATE POLICY "user_own_trades"
              ON trades FOR ALL
              TO authenticated
              USING (
                wheel_cycle_id IN (
                  SELECT id FROM wheel_cycles WHERE user_id = auth.uid()
                )
              )
              WITH CHECK (
                wheel_cycle_id IN (
                  SELECT id FROM wheel_cycles WHERE user_id = auth.uid()
                )
              );
            """
        )

        # FK constraint linking wheel_cycles.user_id → auth.users(id).
        # Added after RLS policies so it doesn't interfere with policy creation.
        op.execute(
            """
            ALTER TABLE wheel_cycles
              ADD CONSTRAINT fk_wheel_cycles_user_id
              FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
            """
        )


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute("DROP POLICY IF EXISTS \"user_own_trades\" ON trades;")
        op.execute("DROP POLICY IF EXISTS \"user_own_wheel_cycles\" ON wheel_cycles;")
        op.execute("DROP POLICY IF EXISTS \"service_role_all_trades\" ON trades;")
        op.execute("DROP POLICY IF EXISTS \"service_role_all_wheel_cycles\" ON wheel_cycles;")
        op.execute(
            "ALTER TABLE wheel_cycles DROP CONSTRAINT IF EXISTS fk_wheel_cycles_user_id;"
        )

    op.drop_table("trades")
    op.drop_table("wheel_cycles")
