"""Trade model – a single option or stock leg within a WheelCycle."""

from __future__ import annotations

import uuid
from datetime import date, datetime, timezone

from sqlalchemy import Date, DateTime, ForeignKey, Integer, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database import db


class Trade(db.Model):
    __tablename__ = "trades"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    wheel_cycle_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("wheel_cycles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # Option / stock leg details
    option_type: Mapped[str | None] = mapped_column(String(10), nullable=True)   # PUT / CALL / STOCK
    action: Mapped[str] = mapped_column(String(10), nullable=False)               # BUY / SELL
    strike: Mapped[float | None] = mapped_column(Numeric(18, 4), nullable=True)
    expiration_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    contracts: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    premium_per_contract: Mapped[float | None] = mapped_column(Numeric(18, 4), nullable=True)
    stock_price: Mapped[float | None] = mapped_column(Numeric(18, 4), nullable=True)
    # State transition that triggered this trade
    event: Mapped[str] = mapped_column(String(50), nullable=False)
    trade_date: Mapped[date] = mapped_column(Date, nullable=False, default=date.today)
    notes: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    wheel_cycle: Mapped["WheelCycle"] = relationship(  # noqa: F821
        "WheelCycle", back_populates="trades"
    )

    def to_dict(self) -> dict:
        return {
            "id": str(self.id),
            "wheel_cycle_id": str(self.wheel_cycle_id),
            "option_type": self.option_type,
            "action": self.action,
            "strike": float(self.strike) if self.strike is not None else None,
            "expiration_date": (
                self.expiration_date.isoformat() if self.expiration_date else None
            ),
            "contracts": self.contracts,
            "premium_per_contract": (
                float(self.premium_per_contract)
                if self.premium_per_contract is not None
                else None
            ),
            "stock_price": (
                float(self.stock_price) if self.stock_price is not None else None
            ),
            "event": self.event,
            "trade_date": self.trade_date.isoformat() if self.trade_date else None,
            "notes": self.notes,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self) -> str:
        return f"<Trade {self.action} {self.option_type} event={self.event}>"
