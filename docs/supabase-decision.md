# Supabase PostgreSQL – Technical Decision Document

> **Status**: Decided  
> **Date**: 2026-04-22  
> **Author**: Engineering Team  
> **Relates to**: Issue [#11](https://github.com/xiaohuahou08/CycleIQ/issues/11)

---

## Context

CycleIQ needs a hosted PostgreSQL database for the Flask backend.  
This document records the decisions made after researching Supabase as the database provider.

---

## Decisions

### 1. Database Provider: Supabase PostgreSQL ✅

**Decision**: Use Supabase Free Tier for MVP; upgrade to Pro as needed.

| Factor | Detail |
|--------|--------|
| Database | Managed PostgreSQL 15 |
| Free storage | 500 MB – sufficient for MVP |
| Connection pooling | PgBouncer included (port 6543) |
| Backups | Daily automated backups on Free tier |
| SSL | Enforced by default |

**Connection strategy**:
- Flask app → **PgBouncer pooling URL** (port 6543, `?pgbouncer=true`)
- Alembic migrations → **direct URL** (port 5432)

---

### 2. Authentication: Flask-JWT-Extended (not Supabase Auth) ✅

**Decision**: Keep Flask-JWT-Extended for the MVP.

**Rationale**:
- Supabase Auth is tightly coupled to the Supabase JS SDK, adding complexity to the Flask backend.
- Flask-JWT-Extended gives full control over token lifecycle and middleware.
- Can migrate to Supabase Auth later if OAuth / magic-link login is required.
- Issue #8 (Flask Auth API) proceeds as planned.

---

### 3. ORM / Migration Tool: SQLAlchemy + Alembic (via Flask-Migrate) ✅

**Decision**: Use SQLAlchemy ORM + Alembic for schema management.

**Rationale**:
- Standard Python ecosystem, works with any PostgreSQL host.
- Alembic migration files are version-controlled (`backend/migrations/versions/`).
- SQLAlchemy models serve as the single source of truth for the schema.
- The Supabase Python SDK (`supabase-py`) is also installed for direct table access where needed (e.g. bulk queries, realtime).

---

### 4. Row Level Security (RLS): Enabled via Migration ✅

**Decision**: Enable RLS on all tables; grant `service_role` full bypass.

**Policies applied in migration `0001_initial_schema`**:
- `users`, `wheel_cycles`, `trades` all have RLS enabled.
- A `service_role_all_*` policy allows the backend (using `SUPABASE_SERVICE_ROLE_KEY`) unrestricted access.
- User-level policies can be added later when the frontend calls Supabase directly using the `anon` key.

---

### 5. Environment Variable Management ✅

All secrets are stored in `.env` (never committed to git).  
`.env.example` is committed as a template.

| Variable | Source | Used by |
|----------|--------|---------|
| `SUPABASE_URL` | Supabase Dashboard → Settings → API | Flask app, supabase-py |
| `SUPABASE_ANON_KEY` | Supabase Dashboard → Settings → API | Frontend (future) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Settings → API | Flask backend (supabase-py) |
| `DATABASE_URL` | Supabase Dashboard → Settings → Database | Alembic migrations |
| `DATABASE_POOL_URL` | Same, port 6543 + `?pgbouncer=true` | Flask (production) |
| `SECRET_KEY` | Generate with `python -c "import secrets; print(secrets.token_hex())"` | Flask sessions |
| `JWT_SECRET_KEY` | Generate same as above | Flask-JWT-Extended |

---

## Impact on Other Issues

| Issue | Decision |
|-------|----------|
| [#7 Flask Cycle + Trade API](https://github.com/xiaohuahou08/CycleIQ/issues/7) | Proceeds with SQLAlchemy connecting to Supabase PostgreSQL |
| [#8 Flask Auth API](https://github.com/xiaohuahou08/CycleIQ/issues/8) | Proceeds with Flask-JWT-Extended (Supabase Auth not used for MVP) |
| [#3 State Machine](https://github.com/xiaohuahou08/CycleIQ/issues/3) | No impact |
| [#6, #9 Frontend](https://github.com/xiaohuahou08/CycleIQ/issues/6) | Will use REST API endpoints; Supabase JS SDK deferred |

---

## How to Get Started

### Step 1 – Create a Supabase Account & Project

1. Go to <https://supabase.com> and sign up (GitHub login works).
2. Click **New Project**, name it `cycleiq`, select a region (US East or Singapore).
3. Set a strong database password and save it securely.

### Step 2 – Retrieve Credentials

Navigate to your project in the Supabase Dashboard:

| Credential | Location |
|------------|----------|
| Project URL | Settings → API → Project URL |
| Anon Key | Settings → API → Project API keys → `anon public` |
| Service Role Key | Settings → API → Project API keys → `service_role` (**keep secret**) |
| Database URL | Settings → Database → Connection string → URI |

### Step 3 – Configure Environment

```bash
cd backend
cp .env.example .env
# Edit .env and fill in SUPABASE_URL, keys, and DATABASE_URL
```

### Step 4 – Run Migrations

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Run the initial schema migration
DATABASE_URL="postgresql://postgres:<pass>@db.<id>.supabase.co:5432/postgres" \
  flask db upgrade
```

### Step 5 – Start the Flask Dev Server

```bash
FLASK_ENV=development flask run
# Visit http://localhost:5000/health
```

---

## File Structure

```
backend/
├── app/
│   ├── __init__.py          # Flask application factory
│   ├── database.py          # SQLAlchemy db extension
│   ├── supabase_client.py   # supabase-py singleton
│   └── models/
│       ├── __init__.py
│       ├── user.py          # User model
│       ├── wheel_cycle.py   # WheelCycle model
│       └── trade.py         # Trade model
├── migrations/
│   ├── env.py               # Alembic environment
│   ├── script.py.mako       # Alembic template
│   └── versions/
│       └── 0001_initial_schema.py  # Initial migration (RLS included)
├── .env.example             # Environment variable template
├── alembic.ini              # Alembic configuration
├── config.py                # Flask configuration classes
├── requirements.txt         # Python dependencies
└── run.py                   # Dev server entry point
```

---

## Security Checklist

- [x] `.env` is in `.gitignore` – secrets are never committed
- [x] `SUPABASE_SERVICE_ROLE_KEY` used only in Flask backend; never exposed to the frontend
- [x] RLS enabled on all tables in the initial migration
- [x] SSL enforced by Supabase by default (no additional config needed)
- [x] PgBouncer connection pooling used in production (avoids connection exhaustion)
- [ ] Key rotation: rotate `SERVICE_ROLE_KEY` via Supabase Dashboard if compromised
- [ ] Database backups: Supabase Free tier provides daily backups (7-day retention)
