"""Unit tests for per-share screener metrics, filters, and ranking."""

from __future__ import annotations

from datetime import date

from backend.services.screener.config import parse_screener_config
from backend.services.screener.filters import (
    earnings_blocks_expiry,
    evaluate_hard_filters,
    evaluate_ticker_quality,
    in_strike_window,
)
from backend.services.screener.metrics import build_candidate_metrics, mid_and_spread, option_delta
from backend.services.screener.rank import rank_candidates


def test_mid_and_spread():
    mid, spread = mid_and_spread(1.0, 1.2)
    assert abs(mid - 1.1) < 1e-9
    assert abs(spread - (0.2 / 1.1)) < 1e-9
    assert mid_and_spread(0, 1.0) is None
    assert mid_and_spread(1.2, 1.0) is None
    last_mid, last_spread = mid_and_spread(0, 0, last=1.05)
    assert abs(last_mid - 1.05) < 1e-9
    assert last_spread == 0.0


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
    assert m["delta"] is not None
    assert -1.0 < m["delta"] < 0.0


def test_option_delta_signs():
    call_d = option_delta(spot=100, strike=100, dte=30, iv=0.30, mode="call")
    put_d = option_delta(spot=100, strike=100, dte=30, iv=0.30, mode="put")
    assert call_d is not None and put_d is not None
    assert 0.45 < call_d < 0.60
    assert -0.55 < put_d < -0.40
    assert abs((call_d - put_d) - 1.0) < 1e-9


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
        "open_interest": 500,
        "delta": -0.22,
    }
    decision = evaluate_hard_filters(row, cfg=cfg, scan_day=date(2026, 8, 1), earnings_day=None)
    assert decision["accepted"] is True


def test_missing_iv_rv_does_not_reject():
    cfg = parse_screener_config({"min_iv_rv_ratio": 1.2, "min_iv_minus_rv": 0.05})
    row = {
        "dte": 30,
        "spread_ratio": 0.1,
        "net_premium_per_share": 0.80,
        "annualized_net_return": 0.20,
        "iv_rv_ratio": None,
        "iv_minus_rv": None,
        "expiry": date(2026, 9, 1),
        "open_interest": 500,
        "delta": -0.22,
    }
    decision = evaluate_hard_filters(row, cfg=cfg, scan_day=date(2026, 8, 1), earnings_day=None)
    assert decision["accepted"] is True


def test_iv_rv_is_not_a_hard_gate():
    cfg = parse_screener_config({"min_iv_rv_ratio": 1.1, "min_iv_minus_rv": 0.05})
    row = {
        "dte": 30,
        "spread_ratio": 0.1,
        "net_premium_per_share": 0.80,
        "annualized_net_return": 0.02,
        "iv_rv_ratio": 0.7,
        "iv_minus_rv": -0.10,
        "expiry": date(2026, 9, 1),
        "open_interest": 500,
        "delta": -0.22,
    }
    decision = evaluate_hard_filters(row, cfg=cfg, scan_day=date(2026, 8, 1), earnings_day=date(2026, 8, 28))
    assert decision["accepted"] is True


def test_legacy_iv_rv_factory_defaults_are_relaxed():
    cfg = parse_screener_config({"min_iv_rv_ratio": 1.10, "min_iv_minus_rv": 0.05})
    assert cfg["min_iv_rv_ratio"] == 0.0
    assert cfg["min_iv_minus_rv"] == 0.0
    kept = parse_screener_config({"min_iv_rv_ratio": 1.2, "min_iv_minus_rv": 0.05})
    assert kept["min_iv_rv_ratio"] == 1.2
    assert kept["min_iv_minus_rv"] == 0.05


