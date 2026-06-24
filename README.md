# CycleIQ — Wheel Strategy Tracker

> Track your options wheel cycles from CSP to assignment to covered call — with clear analytics and no spreadsheets.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub stars](https://img.shields.io/github/stars/xiaohuahou08/CycleIQ?style=social)](https://github.com/xiaohuahou08/CycleIQ/stargazers)

---

## What is CycleIQ?

CycleIQ is a web app for retail options traders running the **Wheel Strategy**. It reconstructs your broker's fragmented trade data into coherent cycles so you can track premium income, P&L, and next steps without spreadsheets.

**Core workflow:**
```
Sell CSP → (Assigned) → Hold Stock → Sell CC → (Called Away / Expired) → Repeat
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | [Next.js 16](https://nextjs.org/) (App Router) + React 19 + TypeScript |
| **Styling** | Tailwind CSS v4 |
| **Auth** | Supabase Auth (JWT: ES256 via JWKS / HS256 legacy) |
| **Backend** | Flask 3.x (Python) |
| **ORM** | SQLAlchemy + Alembic migrations |
| **Database** | PostgreSQL via Supabase + Row Level Security |
| **External API** | Yahoo Finance / Finnhub (live stock prices) |
| **Deployment** | Vercel (frontend) + Render (backend) |

> **Note:** A legacy Vite+React prototype lives in `frontend/`. The active application is `apps/web` (Next.js).

---

## Features

- **Wheel cycle tracking** — CSP → assignment → CC → exit lifecycle per ticker, with roll chains preserved
- **Dashboard** — Capital invested, total premium, realized P&L, win rate, open premium yield, and income charts
- **Trade log** — Manual entry with expire, roll, assign, buy-to-close, and live quote context
- **Cycles view** — Wheel fan diagram, per-leg net P&L, and **CC cost basis** per open wheel
- **Trading defaults** — Per-contract commission and defaults stored in browser localStorage
- **Real-time prices** — Stock quotes fetched hourly via `/api/quote`
- **Per-user isolation** — Supabase RLS; JWT validated on Flask API (ES256 JWKS)

---

## Project Structure

```
CycleIQ/
├── apps/web/                  # Active frontend (Next.js 16)
│   ├── app/
│   │   ├── (protected)/       # Auth-gated: dashboard, trades, cycles, settings
│   │   ├── components/        # Sidebar, AuthShell, DatePicker, icons
│   │   ├── login/ register/   # Branded auth pages
│   │   └── page.tsx           # Marketing landing page
│   ├── lib/
│   │   ├── api/trades.ts      # All API client functions
│   │   └── supabase/          # Supabase client helpers
│   └── package.json
│
├── backend/                   # Flask API
│   ├── routes/
│   │   ├── trades.py          # /api/trades CRUD + expire/roll/assign
│   │   ├── cycles.py          # /api/cycles + FSM transitions
│   │   ├── dashboard.py       # /api/dashboard/insights
│   │   └── metrics.py         # /api/metrics
│   ├── auth/                  # Supabase JWT verification (ES256 JWKS + HS256)
│   ├── cycleiq/               # Wheel FSM domain logic
│   └── requirements.txt
│
├── frontend/                  # Legacy Vite prototype (not active)
├── docs/
├── README.md
└── LICENSE
```

---

## Quick Start

### Prerequisites

- Node.js 18+
- Python 3.11+

### Frontend (Next.js — active app)

```bash
cd apps/web
npm install
npm run dev
# → http://localhost:3000
```

### Backend (Flask API)

```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
flask run
# → http://localhost:5000
```

### Environment Variables

**`apps/web/.env.local`**
```env
NEXT_PUBLIC_API_URL=https://your-flask-host.example.com
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**`backend/.env`**
```env
DATABASE_URL=postgresql://user:pass@host:5432/dbname
DATABASE_POOL_URL=postgresql://user:pass@host:6543/dbname?pgbouncer=true
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
# Only needed for HS256 legacy tokens:
SUPABASE_JWT_SECRET=your_supabase_jwt_secret
```

**Auth note:** New Supabase projects issue ES256 tokens. The backend validates these by fetching `{iss}/.well-known/jwks.json`. Ensure your deployment environment has outbound HTTPS access.

---

## Data Model

Authentication is handled by Supabase Auth (`auth.users`). All application tables reference `auth.users(id)` with Row Level Security enforcing per-user data isolation.

### `wheel_cycles`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | |
| user_id | UUID FK → auth.users | |
| ticker | VARCHAR(20) | e.g. AAPL |
| current_state | VARCHAR(30) | FSM state: IDLE / CSP_OPEN / STOCK_HELD / CC_OPEN / EXIT |
| start_date | DATE | |
| end_date | DATE | |
| shares_held | INTEGER | 0 or multiple of 100 |
| cost_basis | DECIMAL(12,2) | Effective cost after premium reductions |
| created_at / updated_at | TIMESTAMPTZ | |

### `trades`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | |
| user_id | UUID FK → auth.users | |
| cycle_id | UUID FK → wheel_cycles | Auto-created if omitted |
| ticker | VARCHAR(20) | |
| option_type | VARCHAR(10) | PUT / CALL |
| strike | DECIMAL(18,4) | |
| expiry | DATE | |
| trade_date | DATE | |
| premium | DECIMAL(18,4) | Per-share premium collected |
| contracts | INTEGER | Number of contracts (×100 shares) |
| status | VARCHAR(20) | OPEN / CLOSED / EXPIRED / ASSIGNED / CALLED_AWAY / ROLLED |
| delta | DECIMAL(8,4) | Optional |
| commission_fee | DECIMAL(12,4) | Optional |
| buyback_cost_per_share | DECIMAL(18,4) | For rolled trades |
| rolled_from_id | UUID FK → trades | For roll chains |
| notes | TEXT | |

### Relationships

```
auth.users  1──N  wheel_cycles
auth.users  1──N  trades
wheel_cycles 1──N trades  (via cycle_id)
trades       1──N trades  (via rolled_from_id, roll chains)
```

---

## API Routes

All routes require `Authorization: Bearer <supabase_access_token>`.

### Trades

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/trades` | List all trades for current user |
| POST | `/api/trades` | Create a trade (auto-creates cycle if no `cycle_id`) |
| GET | `/api/trades/:id` | Get single trade |
| PUT | `/api/trades/:id` | Update trade fields |
| PATCH | `/api/trades/:id/expire` | Mark expired (OTM / ITM) |
| PATCH | `/api/trades/:id/status` | Quick status update |
| DELETE | `/api/trades/:id` | Delete trade |

### Cycles

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/cycles` | List all cycles |
| POST | `/api/cycles` | Create cycle manually |
| GET | `/api/cycles/:id` | Get single cycle |
| DELETE | `/api/cycles/:id` | Delete cycle |
| POST | `/api/cycles/:id/event` | Apply FSM transition (assign, roll, exit…) |

### Dashboard & Metrics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard/insights` | KPIs + chart data for dashboard |
| GET | `/api/metrics` | Aggregated performance metrics |
| GET | `/api/quote?symbols=AAPL,MSFT` | Live stock prices (cached ~1hr) |

---

## Deployment

| Service | Platform |
|---------|---------|
| Frontend | [Vercel](https://vercel.com) — push to `main`, auto-deploys |
| Backend | [Render](https://render.com) — `gunicorn --bind 0.0.0.0:$PORT backend.wsgi:app` |
| Database | [Supabase](https://supabase.com) — PostgreSQL + Auth + RLS |

### Database migrations

```bash
cd backend
# Development (direct connection, port 5432)
DATABASE_URL=postgresql://... flask db upgrade

# Production — run via Render Shell with DATABASE_URL (not pool URL)
```

> **Render free tier:** Sleeps after 15 min of inactivity. Add a GitHub Actions cron job to ping `/health` periodically.

---

## Testing

```bash
# From repo root
python -m pip install -r requirements-test.txt
PYTHONPATH=. pytest tests/ -v
```

---

## Roadmap

| Feature | Status |
|---------|--------|
| Wheel Cycle state machine (Python FSM) | ✅ Done |
| Supabase JWT auth (ES256 + HS256) | ✅ Done |
| Trade management UI (add / edit / roll / assign / expire) | ✅ Done |
| Dashboard KPIs + income charts | ✅ Done |
| Cycle timeline visualization | ✅ Done |
| Live stock price integration | ✅ Done |
| Landing page | ✅ Done |
| Vercel + Render deployment | ✅ Done |
| CSV / broker import | 🔜 Planned |
| DTE alerts & assignment-risk nudges | 🔜 Planned |
| Advanced reports & exports | 🔜 Planned |

---

## Contributing

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes (`git commit -m 'Add my feature'`)
4. Push and open a Pull Request

---

## License

MIT — see [LICENSE](LICENSE)

---

**CycleIQ** · [GitHub](https://github.com/xiaohuahou08/CycleIQ) · xiaohua.hou@gmail.com
