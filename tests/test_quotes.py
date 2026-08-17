"""Unit tests for yfinance-backed equity quotes."""

from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pandas as pd
import pytest

from backend.services import quotes


@pytest.fixture(autouse=True)
def _clear_cache():
    quotes.clear_quote_cache()
    yield
    quotes.clear_quote_cache()


def test_fetch_yahoo_prices_uses_fast_info_last_price():
    stock = MagicMock()
    stock.fast_info = SimpleNamespace(last_price=190.5)

    with patch.object(quotes.yf, "Ticker", return_value=stock) as ticker_cls:
        result = quotes.fetch_yahoo_prices(["aapl", " AAPL "])

    assert result == {"AAPL": 190.5}
    ticker_cls.assert_called_once_with("AAPL")
    stock.history.assert_not_called()


def test_fetch_yahoo_prices_falls_back_to_history_close():
    stock = MagicMock()
    stock.fast_info = SimpleNamespace(last_price=None)
    stock.history.return_value = pd.DataFrame({"Close": [188.25]})

    with patch.object(quotes.yf, "Ticker", return_value=stock):
        result = quotes.fetch_yahoo_prices(["MSFT"])

    assert result == {"MSFT": 188.25}
    stock.history.assert_called_once_with(period="1d")


def test_fetch_yahoo_prices_caches_within_ttl():
    stock = MagicMock()
    stock.fast_info = SimpleNamespace(last_price=100.0)

    with patch.object(quotes.yf, "Ticker", return_value=stock) as ticker_cls:
        first = quotes.fetch_yahoo_prices(["TSLA"])
        second = quotes.fetch_yahoo_prices(["TSLA"])

    assert first == second == {"TSLA": 100.0}
    ticker_cls.assert_called_once_with("TSLA")


def test_fetch_yahoo_prices_omits_failures():
    stock = MagicMock()
    stock.fast_info = SimpleNamespace(last_price=float("nan"))
    stock.history.return_value = pd.DataFrame({"Close": []})

    with patch.object(quotes.yf, "Ticker", return_value=stock):
        result = quotes.fetch_yahoo_prices(["BAD"])

    assert result == {}