def test_untouched_first_release_filters_upgrade_to_new_defaults():
    cfg = parse_screener_config(
        {
            "watchlist": ["AMD"],
            "min_dte": 21,
            "max_dte": 45,
            "min_net_premium_usd": 0.50,
            "min_annualized_return": 0.10,
            "min_iv_rv_ratio": 1.10,
            "min_iv_minus_rv": 0.05,
            "max_spread_ratio": 0.40,
            "put_recall_below_pct": 0.20,
            "call_recall_above_pct": 0.20,
            "call_cost_floor_mult": 1.02,
            "earnings_hard_window_days": 6,
            "return_proximity_band": 0.002,
            "fee_per_contract_usd": None,
        }
    )
    assert cfg["watchlist"] == ["AMD"]
    assert cfg["min_net_premium_usd"] == 0.10
    assert cfg["max_spread_ratio"] == 0.20
    assert cfg["min_open_interest"] == 100
    assert cfg["min_abs_delta"] == 0.15
    assert cfg["max_abs_delta"] == 0.35
    assert cfg["put_recall_below_pct"] == 0.25
    assert cfg["call_recall_above_pct"] == 0.25
    assert cfg["earnings_hard_window_days"] == 0
    assert cfg["min_iv_rv_ratio"] == 0.0
    assert cfg["require_quality_fundamentals"] is True
    custom = parse_screener_config({"min_net_premium_usd": 0.80, "max_spread_ratio": 0.40})
    assert custom["min_net_premium_usd"] == 0.80
    assert custom["max_spread_ratio"] == 0.40


def test_hard_filters_reject_thin_open_interest():
    cfg = parse_screener_config({"min_open_interest": 100})
    row = {
        "dte": 30,
        "spread_ratio": 0.1,
        "net_premium_per_share": 0.80,
        "open_interest": 10,
        "delta": -0.22,
        "expiry": date(2026, 9, 1),
    }
    decision = evaluate_hard_filters(row, cfg=cfg, scan_day=date(2026, 8, 1), earnings_day=None)
    assert decision["accepted"] is False
    assert decision["rule"] == "open_interest_too_low"


def test_hard_filters_reject_delta_out_of_band():
    cfg = parse_screener_config({"min_abs_delta": 0.15, "max_abs_delta": 0.35})
    row = {
        "dte": 30,
        "spread_ratio": 0.1,
        "net_premium_per_share": 0.80,
        "open_interest": 500,
        "delta": -0.05,
        "expiry": date(2026, 9, 1),
    }
    decision = evaluate_hard_filters(row, cfg=cfg, scan_day=date(2026, 8, 1), earnings_day=None)
    assert decision["accepted"] is False
    assert decision["rule"] == "delta_out_of_band"


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


def test_empty_watchlist_falls_back_to_defaults():
    cfg = parse_screener_config({"watchlist": []})
    assert "AAPL" in cfg["watchlist"]
    assert len(cfg["watchlist"]) >= 1


def test_parse_screener_config_rejects_bad_dte():
    try:
        parse_screener_config({"min_dte": 60, "max_dte": 30})
        assert False, "expected ValueError"
    except ValueError as exc:
        assert "max_dte" in str(exc)


def test_parse_screener_config_quality_flag():
    assert parse_screener_config(None)["require_quality_fundamentals"] is True
    off = parse_screener_config({"require_quality_fundamentals": False})
    assert off["require_quality_fundamentals"] is False


def test_ticker_quality_fail_open_when_missing_or_disabled():
    assert evaluate_ticker_quality(None, enabled=True)["accepted"] is True
    assert evaluate_ticker_quality({}, enabled=True)["accepted"] is True
    weak = {"market_cap": 1e8, "trailing_eps": -1.0, "profit_margin": -0.1, "debt_to_equity": 400}
    assert evaluate_ticker_quality(weak, enabled=False)["accepted"] is True


