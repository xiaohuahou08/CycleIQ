---
name: CycleIQ MVP Architecture
overview: Design an extensible CycleIQ architecture that models Wheel Strategy cycles, produces broker-ready orders, and supports a full live-trading execution pipeline in dry-run mode first, with a broker adapter abstraction targeted at moomoo (system→broker data flow).
todos:
  - id: define-core-domain-models
    content: Define normalized domain types (Money/Quantity, OptionContract, EquityPosition), and align wheel FSM with these types.
    status: pending
  - id: order-intents-and-planner
    content: Implement OrderIntent + Wheel order planner that maps FSM state+signals into broker-agnostic intents.
    status: pending
  - id: risk-policy-layer
    content: Implement MVP risk policies (cash collateral, max contracts, max per-symbol exposure, DTE guardrails) and make it a required gate before execution.
    status: pending
  - id: oms-and-event-store
    content: Implement OMS lifecycle with idempotency, retries, and an event store persisted to Supabase Postgres (upgrade path to a dedicated worker for live trading).
    status: pending
  - id: broker-abstraction-and-simulated-client
    content: Create BrokerClient interface and a SimulatedBrokerClient that can generate acks/fills for dry-run end-to-end flows.
    status: pending
  - id: moomoo-adapter-scaffold
    content: Add Moomoo broker adapter scaffold: request/response mapping, auth placeholders, capability declaration, and contract tests (no real trades yet).
    status: pending
  - id: supabase-schema-and-rls
    content: Design Supabase Postgres schema + RLS policies for multi-tenant users, cycles, order intents, OMS state, and audit events.
    status: pending
  - id: vercel-web-ui
    content: Build a full web UI on Vercel (Next.js): auth, dashboard, cycles, order planning, risk review, approvals, execution monitor, reports, and settings.
    status: pending
  - id: vercel-control-plane-api
    content: Add Next.js server routes as a control plane API that calls Supabase and triggers dry-run execution; keep execution logic out of the browser.
    status: pending
  - id: ui-theme-system
    content: "Implement a finance/trading UI theme system (CSS variables + Tailwind): default palette, dark mode, and per-user configurable theme stored in Supabase."
    status: pending
  - id: demo-data-and-sandbox
    content: "Add demo seed data + sandbox mode: create sample cycles/intents/executions with deterministic simulated fills for UI demos."
    status: pending
  - id: testing-and-ci
    content: Add layered tests (unit/integration/e2e) and minimal CI to validate planning→approval→execution flows with demo scenarios.
    status: pending
  - id: github-issue-to-deploy-loop
    content: Implement an Issue→Dev→Test→Deploy closed-loop workflow (templates, branch/PR conventions, CI, preview deploys, prod deploys, and issue auto-linking/closing).
    status: pending
  - id: local-cli-optional
    content: Optional: keep a minimal CLI for developer workflows (seed data, run simulations, quick checks).
    status: pending
isProject: false
---

## Goals

- Provide an end-to-end **Wheel Strategy decision→order→execution** pipeline.
- Ensure the primary data flow is **CycleIQ → Broker** (orders, cancels, modifications), while still ingesting **broker acknowledgements/fills** for reconciliation.
- Keep the system extensible for multiple brokers, additional strategies, more complex position sizing/risk, and production-grade reliability.
- Deliver a **complete web UI** with user auth, cycle management, planning, approvals, execution monitoring, and reporting.

## Current Repo State (as of April 2026)

### ✅ Completed

- **Wheel Strategy FSM** in `cycleiq/wheel_fsm.py` - Full state machine with 6 states (IDLE, CSP_OPEN, CSP_CLOSED, STOCK_HELD, CC_OPEN, EXIT)
- **Core events** - SELL_CSP, CSP_EXPIRE_OTM, CSP_ASSIGNED, CSP_ROLL, SELL_CC, CC_EXPIRE_OTM, CC_ASSIGNED, CC_ROLL
- **Metrics calculation** - total_premium_collected, stock_pnl, total_cycle_pnl, days_in_cycle, annualized_return, win_rate, roll_count
- **Unit tests** in `tests/test_wheel_fsm.py` - Comprehensive test coverage for FSM transitions
- **Documentation** - Strategy guide, FSM MVP docs, terminology glossary, quick reference

