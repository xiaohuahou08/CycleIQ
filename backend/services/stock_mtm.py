"""Unrealized mark-to-market for shares held after CSP assignment."""

from __future__ import annotations

from collections import defaultdict
from collections.abc import Mapping

from backend.models.trade import Trade


def open_assigned_positions(
    trades: list[Trade],
) -> list[tuple[str, int, float]]:
    """Per-ticker open assigned shares and weighted CSP assignment strike.

    Returns ``(ticker, open_shares, avg_assignment_strike)`` for positions with
    remaining shares after call-aways. Uses put **strike** (purchase price), not
    premium-reduced cost basis — premiums are already in option cashflows.
    """
    by_ticker: dict[str, list[Trade]] = defaultdict(list)
    for t in trades:
        by_ticker[t.ticker].append(t)

    positions: list[tuple[str, int, float]] = []
    for ticker, tt in by_ticker.items():
        assigned_puts = [
            t
            for t in tt
            if t.option_type == "PUT" and t.status in ("ASSIGNED", "CALLED_AWAY")
        ]
        if not assigned_puts:
            continue

        assigned_shares = sum(int(t.contracts) * 100 for t in assigned_puts)
        if assigned_shares <= 0:
            continue

        avg_strike = (
            sum(float(t.strike) * int(t.contracts) * 100 for t in assigned_puts)
            / assigned_shares
        )
        called_away_shares = sum(
            int(t.contracts) * 100
            for t in tt
            if t.option_type == "CALL" and t.status == "CALLED_AWAY"
        )
        open_shares = assigned_shares - called_away_shares
        if open_shares > 0:
            positions.append((ticker, open_shares, avg_strike))

    return positions


def tickers_needing_quotes(trades: list[Trade]) -> list[str]:
    return sorted({ticker for ticker, _, _ in open_assigned_positions(trades)})


def compute_unrealized_stock_mtm(
    trades: list[Trade],
    prices: Mapping[str, float],
) -> float:
    """``(livePrice − avgAssignmentStrike) × openShares`` across held tickers.

    Tickers without a finite price are skipped (contribute 0).
    """
    total = 0.0
    for ticker, open_shares, avg_strike in open_assigned_positions(trades):
        price = prices.get(ticker)
        if price is None or not isinstance(price, (int, float)):
            continue
        live = float(price)
        if live != live:  # NaN
            continue
        total += (live - avg_strike) * open_shares
    return total
