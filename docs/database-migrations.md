# Database Migrations

CycleIQ uses **Alembic** (via Flask-Migrate) to manage the PostgreSQL schema.  
Migration files live in `backend/migrations/versions/`.

---

## Prerequisites

- Python 3.11+ with a virtual environment activated
- A Supabase project (or any PostgreSQL 15 instance)
- `backend/.env` configured (see `backend/.env.example`)

```bash
cd backend
cp .env.example .env   # fill in DATABASE_URL and other values
```

> **Two connection strings are required:**
>
> | Variable | Port | Used by |
> |----------|------|---------|
> | `DATABASE_URL` | 5432 (direct) | Alembic migrations |
> | `DATABASE_POOL_URL` | 6543 (PgBouncer) | Flask app at runtime |

---

## Install dependencies

```bash
cd backend
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

---

## Apply all pending migrations

```bash
cd backend
flask db upgrade
```

This runs every migration in `migrations/versions/` that hasn't been applied yet, in revision order.

---

## Common Alembic commands

| Goal | Command |
|------|---------|
| Apply all pending migrations | `flask db upgrade` |
| Roll back the last migration | `flask db downgrade` |
| Roll back to the initial state | `flask db downgrade base` |
| Show current revision | `flask db current` |
| Show migration history | `flask db history` |
| Generate a new auto-migration | `flask db migrate -m "describe change"` |

> After generating a new migration, **always review the generated file** in  
> `backend/migrations/versions/` before running `flask db upgrade`.

---

## Current schema (revision `0001_initial_schema`)

| Table | Key columns |
|-------|-------------|
| `wheel_cycles` | `id` (UUID PK), `user_id` → `auth.users(id)`, `ticker`, `state`, `capital_committed`, `total_premium_collected` |
| `trades` | `id` (UUID PK), `wheel_cycle_id` → `wheel_cycles(id)`, `option_type`, `action`, `strike`, `expiration_date`, `contracts`, `premium_per_contract`, `event`, `trade_date` |

Both tables have **Row Level Security (RLS)** enabled:
- `service_role` policy: backend has unrestricted access.
- `authenticated` policy: each user can only read/write their own rows (`auth.uid()`).

---

## Adding a new migration

1. Edit/add SQLAlchemy models in `backend/app/models/`.
2. Generate the migration file:

   ```bash
   cd backend
   flask db migrate -m "add column foo to wheel_cycles"
   ```

3. Review the generated file in `backend/migrations/versions/`.
4. Apply it:

   ```bash
   flask db upgrade
   ```

5. Commit **both** the model change and the migration file together.

---

## Troubleshooting

**`Can't locate revision` error**  
The `alembic_version` table in the DB is out of sync. Run `flask db current` to check which revision the DB thinks it's on, then `flask db upgrade` to advance.

**`SSL required` error**  
Supabase enforces SSL. Ensure your `DATABASE_URL` does not include `sslmode=disable`.

**`too many connections` error during migration**  
Use the direct connection string (port 5432) for migrations, not the PgBouncer URL (port 6543).