### ❌ Not Yet Implemented

- **Next.js web app** - No web UI or control-plane API yet
- **Supabase integration** - No database schema or auth integration
- **Order planning layer** - No OrderIntent or WheelPlanner yet
- **Risk/policy layer** - No risk validation yet
- **OMS/execution layer** - No order management system
- **Broker adapters** - No broker abstraction yet

## Current repo baseline (what we build on)

- Wheel cycle domain model exists as an MVP FSM in `cycleiq/wheel_fsm.py` with tests in `tests/test_wheel_fsm.py`.
- Strategy docs are in `docs/` and describe wheel flow, roll guidance, and risk guardrails.

## Deployment target (Chosen: Next.js full stack on Vercel + Supabase)

- **Supabase**: Postgres DB + Auth + RLS + optional Realtime
- **Vercel**: Next.js Web UI + Next.js server routes as the **control plane API**
- **Execution (MVP)**: dry-run via `SimulatedBrokerClient` invoked from control plane routes
- **Execution (future)**: dedicated worker/service for live trading reliability (same OMS + broker adapter contracts)

## Local development (run everything on your machine)

### Supported modes

- Mode 1 (recommended): **Local Supabase + Local Next.js**\n  - Pros: closest to production behavior (RLS, Auth), fast iteration, works offline\n  - Cons: requires Supabase CLI\n- Mode 2: **Remote Supabase + Local Next.js**\n  - Pros: fastest setup\n  - Cons: depends on network; risk of polluting shared staging/prod if misconfigured\n+
### Environment variables and key placement

Use standard Next.js conventions:\n- Local dev: `apps/web/.env.local` (gitignored)\n- Vercel Preview/Prod: Vercel Project Settings → Environment Variables\n+
Supabase keys (critical):\n- `NEXT_PUBLIC_SUPABASE_URL` (public)\n- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (public; safe to expose)\n- `SUPABASE_SERVICE_ROLE_KEY` (server-only; NEVER expose; only in Next.js server runtime)\n+
App runtime:\n- `NEXT_PUBLIC_APP_ENV` (e.g. `local|preview|prod`)\n- `APP_BASE_URL` (server-only; used for absolute URLs / webhooks later)\n+
Dev-only tooling:\n- `ENABLE_DEV_ROUTES` (`true|false`) to guard `/api/dev/seed` and `/api/dev/reset`\n- `DEMO_SEED` (optional fixed seed)\n+
Vercel deployment:\n- Preview and production each get their own Supabase project keys (recommended) OR a strict staging separation strategy\n- Ensure `SUPABASE_SERVICE_ROLE_KEY` is set only for server environment (Vercel)\n+
### Key handling rules

- Browser may only use `NEXT_PUBLIC_*` values.\n- Any operation that bypasses RLS (admin, migrations, global reconciliation) must run server-side with `SUPABASE_SERVICE_ROLE_KEY`.\n- Broker credentials are server-side only (later); never in `NEXT_PUBLIC_*`.\n+
### Local start checklist (MVP)

1) Start Supabase (Mode 1) OR set remote keys (Mode 2)\n2) Apply migrations / schema setup\n3) Run Next.js dev server\n4) Login\n5) Seed demo data\n6) Validate Plan → Approve → Execute dry-run flow\n

## Target architecture (high level)

