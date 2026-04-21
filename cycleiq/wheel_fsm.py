from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime, timezone
from decimal import Decimal
from enum import Enum
from typing import Iterable
from uuid import UUID, uuid4


class CycleState(str, Enum):
    IDLE = "IDLE"
    CSP_OPEN = "CSP_OPEN"
    CSP_CLOSED = "CSP_CLOSED"
    STOCK_HELD = "STOCK_HELD"
    CC_OPEN = "CC_OPEN"
    EXIT = "EXIT"


class CycleEvent(str, Enum):
    SELL_CSP = "SELL_CSP"
    CSP_EXPIRE_OTM = "CSP_EXPIRE_OTM"
    CSP_ASSIGNED = "CSP_ASSIGNED"
    CSP_ROLL = "CSP_ROLL"
    SELL_CC = "SELL_CC"
    CC_EXPIRE_OTM = "CC_EXPIRE_OTM"
    CC_ASSIGNED = "CC_ASSIGNED"
    CC_ROLL = "CC_ROLL"


class OptionType(str, Enum):
    PUT = "PUT"
    CALL = "CALL"


class OptionAction(str, Enum):
    SELL = "SELL"
    BUY = "BUY"


class StockAction(str, Enum):
    BUY = "BUY"
    SELL = "SELL"


@dataclass(frozen=True)
class OptionLeg:
    type: OptionType
    action: OptionAction
    strike: Decimal
    expiry: date
    premium: Decimal
    quantity: int = 1
    assigned: bool = False


@dataclass(frozen=True)
class StockLeg:
    action: StockAction
    price: Decimal
    quantity: int = 100


@dataclass(frozen=True)
class Position:
    shares: int = 0
    strike: Decimal | None = None
    expiry: date | None = None


@dataclass(frozen=True)
class Transition:
    from_state: CycleState
    to_state: CycleState
    event: CycleEvent
    timestamp: datetime
    option_legs: tuple[OptionLeg, ...] = ()
    stock_leg: StockLeg | None = None


@dataclass(frozen=True)
class CycleMetrics:
    total_premium_collected: Decimal
    stock_pnl: Decimal
    total_cycle_pnl: Decimal
    days_in_cycle: int
    annualized_return: Decimal
    win_rate: Decimal
    roll_count: int


class InvalidTransitionError(ValueError):
    pass


