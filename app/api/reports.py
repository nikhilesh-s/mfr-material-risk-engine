"""Reports API routes."""

from __future__ import annotations

import csv
import io

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse, Response

from app.services.pdf_export import generate_tds_pdf_bytes
from app.services.tds_service import generate_tds

router = APIRouter(tags=["reports"])


@router.get("/tds/{analysis_id}")
def tds(analysis_id: str) -> dict:
    """Return the structured Dravix technical datasheet payload."""
    try:
        return generate_tds(analysis_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/tds/{analysis_id}/pdf")
def tds_pdf(analysis_id: str) -> Response:
    """Return a downloadable PDF rendering of the technical datasheet."""
    try:
        report = generate_tds(analysis_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    pdf_bytes = generate_tds_pdf_bytes(report)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="dravix_tds_{analysis_id}.pdf"',
        },
    )


@router.get("/export/report/{analysis_id}")
def export_report(analysis_id: str, format: str = "json"):
    """Export a report object in JSON or CSV form."""
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