- **Domain layer** (strategy + portfolio): wheel cycle state machine, positions, constraints, signals.
- **Planning layer** (orders): converts domain decisions into **OrderIntent** objects (what we want to do).
- **Risk/Policy layer**: validates intents against account rules (cash collateral, max exposure, event risk, etc.).
- **Execution layer (OMS)**: turns intents into broker-specific **BrokerOrderRequest** and drives the full lifecycle (submit/cancel/replace), with idempotency + retries.
- **Broker adapters**: implement a uniform `BrokerClient` interface; first target is `MoomooBrokerClient`.
- **Reconciliation + audit**: persists events and external IDs to support replay and compliance.
- **Control plane API**: Next.js server routes orchestrate planning/risk/execution and write immutable audit events to Supabase.
- **Web UI**: Next.js app provides user interface for cycle management, trading, and reporting.

### Data flow diagram

```mermaid
flowchart TD
  UI[NextJSWebUI] --> CP[ControlPlaneAPI]
  CP --> Planner[OrderPlanner]
  Planner --> Risk[RiskAndPolicy]
  Risk --> OMS[OrderManagementService]
  OMS --> Broker[BrokerClient(Adapter)]
  Broker -->|submit/cancel/replace| Moomoo[MoomooAPI]
  Moomoo -->|acks/fills/status| Broker
  Broker --> OMS
  CP --> Store[SupabasePostgres]
  OMS --> Store
  Store --> UI
```



## Key design decisions for extensibility

- **Broker abstraction**: a stable interface around capabilities + order types; adapters translate to/from each broker.
- **Event sourcing-ish audit**: persist immutable domain/execution events (`CycleEvent`, `OrderEvent`) so future features (analytics, backtesting, debugging, compliance) can replay state.
- **Idempotency**: every outbound request carries a client order id; OMS de-duplicates across retries.
- **Capability negotiation**: adapters expose capabilities (supportsReplace, supportsOCO, supportsOptionsGreeks, etc.) so planner can degrade gracefully.
- **Strategy plugin boundary**: allow later adding non-wheel strategies without rewiring execution.
- **Web control plane boundary**: browser never talks to brokers; browser only calls the control plane, which enforces authz/policies and records audit logs.

## MVP scope (Dry-run, but full live-trading pipeline)

- **Inputs**: web UI actions (create cycle, request plan, approve, execute dry-run), plus optional CLI for dev.
- **Outputs**: generate broker-ready order requests and run them through OMS state transitions.
- **Execution mode**:
  - `SimulatedBrokerClient` executes deterministically (fills/partials) for testing.
  - `MoomooBrokerClient` exists as a scaffold with request/response models and auth placeholders, but does not place real trades until enabled.
- **Persistence**: Supabase Postgres as the primary store (MVP); local SQLite can be used only for local dev if needed.

## Concrete module layout (proposed)

- `cycleiq/domain/`:
  - `wheel_fsm.py` (move existing code here)
  - `positions.py`, `money.py`, `events.py`
- `cycleiq/planning/`:
  - `order_intents.py` (OrderIntent, legs, time-in-force)
  - `wheel_planner.py` (map wheel decisions → intents)
- `cycleiq/risk/`:
  - `policies.py` (collateral checks, max symbol exposure, DTE/delta guardrails)
- `cycleiq/execution/`:
  - `oms.py` (OrderLifecycle state machine)
  - `idempotency.py`, `retries.py`
- `cycleiq/brokers/`:
  - `base.py` (`BrokerClient`, capabilities, normalized models)
  - `simulated.py`
  - `moomoo.py` (adapter scaffold)
- `cycleiq/storage/`:
  - `event_store.py` (Supabase-backed), `models.py` (DB row models / DTOs)

## Web app layout (proposed)

### Next.js app (Vercel)

- `apps/web/`\n  - `app/` routes/pages: login, dashboard, cycles, orders (intents), executions, reports, settings\n  - `app/api/` server routes (control plane): plan orders, approve/reject, execute (dry-run), fetch status/metrics, dev seed/reset\n  - Supabase client setup for server + browser, using RLS for data access

## UI/UX design system (modern finance/trading)

### Style goals

- Modern trading dashboard feel: neutral surfaces, compact dense layouts, clear hierarchy\n- Dark mode first-class (and light mode supported)\n- Clear semantic colors for P&L and risk (not only color: add labels/icons)\n- Accessibility: contrast targets, keyboard navigation, readable typography