def test_ticker_quality_rejects_small_cap_unprofitable_and_leverage():
    small = evaluate_ticker_quality({"market_cap": 1_000_000_000.0, "trailing_eps": 2.0}, enabled=True)
    assert small["accepted"] is False
    assert small["rule"] == "market_cap_too_small"

    loss = evaluate_ticker_quality(
        {"market_cap": 50_000_000_000.0, "trailing_eps": -0.4}, enabled=True
    )
    assert loss["accepted"] is False
    assert loss["rule"] == "not_profitable"

    neg_margin = evaluate_ticker_quality(
        {"market_cap": 50_000_000_000.0, "profit_margin": -0.02}, enabled=True
    )
    assert neg_margin["accepted"] is False
    assert neg_margin["rule"] == "not_profitable"

    levered = evaluate_ticker_quality(
        {"market_cap": 50_000_000_000.0, "trailing_eps": 3.0, "debt_to_equity": 280},
        enabled=True,
    )
    assert levered["accepted"] is False
    assert levered["rule"] == "leverage_too_high"

    ok = evaluate_ticker_quality(
        {
            "market_cap": 50_000_000_000.0,
            "trailing_eps": 3.0,
            "profit_margin": 0.12,
            "debt_to_equity": 1.4,
        },
        enabled=True,
    )
    assert ok["accepted"] is True


class _EmptyFrame:
    empty = True


class _FakeChain:
    def __init__(self):
        self.puts = _EmptyFrame()
        self.calls = _EmptyFrame()


def test_empty_options_calendar_is_unavailable(monkeypatch):
    from backend.services.screener import market_data as md

    md.clear_screener_market_cache()
    monkeypatch.setattr(md, "_OPTIONS_RETRY_SEC", 0)

    class FakeTicker:
        def __init__(self, _symbol):
            self.fast_info = type("F", (), {"last_price": 100.0})()

        @property
        def options(self):
            return []

        def option_chain(self, _exp):
            return _FakeChain()

    monkeypatch.setattr(md.yf, "Ticker", FakeTicker)
    result = md.fetch_option_chain(
        "AAPL", min_dte=21, max_dte=45, include_fundamentals=False, include_rv=False
    )
    assert result["error"] == "options_calendar_unavailable"
    assert result["expirations"] == []


def test_options_calendar_retries_then_succeeds(monkeypatch):
    from datetime import datetime, timedelta, timezone

    from backend.services.screener import market_data as md

    md.clear_screener_market_cache()
    monkeypatch.setattr(md, "_OPTIONS_RETRY_SEC", 0)
    attempts = {"n": 0}
    expiry = (datetime.now(timezone.utc).date() + timedelta(days=30)).isoformat()

    class FakeTicker:
        def __init__(self, _symbol):
            self.fast_info = type("F", (), {"last_price": 100.0})()

        @property
        def options(self):
            attempts["n"] += 1
            if attempts["n"] < 3:
                raise RuntimeError("crumb")
            return [expiry]

        def option_chain(self, _exp):
            return _FakeChain()

    monkeypatch.setattr(md.yf, "Ticker", FakeTicker)
    result = md.fetch_option_chain(
        "AAPL", min_dte=21, max_dte=45, include_fundamentals=False, include_rv=False
    )
    assert attempts["n"] == 3
    assert result["error"] is None
    assert len(result["expirations"]) == 1


def test_failed_option_calendar_is_not_cached(monkeypatch):
    from backend.services.screener import market_data as md

    md.clear_screener_market_cache()
    monkeypatch.setattr(md, "_OPTIONS_RETRY_SEC", 0)
    attempts = {"n": 0}

    class FakeTicker:
        def __init__(self, _symbol):
            self.fast_info = type("F", (), {"last_price": 100.0})()

        @property
        def options(self):
            attempts["n"] += 1
            raise RuntimeError("yahoo down")

    monkeypatch.setattr(md.yf, "Ticker", FakeTicker)
    first = md.fetch_option_chain(
        "MSFT", min_dte=21, max_dte=45, include_fundamentals=False, include_rv=False
    )
    second = md.fetch_option_chain(
        "MSFT", min_dte=21, max_dte=45, include_fundamentals=False, include_rv=False
    )
    assert first["error"] == "options_calendar_unavailable"
    assert second["error"] == "options_calendar_unavailable"
    assert attempts["n"] == md._OPTIONS_ATTEMPTS * 2
