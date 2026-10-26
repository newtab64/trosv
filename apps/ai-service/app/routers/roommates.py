from typing import Any
from fastapi import APIRouter, HTTPException

from app.gemini import get_api_key, is_gemini_enabled, rank_roommates_with_gemini
from app.heuristics import score_roommates
from app.schemas import RoommatesReq

router = APIRouter()


def guard_fake() -> None:
    """Non-2xx neu FAKE_MODE tat va khong co API key - backend doi thanh 503 theo contract."""
    import app.main as app_main
    fake_mode = getattr(app_main, "FAKE_MODE", True)
    if not fake_mode and not get_api_key():
        raise HTTPException(
            status_code=503,
            detail="GEMINI_API_KEY hoac LLM_API_KEY chua duoc cau hinh",
        )


@router.post("/roommates")
def roommates(req: RoommatesReq) -> dict[str, Any]:
    """Xep hang ung vien ban cung phong: tot nhat truoc, toi da `limit`."""
    if is_gemini_enabled() and req.candidates:
        gemini_res = rank_roommates_with_gemini(
            req.requester, req.candidates, req.limit
        )
        if gemini_res:
            return gemini_res

    guard_fake()
    return score_roommates(req)
