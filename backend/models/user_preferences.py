from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import DateTime, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from backend.models import db

DEFAULT_CONTRACTS = 1
DEFAULT_DTE = 45


class UserPreferences(db.Model):
    """Per-user UI defaults for trade entry (commission, contracts, DTE)."""

    __tablename__ = "user_preferences"

    user_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    commission_per_contract: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    default_contracts: Mapped[int] = mapped_column(Integer, nullable=False, default=DEFAULT_CONTRACTS)
    default_dte: Mapped[int] = mapped_column(Integer, nullable=False, default=DEFAULT_DTE)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    def to_api_dict(self) -> dict:
        return {
            "commission_per_contract": float(self.commission_per_contract)
            if self.commission_per_contract is not None
            else None,
            "default_contracts": int(self.default_contracts),
            "default_dte": int(self.default_dte),
        }

    @staticmethod
    def default_api_dict() -> dict:
        return {
            "commission_per_contract": None,
            "default_contracts": DEFAULT_CONTRACTS,
            "default_dte": DEFAULT_DTE,
        }
