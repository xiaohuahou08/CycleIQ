"""Compatibility re-export for code under ``backend.app``.

Implementation lives in ``backend.auth.supabase`` so ``backend.routes`` can import
auth without triggering a circular import through ``backend.app`` package init.
"""

from backend.auth.supabase import require_auth

__all__ = ["require_auth"]
