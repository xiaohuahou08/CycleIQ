from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
import unittest

from cycleiq.wheel_fsm import (
    Cycle,
    CycleEvent,
    CycleState,
    InvalidTransitionError,
    OptionAction,
    OptionLeg,
    OptionType,
    StockAction,
    StockLeg,
)


def put_sell(strike: str, premium: str, expiry: date) -> OptionLeg:
    return OptionLeg(
        type=OptionType.PUT,
        action=OptionAction.SELL,
        strike=Decimal(strike),
        expiry=expiry,
        premium=Decimal(premium),
    )


def call_sell(strike: str, premium: str, expiry: date) -> OptionLeg:
    return OptionLeg(
        type=OptionType.CALL,
        action=OptionAction.SELL,
        strike=Decimal(strike),
        expiry=expiry,
        premium=Decimal(premium),
    )


class WheelFSMTests(unittest.TestCase):
    def test_csp_expire_otm_transitions_via_csp_closed_and_returns_idle(self) -> None:
        cycle = Cycle(ticker="AAPL")
        ts = datetime(2026, 1, 2, tzinfo=timezone.utc)
        cycle.apply_event(
            CycleEvent.SELL_CSP,
            option_legs=[put_sell("180", "2.50", date(2026, 1, 16))],
            timestamp=ts,
        )
        t2 = cycle.apply_event(CycleEvent.CSP_EXPIRE_OTM, timestamp=ts + timedelta(days=14))

        self.assertEqual(t2.from_state, CycleState.CSP_OPEN)
        self.assertEqual(t2.to_state, CycleState.CSP_CLOSED)
        self.assertEqual(cycle.state, CycleState.IDLE)

    def test_full_cycle_assignment_to_exit_and_metrics(self) -> None:
        cycle = Cycle(ticker="TSLA")
        start = datetime(2026, 1, 2, tzinfo=timezone.utc)
        cycle.apply_event(
            CycleEvent.SELL_CSP,
            option_legs=[put_sell("200", "3.00", date(2026, 1, 16))],
            timestamp=start,
        )
        cycle.apply_event(
            CycleEvent.CSP_ASSIGNED,
            stock_leg=StockLeg(action=StockAction.BUY, price=Decimal("200"), quantity=100),
            timestamp=start + timedelta(days=14),
        )
        cycle.apply_event(
            CycleEvent.SELL_CC,
            option_legs=[call_sell("210", "2.00", date(2026, 2, 20))],
            timestamp=start + timedelta(days=15),
        )
        cycle.apply_event(
            CycleEvent.CC_ASSIGNED,
            stock_leg=StockLeg(action=StockAction.SELL, price=Decimal("210"), quantity=100),
            timestamp=start + timedelta(days=45),
        )

        self.assertEqual(cycle.state, CycleState.EXIT)
        metrics = cycle.metrics()
        self.assertEqual(metrics.total_premium_collected, Decimal("5.00"))
        self.assertEqual(metrics.stock_pnl, Decimal("1000"))
        self.assertEqual(metrics.total_cycle_pnl, Decimal("1005.00"))
        self.assertGreater(metrics.annualized_return, Decimal("0"))

    def test_csp_roll_is_self_loop_and_counts_roll(self) -> None:
        cycle = Cycle(ticker="NVDA")
        cycle.apply_event(
            CycleEvent.SELL_CSP,
            option_legs=[put_sell("100", "2.00", date(2026, 3, 20))],
        )
        cycle.apply_event(
            CycleEvent.CSP_ROLL,
            option_legs=[
                OptionLeg(
                    type=OptionType.PUT,
                    action=OptionAction.BUY,
                    strike=Decimal("100"),
                    expiry=date(2026, 3, 20),
                    premium=Decimal("1.00"),
                ),
                put_sell("98", "2.50", date(2026, 4, 17)),
            ],
        )

        self.assertEqual(cycle.state, CycleState.CSP_OPEN)
        metrics = cycle.metrics()
        self.assertEqual(metrics.total_premium_collected, Decimal("3.50"))
        self.assertEqual(metrics.roll_count, 1)

    def test_cc_roll_and_expire_otm_keep_stock_held(self) -> None:
        cycle = Cycle(ticker="MSFT")
        start = datetime(2026, 1, 1, tzinfo=timezone.utc)
        cycle.apply_event(
            CycleEvent.SELL_CSP,
            option_legs=[put_sell("400", "4.00", date(2026, 1, 15))],
            timestamp=start,
        )
        cycle.apply_event(
            CycleEvent.CSP_ASSIGNED,
            stock_leg=StockLeg(action=StockAction.BUY, price=Decimal("400"), quantity=100),
            timestamp=start + timedelta(days=14),
        )
        cycle.apply_event(
            CycleEvent.SELL_CC,
            option_legs=[call_sell("420", "3.00", date(2026, 2, 20))],
            timestamp=start + timedelta(days=15),
        )
        cycle.apply_event(
            CycleEvent.CC_ROLL,
            option_legs=[
                OptionLeg(
                    type=OptionType.CALL,
                    action=OptionAction.BUY,
                    strike=Decimal("420"),
                    expiry=date(2026, 2, 20),
                    premium=Decimal("1.00"),
                ),
                call_sell("425", "1.50", date(2026, 3, 20)),
            ],
            timestamp=start + timedelta(days=30),
        )
        cycle.apply_event(
            CycleEvent.CC_EXPIRE_OTM,
            timestamp=start + timedelta(days=80),
        )

        self.assertEqual(cycle.state, CycleState.STOCK_HELD)
        self.assertEqual(cycle.current_position.shares, 100)
        metrics = cycle.metrics()
        self.assertEqual(metrics.roll_count, 1)

    def test_partial_assignment_treated_as_full_assignment_in_mvp(self) -> None:
        cycle = Cycle(ticker="AMD")
        cycle.apply_event(
            CycleEvent.SELL_CSP,
            option_legs=[put_sell("100", "1.00", date(2026, 1, 15))],
        )
        cycle.apply_event(
            CycleEvent.CSP_ASSIGNED,
            stock_leg=StockLeg(action=StockAction.BUY, price=Decimal("100"), quantity=50),
        )

        self.assertEqual(cycle.state, CycleState.STOCK_HELD)
        self.assertEqual(cycle.current_position.shares, 100)

    def test_partial_assignment_normalizes_metrics_to_contract_size(self) -> None:
        cycle = Cycle(ticker="AMD")
        start = datetime(2026, 1, 2, tzinfo=timezone.utc)
        cycle.apply_event(
            CycleEvent.SELL_CSP,
            option_legs=[put_sell("100", "1.00", date(2026, 1, 16))],
            timestamp=start,
        )
        cycle.apply_event(
            CycleEvent.CSP_ASSIGNED,
            stock_leg=StockLeg(action=StockAction.BUY, price=Decimal("100"), quantity=50),
            timestamp=start + timedelta(days=14),
        )
        cycle.apply_event(
            CycleEvent.SELL_CC,
            option_legs=[call_sell("110", "1.00", date(2026, 2, 20))],
            timestamp=start + timedelta(days=15),
        )
        cycle.apply_event(
            CycleEvent.CC_ASSIGNED,
            stock_leg=StockLeg(action=StockAction.SELL, price=Decimal("110"), quantity=50),
            timestamp=start + timedelta(days=45),
        )

        metrics = cycle.metrics()
        self.assertEqual(metrics.stock_pnl, Decimal("1000"))
        self.assertEqual(metrics.total_cycle_pnl, Decimal("1002.00"))

    def test_illegal_transition_is_rejected(self) -> None:
        cycle = Cycle(ticker="AAPL")
        with self.assertRaises(InvalidTransitionError):
            cycle.apply_event(CycleEvent.SELL_CC)

    def test_roll_requires_buy_and_sell_legs(self) -> None:
        cycle = Cycle(ticker="AAPL")
        cycle.apply_event(
            CycleEvent.SELL_CSP,
            option_legs=[put_sell("180", "2.00", date(2026, 1, 15))],
        )
        with self.assertRaises(ValueError):
            cycle.apply_event(
                CycleEvent.CSP_ROLL,
                option_legs=[put_sell("175", "2.50", date(2026, 2, 15))],
            )


if __name__ == "__main__":
    unittest.main()
