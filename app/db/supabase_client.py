"""Compatibility wrapper for the shared database-backed Supabase client."""

from __future__ import annotations

from typing import Any

from app.services.database_service import get_database_service


def get_supabase() -> Any:
    """Expose the shared Supabase client used by the platform services."""
    return get_database_service().client
