"""Datasets API routes."""

from __future__ import annotations

from fastapi import APIRouter, File, HTTPException, Query, UploadFile

from app.services.clustering import cluster_dataset_materials
from app.services.dataset_search import search_dataset_materials
from app.services.dataset_service import upload_csv
from app.services.dataset_learning_service import export_learning_dataset

router = APIRouter(tags=["datasets"])


@router.get("/clusters")
def clusters(n_clusters: int = 6) -> dict:
    """Return KMeans clusters for the loaded Phase 3 material dataset."""
    return cluster_dataset_materials(n_clusters=n_clusters)


@router.get("/dataset/search")
def dataset_search(
    material_name: str | None = Query(default=None),
    density_min: float | None = Query(default=None),
    density_max: float | None = Query(default=None),
    melting_point_min: float | None = Query(default=None),
    melting_point_max: float | None = Query(default=None),
) -> dict:
    """Search the in-memory dataset with simple material and numeric filters."""
    return search_dataset_materials(
        material_name=material_name,
        density_min=density_min,
        density_max=density_max,
        melting_point_min=melting_point_min,
        melting_point_max=melting_point_max,
    )


@router.get("/dataset/export")
def dataset_export() -> dict:
    """Return the current learning/export dataset snapshot."""
    return export_learning_dataset()


@router.post("/dataset/upload")
async def dataset_upload(file: UploadFile = File(...)) -> dict:
    """Validate and persist an uploaded CSV into the dataset layer."""
    try:
        payload = await file.read()
        frame = upload_csv(payload)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    accepted_rows = int(len(frame))
    rejected_rows = 0
    if accepted_rows == 0:
        rejected_rows = 0
    feature_coverage = {
        column: float(frame[column].notna().mean())
        for column in frame.columns
        if column != "material_name"
    }
    return {
        "rows_accepted": accepted_rows,
        "rows_rejected": rejected_rows,
        "clustering_availability": accepted_rows > 1,
        "feature_coverage": feature_coverage,
    }