### Theme system (configurable)

- Use **CSS variables** as semantic tokens (no hard-coded component colors):\n  - Surfaces/text: `--bg`, `--panel`, `--text`, `--muted`, `--border`\n  - Actions/status: `--accent`, `--positive`, `--negative`, `--warning`, `--info`\n- Tailwind maps to these tokens so the entire UI themes consistently\n- Provide a default preset (finance palette) and allow per-user overrides

### Theme config persistence (Supabase)

- Add `ui_preferences` keyed by `user_id`:\n  - `theme_mode`: `light | dark | system`\n  - `theme_preset`: e.g. `terminal`\n  - `theme_tokens`: JSONB overrides (only deltas)\n- Enforce RLS so users can only read/write their own preferences

### Trading UI components (MVP set)

- `PnLBadge` (positive/negative)\n- `OrderStatusChip` (planned/approved/submitted/filled/canceled/failed)\n- `PositionsTable` / `OrdersTable` (compact)\n- `RiskChecklist` (derived from docs guardrails)\n- `OrderTicketPreview` (broker-agnostic)

## Web IA (information architecture) + lists + actions (MVP)

### Navigation (left rail)

- `Dashboard`\n- `Cycles`\n- `Orders` (intents)\n- `Executions`\n- `Reports`\n- `Settings` (theme + broker connections (placeholder))

### Dashboard (overview)

Primary widgets:\n- KPI tiles: total premium, realized PnL, annualized return (MVP estimate), open cycles count\n- “Action required” queue: intents pending approval, executions needing attention\n- Recent activity feed (immutable events)

### Cycles page

#### Cycles list (table)

Columns (MVP):\n- Ticker\n- State (`IDLE/CSP_OPEN/STOCK_HELD/CC_OPEN/EXIT`)\n- Current leg (strike/expiry if present)\n- Premium collected (to date)\n- Stock PnL (to date)\n- Total cycle PnL\n- Roll count\n- Updated at\n- Actions (row)

Default sorting:\n- `Updated at` desc (most recent first)\n
Filters:\n- State (multi-select)\n- Ticker (multi-select)\n- Date range (updated_at)\n- “Actionable only” (has pending intent / needs approval / has failed execution)\n
Search:\n- Global search box: matches ticker and cycle id\n
Row quick actions (terminal style):\n- Primary button: `Plan next step`\n- Secondary: `View`\n- Overflow menu: `Archive` (optional), `Copy cycle id`\n
Column sizing / pinning (MVP):\n- Pin left: `Ticker`\n- Pin right: `Actions`\n- Default compact density; allow density toggle (compact/comfortable)\n
Pagination & loading:\n- Server-side pagination (cursor or limit/offset), default page size 25\n- Column sorting performed server-side\n- “Keep previous data” during refetch to avoid table jank\n
Bulk actions (optional for MVP, recommended):\n- Multi-select rows\n- `Bulk plan next step` (guard with per-row validation; show a result summary)\n- `Bulk archive` (optional)\n
Row actions (enabled by state):\n- `Plan next step` (always; generates `OrderIntent` based on FSM state)\n- `View details` (opens cycle detail)\n- `Close/Archive` (optional; disable in MVP if needed)

#### Cycle detail

Sections:\n- Transition timeline (FSM `Transition` list)\n- Positions snapshot\n- Metrics panel\n- “Next action” panel:\n  - Order ticket preview\n  - Risk checklist summary\n  - Buttons: `Plan`, `Approve`, `Execute (Dry-run)`

### Orders page (OrderIntents)

#### Intents list (table)

Columns (MVP):\n- Created at\n- Ticker\n- Intent type (Sell CSP / Roll CSP / Sell CC / Roll CC / Exit)\n- Legs summary (type/strike/expiry/qty)\n- Estimated premium / cash impact\n- Risk status (pass/warn/fail)\n- Approval status (draft/pending/approved/rejected)\n- Actions (row)

