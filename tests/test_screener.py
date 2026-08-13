"""Unit tests for per-share screener metrics, filters, and ranking."""

from __future__ import annotations

from datetime import date

from backend.services.screener.config import parse_screener_config
from backend.services.screener.filters import (
    earnings_blocks_expiry,
    evaluate_hard_filters,
    in_strike_window,
)
from backend.services.screener.metrics import build_candidate_metrics, mid_and_spread
from backend.services.screener.rank import rank_candidates


def test_mid_and_spread():
    mid, spread = mid_and_spread(1.0, 1.2)
    assert abs(mid - 1.1) < 1e-9
    assert abs(spread - (0.2 / 1.1)) < 1e-9
    assert mid_and_spread(0, 1.0) is None
    assert mid_and_spread(1.2, 1.0) is None


def test_put_metrics_per_share():
    m = build_candidate_metrics(
        mode="put",
        bid=1.0,
        ask=1.2,
        strike=100.0,
        spot=105.0,
        dte=30,
        iv=0.35,
        term_matched_rv=0.25,
        open_interest=500,
        fee_per_contract=0.65,
    )
    assert m is not None
    assert abs(m["sell_limit"] - 1.1) < 1e-9
    assert abs(m["fee_per_share"] - 0.0065) < 1e-9
    assert abs(m["net_premium_per_share"] - (1.1 - 0.0065)) < 1e-9
    net = m["net_premium_per_share"]
    assert abs(m["period_net_return"] - net / (100.0 - net)) < 1e-9
    assert abs(m["iv_rv_ratio"] - 0.35 / 0.25) < 1e-9


def test_call_metrics_per_share():
    m = build_candidate_metrics(
        mode="call",
        bid=2.0,
        ask=2.2,
        strike=110.0,
        spot=100.0,
        dte=45,
        iv=0.40,
        term_matched_rv=0.30,
        open_interest=100,
        fee_per_contract=0.65,
    )
    assert m is not None
    net = m["net_premium_per_share"]
    assert abs(m["period_net_return"] - net / 100.0) < 1e-9


def test_strike_windows():
    cfg = parse_screener_config(None)
    assert in_strike_window(mode="put", strike=95.0, spot=100.0, cfg=cfg)
    assert not in_strike_window(mode="put", strike=70.0, spot=100.0, cfg=cfg)
    assert in_strike_window(mode="call", strike=105.0, spot=100.0, cfg=cfg, avg_cost=90.0)
    # floor = max(90*1.02, 100) = 100; upper = 120 — strike 99 below
    assert not in_strike_window(mode="call", strike=99.0, spot=100.0, cfg=cfg, avg_cost=90.0)


def test_earnings_hard_window():
    scan = date(2026, 8, 1)
    expiry = date(2026, 8, 20)
    assert earnings_blocks_expiry(
        scan_day=scan,
        expiry=expiry,
        earnings_day=date(2026, 8, 18),
        hard_window_days=6,
    )
    assert not earnings_blocks_expiry(
        scan_day=scan,
        expiry=expiry,
        earnings_day=date(2026, 8, 10),
        hard_window_days=6,
    )


def test_hard_filters_reject_low_premium():
    cfg = parse_screener_config({"min_net_premium_usd": 0.50})
    row = {
        "dte": 30,
        "spread_ratio": 0.1,
        "net_premium_per_share": 0.10,
        "annualized_net_return": 0.20,
        "iv_rv_ratio": 1.2,
        "iv_minus_rv": 0.06,
        "expiry": date(2026, 9, 1),
    }
    decision = evaluate_hard_filters(row, cfg=cfg, scan_day=date(2026, 8, 1), earnings_day=None)
    assert decision["accepted"] is False
    assert decision["rule"] == "net_premium_too_low"


def test_hard_filters_accept():
    cfg = parse_screener_config(None)
    row = {
        "dte": 30,
        "spread_ratio": 0.1,
        "net_premium_per_share": 0.80,
        "annualized_net_return": 0.20,
        "iv_rv_ratio": 1.2,
        "iv_minus_rv": 0.06,
        "expiry": date(2026, 9, 1),
    }
    decision = evaluate_hard_filters(row, cfg=cfg, scan_day=date(2026, 8, 1), earnings_day=None)
    assert decision["accepted"] is True


def test_rank_one_per_symbol_and_period_order():
    rows = [
        {
            "symbol": "AAA",
            "strike": 90,
            "period_net_return": 0.02,
            "net_assignment_discount_pct": 0.05,
            "spread_ratio": 0.1,
            "open_interest": 10,
            "net_premium_per_share": 0.5,
            "contract_id": "AAA-a",
            "spot": 100,
        },
        {
            "symbol": "AAA",
            "strike": 95,
            "period_net_return": 0.03,
            "net_assignment_discount_pct": 0.04,
            "spread_ratio": 0.1,
            "open_interest": 20,
            "net_premium_per_share": 0.6,
            "contract_id": "AAA-b",
            "spot": 100,
        },
        {
            "symbol": "BBB",
            "strike": 50,
            "period_net_return": 0.025,
            "net_assignment_discount_pct": 0.03,
            "spread_ratio": 0.05,
            "open_interest": 5,
            "net_premium_per_share": 0.4,
            "contract_id": "BBB-a",
            "spot": 55,
        },
    ]
    ranked = rank_candidates(rows, mode="put", proximity_band=0.002)
    assert len(ranked) == 2
    assert ranked[0]["symbol"] == "AAA"
    assert ranked[0]["contract_id"] == "AAA-b"
    assert ranked[0]["rank"] == 1
    assert ranked[1]["symbol"] == "BBB"


def test_parse_screener_config_rejects_bad_dte():
    try:
        parse_screener_config({"min_dte": 60, "max_dte": 30})
        assert False, "expected ValueError"
    except ValueError as exc:
        assert "max_dte" in str(exc)
