"""Optional Supabase client scaffold for deployed runtime services."""

from __future__ import annotations

import os
from functools import lru_cache
from typing import Any

try:
    from dotenv import load_dotenv
except ImportError:  # pragma: no cover
    load_dotenv = None

if load_dotenv is not None:
    load_dotenv()


def _configured_supabase_credentials() -> tuple[str | None, str | None]:
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_KEY") or os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    return supabase_url, supabase_key


def get_supabase_status() -> dict[str, str | bool]:
    supabase_url, supabase_key = _configured_supabase_credentials()
    if not supabase_url:
        return {"enabled": False, "connected": False, "reason": "SUPABASE_URL is not configured."}
    if not supabase_key:
        return {
            "enabled": False,
            "connected": False,
            "reason": "SUPABASE_KEY or SUPABASE_SERVICE_ROLE_KEY is not configured.",
        }
    client = get_supabase_client()
    if client is None:
        return {"enabled": True, "connected": False, "reason": "Supabase client initialization failed."}
    return {"enabled": True, "connected": True, "reason": "Supabase connected."}


def is_supabase_enabled() -> bool:
    supabase_url, supabase_key = _configured_supabase_credentials()
    return bool(supabase_url and supabase_key)


@lru_cache(maxsize=1)
def get_supabase_client() -> Any | None:
    if not is_supabase_enabled():
        return None

    try:
        from supabase import create_client
    except ImportError:
        return None

    supabase_url, supabase_key = _configured_supabase_credentials()
    if not supabase_url or not supabase_key:
        return None

    try:
        return create_client(supabase_url, supabase_key)
    except Exception:
        return None
