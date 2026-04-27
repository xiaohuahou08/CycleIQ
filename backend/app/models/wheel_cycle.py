"""WheelCycle model – one full wheel-strategy cycle per ticker."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database import db


class WheelCycle(db.Model):
    __tablename__ = "wheel_cycles"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    # References auth.users(id) managed by Supabase Auth. No ORM relationship
    # is declared because the User table lives in the auth schema, not public.
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), nullable=False, index=True
    )
    ticker: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    state: Mapped[str] = mapped_column(String(50), nullable=False, default="IDLE")
    # Capital committed when shares are assigned (optional until assignment)
    capital_committed: Mapped[float | None] = mapped_column(Numeric(18, 4), nullable=True)
    total_premium_collected: Mapped[float] = mapped_column(
        Numeric(18, 4), nullable=False, default=0
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    trades: Mapped[list["Trade"]] = relationship(  # noqa: F821
        "Trade", back_populates="wheel_cycle", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<WheelCycle {self.ticker} [{self.state}]>"
