from datetime import datetime, date, timezone
from decimal import Decimal
from uuid import uuid4

from sqlalchemy import String, Numeric, Integer, DateTime, Date, Boolean, Enum, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column

from backend.models import db


class Trade(db.Model):
    __tablename__ = "trades"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    ticker: Mapped[str] = mapped_column(String(10), nullable=False, index=True)
    action: Mapped[str] = mapped_column(String(10), nullable=False)  # BUY / SELL
    position_type: Mapped[str] = mapped_column(String(20), nullable=False)  # STOCK / PUT / CALL
    strike: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    expiry: Mapped[date | None] = mapped_column(Date, nullable=True)
    premium: Mapped[float | None] = mapped_column(Numeric(10, 4), nullable=True)
    quantity: Mapped[int] = mapped_column(Integer, default=1)
    assigned: Mapped[bool] = mapped_column(Boolean, default=False)
    status: Mapped[str] = mapped_column(String(20), default="open")  # open / closed
    closed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc)
    )

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "ticker": self.ticker,
            "action": self.action,
            "position_type": self.position_type,
            "strike": float(self.strike) if self.strike else None,
            "expiry": self.expiry.isoformat() if self.expiry else None,
            "premium": float(self.premium) if self.premium else None,
            "quantity": self.quantity,
            "assigned": self.assigned,
            "status": self.status,
            "closed_at": self.closed_at.isoformat() if self.closed_at else None,
            "notes": self.notes,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