Default sorting:\n- `Created at` desc\n
Filters:\n- Approval status (multi-select)\n- Risk status (multi-select)\n- Intent type (multi-select)\n- Ticker\n- Date range (created_at)\n
Search:\n- Matches ticker, intent id, linked cycle id\n
Row quick actions:\n- If `pending`: show `Approve` (primary) + `Reject`\n- If `approved`: show `Execute (Dry-run)` (primary)\n- If executed: show `View execution`\n- Overflow: `Duplicate`, `Copy intent id`\n
Column sizing / pinning (MVP):\n- Pin left: `Created at`, `Ticker`\n- Pin right: `Actions`\n- Make `Legs summary` flexible width (wrap/ellipsis + hover tooltip)\n
Pagination & loading:\n- Server-side pagination, default page size 25\n- Prefetch next page on hover/scroll end (optional)\n
Bulk actions (recommended):\n- Multi-select intents\n- `Bulk approve` (only pending + risk pass/warn)\n- `Bulk reject`\n- `Bulk execute (dry-run)` (only approved + not executed)\n- Always show a confirmation dialog with counts and estimated cash impact\n
Row actions:\n- `View`\n- `Approve` (only if risk not failed; otherwise require override role)\n- `Reject`\n- `Execute (Dry-run)` (only if approved)\n- `Duplicate` (optional)

Enable/disable rules (MVP):\n- Approve: requires `approval_status=pending` and `risk_status in (pass,warn)`\n- Execute: requires `approval_status=approved` and not already executed (idempotency key)\n- Reject: allowed until executed\n

### Executions page (OMS)

#### Executions list (table)

Columns (MVP):\n- Started at\n- Ticker\n- Linked intent\n- OMS status (planned/submitted/acked/partially_filled/filled/canceled/failed)\n- Broker (simulated/moomoo)\n- Client order id\n- External order id (nullable)\n- Last update\n- Actions (row)

Default sorting:\n- `Last update` desc\n
Filters:\n- OMS status (multi-select)\n- Broker (simulated/moomoo)\n- Ticker\n- Date range (started_at)\n- “Needs attention” (failed, partially filled, retryable)\n
Search:\n- Matches client order id, external order id, execution id\n
Row quick actions:\n- If `failed`: show `Retry` (primary)\n- If active: show `Cancel` (primary)\n- Always: `View`\n- Overflow: `Copy ids`, `Download event log (JSON)` (optional)\n
Column sizing / pinning (MVP):\n- Pin left: `Started at`, `Ticker`\n- Pin right: `Actions`\n- Keep IDs truncated with copy-to-clipboard affordance\n
Pagination & loading:\n- Server-side pagination\n- Auto-refresh while the table has active executions (polling with backoff or realtime)\n
Bulk actions (optional):\n- Multi-select executions\n- `Bulk cancel` (only cancelable statuses)\n- `Bulk retry` (only retryable failed)\n- Confirmation required; results summarized per row\n
Row actions:\n- `View`\n- `Cancel` (if status allows)\n- `Retry` (if failed + safe)\n- `Replace` (optional; may be simulated-only in MVP)

### Reports page

MVP reports:\n- Cycle PnL breakdown\n- Premium income over time\n- Win rate proxy + roll count\n- Export CSV (optional)

### Settings page

MVP settings:\n- Theme mode (light/dark/system)\n- Theme preset selection\n- Token overrides editor (advanced)\n- Broker connections (placeholder for moomoo; store metadata but do not live trade yet)

### Core user flow (Plan → Approve → Execute)

1. User selects a Cycle or starts from Dashboard “Action required”\n2) Click `Plan next step` → server computes intent, runs risk policies, writes `order_intents` + audit events\n3) User reviews ticket + risk checklist → `Approve` or `Reject`\n4) Click `Execute (Dry-run)` → server invokes OMS with `SimulatedBrokerClient`, writes execution rows + events\n5) UI updates via polling/realtime and shows final status + updated cycle metrics\n

