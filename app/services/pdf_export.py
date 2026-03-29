"""PDF export helpers for Dravix technical datasheets."""

from __future__ import annotations

from io import BytesIO
from typing import Any


def generate_tds_pdf_bytes(report: dict[str, Any]) -> bytes:
    """Render a compact TDS PDF payload for download endpoints."""
    from reportlab.lib.pagesizes import letter
    from reportlab.pdfgen import canvas

    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter
    y = height - 48

    def write_line(text: str, *, font: str = "Helvetica", size: int = 10, gap: int = 14) -> None:
        nonlocal y
        if y < 48:
            pdf.showPage()
            y = height - 48
        pdf.setFont(font, size)
        pdf.drawString(48, y, text[:110])
        y -= gap

    pdf.setTitle("Dravix Technical Datasheet")
    write_line("Dravix Technical Datasheet", font="Helvetica-Bold", size=16, gap=22)
    write_line(f"Material Name: {report.get('material_name', 'Unknown')}")
    write_line(f"Fire Resistance Score: {report.get('resistance_score', 'N/A')}")
    write_line(f"Confidence: {report.get('confidence', 'N/A')}")
    write_line("")
    write_line("Top Drivers", font="Helvetica-Bold")
    for item in report.get("top_drivers", [])[:5]:
        write_line(f"- {item.get('feature')}: {item.get('direction')}")
    write_line("")
    write_line("Subscores", font="Helvetica-Bold")
    for key, value in (report.get("subscores") or {}).items():
        write_line(f"- {key}: {value}")
    write_line("")
    write_line("Recommended Tests", font="Helvetica-Bold")
    for test in report.get("recommended_tests", [])[:5]:
        write_line(f"- {test}")
    write_line("")
    write_line("Design Suggestions", font="Helvetica-Bold")
    for suggestion in report.get("design_suggestions", [])[:5]:
        write_line(f"- {suggestion}")
    write_line("")
    write_line("Limitations Notice", font="Helvetica-Bold")
    write_line(str(report.get("limitations_notice", "No limitations notice provided.")), gap=18)
    pdf.save()
    return buffer.getvalue()
