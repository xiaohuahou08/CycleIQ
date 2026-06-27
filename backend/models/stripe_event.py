from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import DateTime, String
from sqlalchemy.orm import Mapped, mapped_column

from backend.models import db


class StripeWebhookEvent(db.Model):
    """Record of processed Stripe webhook event ids for idempotency.

    Stripe may deliver the same event more than once. Recording the event id
    (the primary key) lets the webhook handler skip duplicates instead of
    re-applying side effects.
    """

    __tablename__ = "stripe_webhook_events"

    event_id: Mapped[str] = mapped_column(String(255), primary_key=True)
    event_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    processed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
