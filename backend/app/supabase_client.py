"""Supabase Python client singleton.

Usage
-----
    from app.supabase_client import get_supabase

    client = get_supabase()
    response = client.table("wheel_cycles").select("*").execute()

The client is initialised lazily on first access so that missing environment
variables only raise errors when the client is actually used (not at import
time), which keeps unit tests that don't need Supabase working without a
real configuration.
"""

from __future__ import annotations

import os
from functools import lru_cache

from supabase import Client, create_client


@lru_cache(maxsize=1)
def get_supabase() -> Client:
    """Return the shared Supabase client (created once per process)."""
    url = os.environ.get("SUPABASE_URL", "")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if not url or not key:
        raise RuntimeError(
            "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in the environment."
        )
    return create_client(url, key)
