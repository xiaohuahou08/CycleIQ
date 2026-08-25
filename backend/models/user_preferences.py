from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import DateTime, Index, Integer, JSON, Numeric, String, text
from sqlalchemy.exc import ProgrammingError
from sqlalchemy.orm import Mapped, load_only, mapped_column

from backend.models import db
from backend.services.screener.config import default_screener_config, merge_screener_config

DEFAULT_CONTRACTS = 1
DEFAULT_DTE = 45
DEFAULT_TOTAL_CAPITAL_BUDGET = 10000.0
DEFAULT_PLAN = "basic"
ALLOWED_PLANS = frozenset({"basic", "premium"})


class UserPreferences(db.Model):
    """Per-user UI defaults for trade entry (commission, contracts, DTE)."""

    __tablename__ = "user_preferences"
    __table_args__ = (
        Index(
            "uq_user_preferences_stripe_customer_id",
            "stripe_customer_id",
            unique=True,
            sqlite_where=text("stripe_customer_id IS NOT NULL"),
            postgresql_where=text("stripe_customer_id IS NOT NULL"),
        ),
    )

    user_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    commission_per_contract: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    default_contracts: Mapped[int] = mapped_column(Integer, nullable=False, default=DEFAULT_CONTRACTS)
    default_dte: Mapped[int] = mapped_column(Integer, nullable=False, default=DEFAULT_DTE)
    total_capital_budget: Mapped[float] = mapped_column(
        Numeric(14, 2), nullable=False, default=DEFAULT_TOTAL_CAPITAL_BUDGET
    )
    plan: Mapped[str] = mapped_column(String(20), nullable=False, default=DEFAULT_PLAN)
    stripe_customer_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    stripe_subscription_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    subscription_status: Mapped[str | None] = mapped_column(String(50), nullable=True)
    current_period_end: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    # Deferred so default SELECTs do not require migration 0015.
    screener_config: Mapped[dict | None] = mapped_column(JSON, nullable=True, deferred=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    @classmethod
    def get_for_user(cls, user_id: str) -> UserPreferences | None:
        """Load prefs without selecting screener_config (may be missing on prod)."""
        try:
            return (
                cls.query.options(
                    load_only(
                        cls.commission_per_contract,
                        cls.default_contracts,
                        cls.default_dte,
                        cls.total_capital_budget,
                        cls.plan,
                        cls.stripe_customer_id,
                        cls.stripe_subscription_id,
                        cls.subscription_status,
                        cls.current_period_end,
                        cls.updated_at,
                    )
                )
                .filter_by(user_id=user_id)
                .first()
            )
        except ProgrammingError:
            db.session.rollback()
            return None

    def to_api_dict(self) -> dict:
        commission = self.commission_per_contract
        contracts = int(self.default_contracts)
        dte = int(self.default_dte)
        budget = float(self.total_capital_budget)
        stored_screener = None
        try:
            stored_screener = self.screener_config
        except Exception:
            db.session.rollback()
            stored_screener = None
        return {
            "commission_per_contract": float(commission) if commission is not None else None,
            "default_contracts": contracts,
            "default_dte": dte,
            "total_capital_budget": budget,
            "screener_config": merge_screener_config(stored_screener),
        }

    @staticmethod
    def default_api_dict() -> dict:
        return {
            "commission_per_contract": None,
            "default_contracts": DEFAULT_CONTRACTS,
            "default_dte": DEFAULT_DTE,
            "total_capital_budget": DEFAULT_TOTAL_CAPITAL_BUDGET,
            "screener_config": default_screener_config(),
        }
