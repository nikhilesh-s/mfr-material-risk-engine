"""Coatings API routes."""

from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel

from src.api_contract import Phase3Input

router = APIRouter(tags=["coatings"])


class CoatingAnalysisRequest(BaseModel):
    base_material: Phase3Input
    coating_code: str
    use_case: str | None = None


@router.post("/coatings/analyze")
def analyze_coating(request: CoatingAnalysisRequest) -> dict:
    from api.main import _predict_response_payload

    material = request.base_material.model_copy(update={"coating_code": request.coating_code})
    response = _predict_response_payload(material, use_case=request.use_case)
    coating_analysis = dict(response.get("coating_analysis") or {})
    coating_analysis["coating_compatibility_summary"] = (
        f"{response['material_name']} with {request.coating_code} produces an effective DFRS "
        f"of {float(response['DFRS']):.3f}."
    )
    return {
        "material_name": response["material_name"],
        "coating_code": request.coating_code,
        "coating_modifier": response.get("coatingModifier"),
        "effective_score": response.get("DFRS"),
        "coating_compatibility_summary": coating_analysis["coating_compatibility_summary"],
        "coating_analysis": coating_analysis,
    }