@dataclass
class Cycle:
    ticker: str
    id: UUID = field(default_factory=uuid4)
    state: CycleState = CycleState.IDLE
    current_position: Position = field(default_factory=Position)
    transitions: list[Transition] = field(default_factory=list)
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    _capital_at_risk: Decimal = field(default=Decimal("0"))

    _ALLOWED_TRANSITIONS: dict[tuple[CycleState, CycleEvent], CycleState] = field(
        default_factory=lambda: {
            (CycleState.IDLE, CycleEvent.SELL_CSP): CycleState.CSP_OPEN,
            (CycleState.CSP_OPEN, CycleEvent.CSP_EXPIRE_OTM): CycleState.CSP_CLOSED,
            (CycleState.CSP_OPEN, CycleEvent.CSP_ASSIGNED): CycleState.STOCK_HELD,
            (CycleState.CSP_OPEN, CycleEvent.CSP_ROLL): CycleState.CSP_OPEN,
            (CycleState.STOCK_HELD, CycleEvent.SELL_CC): CycleState.CC_OPEN,
            (CycleState.CC_OPEN, CycleEvent.CC_EXPIRE_OTM): CycleState.STOCK_HELD,
            (CycleState.CC_OPEN, CycleEvent.CC_ASSIGNED): CycleState.EXIT,
            (CycleState.CC_OPEN, CycleEvent.CC_ROLL): CycleState.CC_OPEN,
        }
    )

    def apply_event(
        self,
        event: CycleEvent,
        option_legs: Iterable[OptionLeg] | None = None,
        stock_leg: StockLeg | None = None,
        timestamp: datetime | None = None,
    ) -> Transition:
        to_state = self._ALLOWED_TRANSITIONS.get((self.state, event))
        if to_state is None:
            raise InvalidTransitionError(f"Illegal transition: {self.state} -> {event}")

        timestamp = timestamp or datetime.now(timezone.utc)
        legs = tuple(option_legs or ())
        self._validate_event_payload(event, legs, stock_leg)

        transition = Transition(
            from_state=self.state,
            to_state=to_state,
            event=event,
            timestamp=timestamp,
            option_legs=legs,
            stock_leg=stock_leg,
        )
        self.transitions.append(transition)
        self.state = to_state
        self._apply_position_update(to_state, event, legs, stock_leg)
        self.updated_at = timestamp
        if to_state == CycleState.CSP_CLOSED:
            self.state = CycleState.IDLE
            self.current_position = Position()
        return transition

    def metrics(self, as_of: datetime | None = None) -> CycleMetrics:
        as_of = as_of or datetime.now(timezone.utc)
        total_premium = Decimal("0")
        stock_pnl = Decimal("0")
        option_sells = 0
        unassigned_expiries = 0
        roll_count = 0
        capital_at_risk = self._capital_at_risk

        for transition in self.transitions:
            if transition.event in (CycleEvent.CSP_ROLL, CycleEvent.CC_ROLL):
                roll_count += 1
            if transition.event in (CycleEvent.CSP_EXPIRE_OTM, CycleEvent.CC_EXPIRE_OTM):
                unassigned_expiries += 1
            for leg in transition.option_legs:
                sign = Decimal("1") if leg.action == OptionAction.SELL else Decimal("-1")
                total_premium += sign * leg.premium
                if leg.action == OptionAction.SELL:
                    option_sells += 1
                if leg.type == OptionType.PUT and leg.action == OptionAction.SELL:
                    capital_at_risk = max(
                        capital_at_risk, leg.strike * Decimal(str(abs(leg.quantity) * 100))
                    )
            if transition.stock_leg:
                stock_sign = (
                    Decimal("-1")
                    if transition.stock_leg.action == StockAction.BUY
                    else Decimal("1")
                )
                stock_pnl += stock_sign * transition.stock_leg.price * Decimal(
                    str(abs(transition.stock_leg.quantity))
                )
                if transition.stock_leg.action == StockAction.BUY:
                    capital_at_risk = max(
                        capital_at_risk,
                        transition.stock_leg.price
                        * Decimal(str(abs(transition.stock_leg.quantity))),
                    )

        total_cycle_pnl = total_premium + stock_pnl
        days = 0
        if self.transitions:
            start = self.transitions[0].timestamp.date()
            end = as_of.date() if self.state != CycleState.EXIT else self.updated_at.date()
            days = max(1, (end - start).days)

        annualized_return = Decimal("0")
        if days > 0 and capital_at_risk > 0:
            annualized_return = (total_cycle_pnl / capital_at_risk) * Decimal(365 / days)

        win_rate = (
            Decimal(unassigned_expiries) / Decimal(option_sells)
            if option_sells > 0
            else Decimal("0")
        )
        return CycleMetrics(
            total_premium_collected=total_premium,
            stock_pnl=stock_pnl,
            total_cycle_pnl=total_cycle_pnl,
            days_in_cycle=days,
            annualized_return=annualized_return,
            win_rate=win_rate,
            roll_count=roll_count,
        )

    @staticmethod
    def _last_sell_leg(legs: tuple[OptionLeg, ...]) -> OptionLeg | None:
        for leg in reversed(legs):
            if leg.action == OptionAction.SELL:
                return leg
        return None

    def _apply_position_update(
        self,
        to_state: CycleState,
        event: CycleEvent,
        option_legs: tuple[OptionLeg, ...],
        stock_leg: StockLeg | None,
    ) -> None:
        if to_state == CycleState.CSP_OPEN:
            sell_leg = self._last_sell_leg(option_legs)
            self.current_position = Position(
                shares=0,
                strike=sell_leg.strike if sell_leg else self.current_position.strike,
                expiry=sell_leg.expiry if sell_leg else self.current_position.expiry,
            )
            return

        if to_state == CycleState.STOCK_HELD:
            if stock_leg and stock_leg.action == StockAction.BUY:
                self.current_position = Position(shares=100, strike=stock_leg.price, expiry=None)
                self._capital_at_risk = max(
                    self._capital_at_risk,
                    stock_leg.price * Decimal(str(abs(stock_leg.quantity))),
                )
            return

        if to_state == CycleState.CC_OPEN:
            sell_leg = self._last_sell_leg(option_legs)
            self.current_position = Position(
                shares=100,
                strike=sell_leg.strike if sell_leg else self.current_position.strike,
                expiry=sell_leg.expiry if sell_leg else self.current_position.expiry,
            )
            return

        if to_state == CycleState.EXIT:
            self.current_position = Position()
            return

        if event == CycleEvent.CC_EXPIRE_OTM:
            self.current_position = Position(shares=100, strike=None, expiry=None)
            return

    @staticmethod
    def _validate_event_payload(
        event: CycleEvent, option_legs: tuple[OptionLeg, ...], stock_leg: StockLeg | None
    ) -> None:
        if event == CycleEvent.SELL_CSP:
            if len(option_legs) != 1:
                raise ValueError("SELL_CSP requires one option leg")
            leg = option_legs[0]
            if leg.type != OptionType.PUT or leg.action != OptionAction.SELL:
                raise ValueError("SELL_CSP requires one sold PUT leg")
            return

        if event == CycleEvent.CSP_ASSIGNED:
            if not stock_leg or stock_leg.action != StockAction.BUY:
                raise ValueError("CSP_ASSIGNED requires stock BUY leg")
            return

        if event == CycleEvent.CSP_ROLL:
            Cycle._validate_roll(option_legs, OptionType.PUT)
            return

        if event == CycleEvent.SELL_CC:
            if len(option_legs) != 1:
                raise ValueError("SELL_CC requires one option leg")
            leg = option_legs[0]
            if leg.type != OptionType.CALL or leg.action != OptionAction.SELL:
                raise ValueError("SELL_CC requires one sold CALL leg")
            return

        if event == CycleEvent.CC_ASSIGNED:
            if not stock_leg or stock_leg.action != StockAction.SELL:
                raise ValueError("CC_ASSIGNED requires stock SELL leg")
            return

        if event == CycleEvent.CC_ROLL:
            Cycle._validate_roll(option_legs, OptionType.CALL)

    @staticmethod
    def _validate_roll(option_legs: tuple[OptionLeg, ...], option_type: OptionType) -> None:
        if len(option_legs) != 2:
            raise ValueError("Roll requires exactly two option legs")
        actions = {leg.action for leg in option_legs}
        if actions != {OptionAction.SELL, OptionAction.BUY}:
            raise ValueError("Roll requires one buy-to-close and one sell-to-open")
        if any(leg.type != option_type for leg in option_legs):
            raise ValueError(f"Roll requires {option_type.value} legs")

