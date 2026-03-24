"""Datasets API routes."""

from __future__ import annotations

from fastapi import APIRouter

from app.services.clustering_service import cluster_materials
from app.services.dataset_learning_service import export_learning_dataset

router = APIRouter(tags=["datasets"])


@router.get("/clusters")
def clusters(n_clusters: int = 4) -> dict:
    return cluster_materials(n_clusters=n_clusters)


@router.get("/dataset/export")
def dataset_export() -> dict:
    return export_learning_dataset()