## Supabase schema (MVP outline)

- `profiles` (user metadata, maps to auth user id)
- `cycles` (wheel cycles, per user)
- `cycle_transitions` (immutable transitions, mirrors FSM transitions)
- `order_intents` (broker-agnostic planned orders)
- `order_executions` (OMS lifecycle state, idempotency keys, external ids)
- `execution_events` (immutable audit trail; request/ack/fill/cancel/retry, etc.)

RLS:\n- All tables scoped by `user_id` (or `account_id`) and enforced via policies.\n- Server routes use a service role key only when necessary (e.g., admin reconciliation jobs); prefer user-scoped access by default.

## Testing strategy

- Keep existing unit tests for wheel FSM.
- Add tests for:
  - OrderIntent generation from wheel states/events.
  - Risk policies (reject/approve).
  - OMS idempotency + retry behavior.
  - Broker adapter contract tests (simulated + moomoo stub).
  - Control plane API integration tests (plan→approve→execute dry-run writes correct DB rows/events).

## Demo data (seed) + sandbox mode

### Goals

- Provide a credible “trading terminal” demo without real broker connectivity.\n- Ensure every demo is deterministic and repeatable for screenshots, QA, and onboarding.\n- Allow resetting to a clean baseline quickly.\n

### Seed dataset (MVP)

- A small set of tickers (e.g. AAPL/TSLA/NVDA/MSFT/AMD) with prebuilt cycles that cover:\n  - CSP expires OTM (win)\n  - CSP assigned → CC expires OTM (hold shares)\n  - CSP assigned → CC assigned (exit)\n  - Roll CSP and Roll CC paths\n- For each cycle: transitions timeline + intents + executions + events so all UI pages are populated.\n

### Market data mock (UI-only, MVP)

Purpose:\n- Provide believable quotes/IV/DTE/Greeks in the UI and allow planner/risk to show estimates without live data.\n- Keep outputs deterministic for demos, tests, and screenshots.\n
Data model (normalized):\n- `Quote`: last, bid, ask, as_of\n- `OptionChainPoint` (minimal): type (PUT/CALL), strike, expiry, bid/ask/mark, delta (approx), iv (approx), dte\n
How it's produced:\n- `MarketDataProvider` interface with:\n  - `MockMarketDataProvider` (default for MVP; seeded deterministic)\n  - `RealMarketDataProvider` (future; external feed or broker market data)\n- Mock generator rules:\n  - Per-ticker baseline price + deterministic drift (seeded)\n  - DTE derived from expiry and `as_of`\n  - Delta/IV approximated with simple heuristics (MVP; labeled as estimate)\n
Where it's used:\n- Tables/tickets: show mark/bid/ask, IV, DTE, delta hints\n- Planner: show a “suggested strikes” shortlist from the mock chain\n- Risk UI: show collateral estimate and premium ranges\n
Storage:\n- Option A: generate on the fly in server routes; do not persist\n- Option B: persist snapshots in Supabase (`market_quotes`, `market_option_points`) keyed by `as_of` + ticker for repeatable demos\n
Labeling & safety:\n- UI must clearly label mock data (e.g. “Simulated quote/IV”).\n- Execution uses explicit user-confirmed order params; mock values are for display and MVP heuristics only.\n

### How to generate

- A server route (control plane) `POST /api/dev/seed` guarded by env flag (dev-only)\n- Optionally a CLI script for local dev (`seed-demo-data`)\n- Use `SimulatedBrokerClient` with a fixed RNG seed and scripted fill scenarios (full fill, partial fill, fail+retry)\n

### Reset / teardown

- `POST /api/dev/reset` to wipe demo tables for the current user (dev-only)\n- Provide a “Reset demo data” button under Settings (only visible in dev)\n

## Testing (expanded)

### Unit tests

- Domain: wheel FSM (already), planner mapping, risk policies, OMS state transitions\n- Deterministic simulated fills (scenario-based)\n

