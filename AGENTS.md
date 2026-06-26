# AGENTS.md

## Cursor Cloud specific instructions

CycleIQ is a Wheel Strategy options-trading app. Runnable components:

- `backend/` — Flask REST API (port 5000)
- `apps/web/` — Next.js web app, the canonical frontend (port 3000)
- `cycleiq/` — core Python Wheel-Strategy FSM library (installed editable)
- `frontend/` — legacy standalone Vite SPA (optional; not in npm workspaces, not deployed)

### Environment / setup

- Python deps live in a virtualenv at `/workspace/venv` (the system Python is PEP 668 / externally-managed, so a venv is required). The update script recreates/refreshes it.
- Node deps: `npm install` at the repo root installs the `apps/web` workspace. `frontend/` is separate (`cd frontend && npm install`) and only needed if you work on the legacy SPA.
- Node 22 (preinstalled) works; CI uses Node 20. Python is 3.12.

### Tests / lint / build

- Backend + FSM tests (same as CI): `PYTHONPATH=. venv/bin/pytest tests/ -v` from repo root.
- Web lint/test/build: `npm run web:lint`, `npm run web:test`, `npm run web:build` (or the underlying scripts in `apps/web/package.json`). Lint emits warnings only. Web unit tests use `tsx --test` because several `.mjs` tests import `.ts` modules and `@/` path aliases.

### Running the backend (local dev, SQLite) — important caveats

- Run the **module file**, not the package: `PYTHONPATH=/workspace venv/bin/python backend/app.py` (serves on `0.0.0.0:5000`). `backend/app.py` calls `db.create_all()`, so it auto-creates the SQLite dev DB (`cycleiq_dev.db`) from the current models.
- Do NOT rely on `flask db upgrade` for local SQLite: the Alembic migrations under `backend/migrations/` are an older schema that no longer matches the SQLAlchemy models. Migrations are only meaningful against the production Supabase Postgres. The `create_all` dev path is what to use locally.
- Note the dual layout: `backend/app/__init__.py` (the package, used by gunicorn `backend.wsgi:app`) does NOT call `create_all`; only the `backend/app.py` module file does.
- With no `DATABASE_URL`, config falls back to `sqlite:///cycleiq_dev.db` (see `backend/config.py`).

### Auth (needed to call the API)

- Every `/api/*` route is protected by `@require_auth`, which verifies a Supabase HS256 JWT (`aud=authenticated`) signed with `SUPABASE_JWT_SECRET`.
- For local testing without a real Supabase project: set `SUPABASE_JWT_SECRET` to any value when starting the backend, then forge a token, e.g.
  `venv/bin/python -c "import jwt; print(jwt.encode({'sub':'<uuid>','aud':'authenticated'}, '<secret>', algorithm='HS256'))"`
  and send it as `Authorization: Bearer <token>`.

### Running the web app

- `npm run web:dev` (port 3000). Set `NEXT_PUBLIC_API_URL=http://localhost:5000` to point it at the local backend.
- Landing/login/register pages render without Supabase. **Authenticated flows (dashboard, trades, cycles) require real Supabase env** (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`); without them, `middleware.ts` redirects protected routes to `/login`. Full UI E2E therefore needs Supabase credentials.
