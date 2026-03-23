"""Pydantic schema for stored material inputs."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class MaterialInput(BaseModel):
    material_name: str
    material_class: str | None = None
    density: float | None = None
    melting_point: float | None = None
    thermal_conductivity: float | None = None
    additional_properties: dict[str, Any] = Field(default_factory=dict)
