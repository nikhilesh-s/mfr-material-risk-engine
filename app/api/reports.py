"""Reports API routes."""

from __future__ import annotations

import csv
import io

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse

from app.services.tds_service import generate_tds

router = APIRouter(tags=["reports"])


@router.get("/tds/{analysis_id}")
def tds(analysis_id: str) -> dict:
    try:
        return generate_tds(analysis_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/export/report/{analysis_id}")
def export_report(analysis_id: str, format: str = "json"):
    try:
        report = generate_tds(analysis_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    if format == "csv":
        buffer = io.StringIO()
        writer = csv.writer(buffer)
        writer.writerow(["field", "value"])
        for key, value in report.items():
            writer.writerow([key, value])
        return {
            "filename": f"dravix_report_{analysis_id}.csv",
            "content_type": "text/csv",
            "content": buffer.getvalue(),
        }

    return {
        "filename": f"dravix_report_{analysis_id}.json",
        "content_type": "application/json",
        "content": JSONResponse(content=report).body.decode("utf-8"),
    }
