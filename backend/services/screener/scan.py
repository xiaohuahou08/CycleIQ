"""Orchestrate Sell Put / Covered Call screens (advisory only)."""

from __future__ import annotations

from datetime import date, datetime, timezone
from typing import Any

from backend.models.trade import Trade
from backend.services.screener.config import merge_screener_config, resolve_fee_per_contract
from backend.services.screener.filters import evaluate_hard_filters, in_strike_window
from backend.services.screener.market_data import fetch_chains_parallel
from backend.services.screener.metrics import build_candidate_metrics
from backend.services.screener.rank import rank_candidates
from backend.services.stock_mtm import open_assigned_positions


def _serialize_candidate(row: dict[str, Any]) -> dict[str, Any]:
    expiry = row.get("expiry")
    return {
        "rank": row.get("rank"),
        "symbol": row.get("symbol"),
        "mode": row.get("mode"),
        "strike": row.get("strike"),
        "expiry": expiry.isoformat() if isinstance(expiry, date) else expiry,
        "dte": row.get("dte"),
        "spot": row.get("spot"),
        "bid": row.get("bid"),
        "ask": row.get("ask"),
        "mid": row.get("mid"),
        "spread_ratio": row.get("spread_ratio"),
        "net_premium_per_share": row.get("net_premium_per_share"),
        "gross_premium_per_share": row.get("gross_premium_per_share"),
        "fee_per_share": row.get("fee_per_share"),
        "period_net_return": row.get("period_net_return"),
        "annualized_net_return": row.get("annualized_net_return"),
        "breakeven": row.get("breakeven"),
        "net_assignment_discount_pct": row.get("net_assignment_discount_pct"),
        "implied_volatility": row.get("implied_volatility"),
        "term_matched_rv": row.get("term_matched_rv"),
        "iv_rv_ratio": row.get("iv_rv_ratio"),
        "iv_minus_rv": row.get("iv_minus_rv"),
        "open_interest": row.get("open_interest"),
        "avg_cost": row.get("avg_cost"),
        "open_shares": row.get("open_shares"),
        "max_new_contracts": row.get("max_new_contracts"),
        "contract_id": row.get("contract_id"),
    }


