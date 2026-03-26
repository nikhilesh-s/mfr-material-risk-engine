"""Datasets API routes."""

from __future__ import annotations

from fastapi import APIRouter, File, HTTPException, UploadFile

from app.services.clustering_service import cluster_materials
from app.services.dataset_service import upload_csv
from app.services.dataset_learning_service import export_learning_dataset

router = APIRouter(tags=["datasets"])


@router.get("/clusters")
def clusters(n_clusters: int = 4) -> dict:
    return cluster_materials(n_clusters=n_clusters)


@router.get("/dataset/export")
def dataset_export() -> dict:
    return export_learning_dataset()


@router.post("/dataset/upload")
async def dataset_upload(file: UploadFile = File(...)) -> dict:
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
