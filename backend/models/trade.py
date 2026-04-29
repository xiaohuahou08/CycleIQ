from __future__ import annotations

from datetime import date, datetime, timezone
from uuid import uuid4

from sqlalchemy import Date, DateTime, ForeignKey, Index, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.models import db

ALLOWED_TRADE_STATUSES = frozenset(
    {"OPEN", "CLOSED", "ASSIGNED", "CALLED_AWAY", "EXPIRED", "ROLLED"}
)
ALLOWED_EXPIRE_TYPES = frozenset({"EXPIRED_WORTHLESS", "EXPIRED_ITM"})


class Trade(db.Model):
    __tablename__ = "trades"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    cycle_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("wheel_cycles.id", ondelete="SET NULL"), nullable=True, index=True
    )

    ticker: Mapped[str] = mapped_column(String(10), nullable=False, index=True)
    option_type: Mapped[str] = mapped_column(String(4), nullable=False)
    strike: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    expiry: Mapped[date] = mapped_column(Date, nullable=False)
    trade_date: Mapped[date] = mapped_column(Date, nullable=False)
    premium: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    commission_fee: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    delta: Mapped[float | None] = mapped_column(Numeric(5, 3), nullable=True)
    contracts: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="OPEN")
    expired_at: Mapped[date | None] = mapped_column(Date, nullable=True)
    expire_type: Mapped[str | None] = mapped_column(String(30), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    wheel_cycle: Mapped["WheelCycle | None"] = relationship(  # noqa: F821
        "WheelCycle", back_populates="trades"
    )

    __table_args__ = (
        Index("ix_trades_user_ticker", "user_id", "ticker"),
        Index("ix_trades_user_status", "user_id", "status"),
    )

    def to_api_dict(self) -> dict:
        return {
            "id": self.id,
            "ticker": self.ticker,
            "option_type": self.option_type,
            "strike": float(self.strike),
            "expiry": self.expiry.isoformat(),
            "trade_date": self.trade_date.isoformat(),
            "premium": float(self.premium),
            "commission_fee": float(self.commission_fee) if self.commission_fee is not None else None,
            "delta": float(self.delta) if self.delta is not None else None,
            "contracts": self.contracts,
            "status": self.status,
            "expired_at": self.expired_at.isoformat() if self.expired_at else None,
            "expire_type": self.expire_type,
            "notes": self.notes,
            "cycle_id": self.cycle_id,
            "created_at": self.created_at.isoformat().replace("+00:00", "Z")
            if self.created_at
            else None,
            "updated_at": self.updated_at.isoformat().replace("+00:00", "Z")
            if self.updated_at
            else None,
        }
