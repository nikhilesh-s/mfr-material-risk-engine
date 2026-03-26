"""Advisor API routes."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.advisor_service import build_advisor_chat_response, build_advisor_response

router = APIRouter(tags=["advisor"])


class AdvisorChatRequest(BaseModel):
    analysis_id: str
    user_question: str


@router.get("/advisor/{analysis_id}")
def advisor(analysis_id: str) -> dict:
    try:
        return build_advisor_response(analysis_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/advisor/chat")
def advisor_chat(request: AdvisorChatRequest) -> dict:
    try:
        return build_advisor_chat_response(
            analysis_id=request.analysis_id,
            user_question=request.user_question,
        )
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
