"""SQLAlchemy models package.

Importing this package ensures all models are registered with the metadata
so that Flask-Migrate / Alembic can auto-detect them.

Note: there is no local User model – user identity is managed by Supabase Auth
(auth.users).  The user_id UUID stored on WheelCycle rows corresponds to the
Supabase Auth user.id.
"""

from .trade import Trade
from .wheel_cycle import WheelCycle

__all__ = ["WheelCycle", "Trade"]
