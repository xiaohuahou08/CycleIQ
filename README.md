# CycleIQ
CycleIQ is a decision intelligence system for options traders using wheel strategies. It reconstructs trades into full strategy cycles—cash-secured puts, assignments, covered calls, and exits—turning fragmented broker data into clear insights on income, risk, and capital efficiency.

## Wheel Strategy FSM (MVP)

The MVP finite state machine implementation lives in:

- `cycleiq/wheel_fsm.py`
- `tests/test_wheel_fsm.py`

It defines six states (`IDLE`, `CSP_OPEN`, `CSP_CLOSED`, `STOCK_HELD`, `CC_OPEN`, `EXIT`), validates event-driven transitions, records transition history, and computes core cycle metrics.