def _scan_side(
    *,
    mode: str,
    symbols: list[str],
    holdings: dict[str, tuple[int, float]],
    chains: dict[str, dict[str, Any]],
    cfg: dict[str, Any],
    fee_per_contract: float,
    capital_budget: float | None,
    scan_day: date,
) -> tuple[list[dict[str, Any]], dict[str, int]]:
    accepted: list[dict[str, Any]] = []
    reject_counts: dict[str, int] = {}
    mode_norm = "call" if mode == "call" else "put"

    for symbol in symbols:
        chain = chains.get(symbol) or {}
        expirations = chain.get("expirations") or []
        if chain.get("error") and not expirations:
            rule = str(chain.get("error") or "fetch_failed")
            reject_counts[rule] = reject_counts.get(rule, 0) + 1
            continue
        spot = chain.get("spot")
        if spot is None:
            reject_counts["spot_unavailable"] = reject_counts.get("spot_unavailable", 0) + 1
            continue
        if not expirations:
            reject_counts["no_expiries_in_dte_window"] = (
                reject_counts.get("no_expiries_in_dte_window", 0) + 1
            )
            continue
        earnings_day = chain.get("earnings_day")
        avg_cost = None
        open_shares = None
        if mode_norm == "call":
            holding = holdings.get(symbol)
            if not holding:
                reject_counts["no_holding"] = reject_counts.get("no_holding", 0) + 1
                continue
            open_shares, avg_cost = holding

        for exp in expirations:
            dte = int(exp["dte"])
            expiry = exp["expiry"]
            rv = exp.get("term_matched_rv")
            option_rows = exp["calls"] if mode_norm == "call" else exp["puts"]
            for opt in option_rows:
                strike = float(opt["strike"])
                if not in_strike_window(
                    mode=mode_norm,
                    strike=strike,
                    spot=float(spot),
                    cfg=cfg,
                    avg_cost=avg_cost,
                ):
                    reject_counts["strike_out_of_window"] = (
                        reject_counts.get("strike_out_of_window", 0) + 1
                    )
                    continue
                metrics = build_candidate_metrics(
                    mode=mode_norm,
                    bid=float(opt["bid"]),
                    ask=float(opt["ask"]),
                    last=opt.get("last"),
                    strike=strike,
                    spot=float(spot),
                    dte=dte,
                    iv=opt.get("implied_volatility"),
                    term_matched_rv=rv,
                    open_interest=opt.get("open_interest"),
                    fee_per_contract=fee_per_contract,
                )
                if metrics is None:
                    reject_counts["quote_unusable"] = reject_counts.get("quote_unusable", 0) + 1
                    continue
                row = {
                    **metrics,
                    "symbol": symbol,
                    "strike": strike,
                    "expiry": expiry,
                    "dte": dte,
                    "spot": float(spot),
                    "avg_cost": avg_cost,
                    "open_shares": open_shares,
                    "contract_id": f"{symbol}-{expiry.isoformat()}-{mode_norm}-{strike}",
                }
                if mode_norm == "put" and capital_budget and capital_budget > 0:
                    notional = strike * 100
                    row["max_new_contracts"] = int(capital_budget // notional) if notional > 0 else 0
                elif mode_norm == "call" and open_shares:
                    row["max_new_contracts"] = int(open_shares // 100)

                decision = evaluate_hard_filters(
                    row, cfg=cfg, scan_day=scan_day, earnings_day=earnings_day
                )
                if not decision.get("accepted"):
                    rule = str(decision.get("rule") or "rejected")
                    reject_counts[rule] = reject_counts.get(rule, 0) + 1
                    continue
                accepted.append(row)

    ranked = rank_candidates(
        accepted,
        mode=mode_norm,
        proximity_band=float(cfg["return_proximity_band"]),
    )
    return [_serialize_candidate(r) for r in ranked], reject_counts


def run_screen(
    *,
    user_id: str,
    cfg: dict[str, Any],
    commission_per_contract: float | None = None,
    capital_budget: float | None = None,
    modes: list[str] | None = None,
) -> dict[str, Any]:
    cfg = merge_screener_config(cfg)
    fee = resolve_fee_per_contract(cfg, commission_per_contract=commission_per_contract)
    scan_day = datetime.now(timezone.utc).date()
    wanted = {m.lower() for m in (modes or ["put", "call"])}

    trades = Trade.query.filter_by(user_id=user_id).all()
    holdings_list = open_assigned_positions(trades)
    holdings = {ticker: (shares, avg_strike) for ticker, shares, avg_strike in holdings_list}

    put_symbols = list(cfg.get("watchlist") or [])
    call_symbols = sorted(holdings.keys()) if "call" in wanted else []
    fetch_symbols = []
    if "put" in wanted:
        fetch_symbols.extend(put_symbols)
    if "call" in wanted:
        fetch_symbols.extend(call_symbols)

    chains = fetch_chains_parallel(
        fetch_symbols,
        min_dte=int(cfg["min_dte"]),
        max_dte=int(cfg["max_dte"]),
    )

    puts: list[dict[str, Any]] = []
    calls: list[dict[str, Any]] = []
    reject_summary: dict[str, Any] = {"put": {}, "call": {}}

    if "put" in wanted:
        puts, put_rejects = _scan_side(
            mode="put",
            symbols=put_symbols,
            holdings=holdings,
            chains=chains,
            cfg=cfg,
            fee_per_contract=fee,
            capital_budget=capital_budget,
            scan_day=scan_day,
        )
        reject_summary["put"] = put_rejects

    if "call" in wanted:
        calls, call_rejects = _scan_side(
            mode="call",
            symbols=call_symbols,
            holdings=holdings,
            chains=chains,
            cfg=cfg,
            fee_per_contract=fee,
            capital_budget=capital_budget,
            scan_day=scan_day,
        )
        reject_summary["call"] = call_rejects

    return {
        "puts": puts,
        "calls": calls,
        "rejected_summary": reject_summary,
        "scanned_at": datetime.now(timezone.utc).isoformat(),
        "config_used": cfg,
        "holdings": [
            {"symbol": t, "open_shares": s, "avg_cost": c} for t, (s, c) in holdings.items()
        ],
        "advisory_only": True,
    }
