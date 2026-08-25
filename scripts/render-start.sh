#!/bin/sh
# Native Render start: apply Alembic from backend/, then gunicorn from repo root.
set -e
ROOT="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
cd "$ROOT/backend"
alembic upgrade heads
cd "$ROOT"
exec gunicorn backend.wsgi:app --bind "0.0.0.0:${PORT:-10000}"