### Integration tests (control plane + Supabase)

- Plan → approve → execute (dry-run) creates the expected rows:\n  - `cycles`, `cycle_transitions`, `order_intents`, `order_executions`, `execution_events`\n- RLS sanity tests: user A cannot read/write user B rows\n

### E2E UI tests

- Critical flows:\n  - Login → seed demo → view cycles → plan intent → approve → execute → see execution status update\n  - Filters/search/bulk actions on Orders and Executions\n  - Theme switching (light/dark/system + preset)\n- Prefer Playwright for Next.js UI e2e; run against seeded demo data\n

### CI entry points (minimal)

- Lint + typecheck (web)\n- Unit tests (python + web)\n- A small e2e suite (headless) using demo seed (can be optional initially)\n

## GitHub Issue → Dev/Test → Deploy closed loop

### Goals

- Turn issues into trackable PRs with consistent automation.\n- Ensure every PR gets repeatable checks + preview deployment.\n- Ensure merges to `main` produce a production deployment with a clear audit trail.\n- Keep DB migrations safe with Supabase.\n

### Conventions

- Default branch: `main`\n- Work branches: `feat/<issueId>-short-slug`, `fix/<issueId>-short-slug`, `chore/<issueId>-short-slug`\n- PR title: `type: summary (#issueId)`\n- Always link PR ↔ Issue using GitHub keywords: `Fixes #123` / `Closes #123`\n

### GitHub configuration (repo)

- Issue templates:\n  - Bug report\n  - Feature request\n  - Spike/Research\n- Labels: `type/`*, `area/web`, `area/domain`, `area/broker`, `area/db`, `risk/high`, `good-first-issue`\n- Pull request template:\n  - Summary\n  - Test plan (unit/integration/e2e)\n  - Screenshots (for UI)\n  - Migration notes (Supabase)\n- (Optional) GitHub Projects board for status columns: Triage → In progress → In review → Done\n

### CI checks (GitHub Actions)

Required checks on PR:\n- Web: lint + typecheck + unit tests\n- Python: unit tests\n- Integration: control-plane API tests (can run with a local Supabase stub or mocked layer initially)\n- E2E: Playwright smoke suite (can be required later; start optional)\n

### Preview deployments (Vercel)

- Every PR triggers a Vercel Preview URL.\n- E2E can run against the Preview (optional later).\n- Use environment isolation:\n  - Preview uses a dedicated Supabase project or a preview schema strategy.\n  - If full isolation is too heavy for MVP: allow Preview to use a shared “staging” Supabase with strict per-PR prefixes for demo data and cleanup jobs.\n

### Production deployments

- Merge to `main` triggers Vercel Production deployment.\n- Supabase migrations applied via:\n  - A migration tool (SQL migrations tracked in repo)\n  - A CI job that applies migrations to the production Supabase project with guarded approvals (environment protection)\n

### Database migration strategy (Supabase)

- Migrations are versioned and reviewed in PRs.\n- Each migration includes:\n  - forward SQL\n  - rollback SQL (when feasible)\n- For risky migrations: use expand/contract pattern.\n

### Release & issue closure

- When PR merges with `Fixes #id`, GitHub auto-closes the issue.\n- (Optional) Auto-generate release notes (GitHub Releases) from merged PR labels.\n

## Security & secrets

- Never commit `.env`; use `.env` only for local.
- Add a `config` model that supports per-broker credentials and rotation.
- For future: OS keychain / secret manager integration.
- For web: keep broker credentials server-side only; enforce least-privilege between Supabase anon key (browser) and service role (server).

## Future expansion paths (explicitly reserved)

- Multi-account & subaccounts.
- Additional strategies beyond wheel.
- Web UI + API service.
- Post-trade analytics, tax lots, corporate actions.
- Real broker connectivity for moomoo and others (IBKR, Tradier, etc.) via additional adapters.
- Dedicated execution worker with queue (for true live trading reliability) while preserving the same broker adapter + OMS contracts.

