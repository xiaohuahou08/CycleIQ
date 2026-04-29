"""Stock cost basis for wheel trades (recorded fields + computation)."""

from __future__ import annotations

from decimal import ROUND_HALF_UP, Decimal

from backend.models.trade import Trade

# Opening trade records premium **per share** (see UI: "Premium per Share").
# CSP assignment economics (per share, long stock):
#   cost_basis ≈ assignment_price − premium_per_share + (opening_fees + assignment_fees) / shares
# Opening `commission_fee` and `fees_on_assignment` are **total dollars** for that leg, spread across all shares.


def apply_stock_cost_basis(trade: Trade) -> None:
    """Persist `stock_cost_basis_per_share` for assigned CSP; clear otherwise."""
    if trade.option_type != "PUT" or trade.status != "ASSIGNED":
        trade.stock_cost_basis_per_share = None
        return
    shares = int(trade.contracts) * 100
    if shares <= 0:
        trade.stock_cost_basis_per_share = None
        return
    assignment_px = Decimal(str(trade.strike))
    premium_ps = Decimal(str(trade.premium))
    opening_fees_total = Decimal(str(trade.commission_fee or 0))
    assign_fees_total = Decimal(str(trade.fees_on_assignment or 0))
    fees_per_share = (opening_fees_total + assign_fees_total) / Decimal(shares)
    per_share = assignment_px - premium_ps + fees_per_share
    trade.stock_cost_basis_per_share = float(
        per_share.quantize(Decimal("0.0001"), rounding=ROUND_HALF_UP)
    )
