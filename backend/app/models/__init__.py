"""SQLAlchemy models package.

Importing this package ensures all models are registered with the metadata
so that Flask-Migrate / Alembic can auto-detect them.
"""

from .trade import Trade
from .user import User
from .wheel_cycle import WheelCycle

__all__ = ["User", "WheelCycle", "Trade"]
