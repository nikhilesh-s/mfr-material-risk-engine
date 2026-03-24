"""Environment-backed configuration for backend infrastructure."""

from __future__ import annotations

import os
from typing import Final

try:
    from dotenv import load_dotenv
except ImportError:  # pragma: no cover - handled gracefully for pre-install environments
    load_dotenv = None

if load_dotenv is not None:
    load_dotenv()

SUPABASE_URL: Final[str | None] = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY: Final[str | None] = os.getenv("SUPABASE_SERVICE_KEY")
SUPABASE_SERVICE_ROLE_KEY: Final[str | None] = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
OPENAI_API_KEY: Final[str | None] = os.getenv("OPENAI_API_KEY")


def require_env(name: str) -> str:
    value = os.getenv(name)
    if value is None or not value.strip():
        raise RuntimeError(f"{name} is required but not configured.")
    return value.strip()
