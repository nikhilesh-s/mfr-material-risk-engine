"""Logging helpers for the Dravix backend."""

from __future__ import annotations

import logging


def get_logger(name: str) -> logging.Logger:
    """Return an application logger using the process logging configuration."""
    return logging.getLogger(name)
