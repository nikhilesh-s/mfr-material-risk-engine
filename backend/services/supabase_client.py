"""Supabase client helpers backed by the mandatory database service."""

from __future__ import annotations

from typing import Any

from app.services.database_service import get_database_service


def get_supabase_status() -> dict[str, str | bool]:
    try:
        get_database_service()
    except Exception as exc:
        return {"enabled": False, "connected": False, "reason": str(exc)}
    return {"enabled": True, "connected": True, "reason": "Supabase connected."}


def is_supabase_enabled() -> bool:
    try:
        get_database_service()
    except Exception:
        return False
    return True


def get_supabase_client() -> Any:
    return get_database_service().client
