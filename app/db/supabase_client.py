"""Supabase client factory."""

from __future__ import annotations

from functools import lru_cache
from typing import Any

from app.core.config import SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL


@lru_cache(maxsize=1)
def get_supabase() -> Any:
    """Create and cache a Supabase client."""
    try:
        from supabase import create_client
    except ImportError as exc:
        raise RuntimeError("supabase package is not installed.") from exc

    if not SUPABASE_URL:
        raise RuntimeError("SUPABASE_URL is not configured.")
    if not SUPABASE_SERVICE_ROLE_KEY:
        raise RuntimeError("SUPABASE_SERVICE_ROLE_KEY is not configured.")
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
