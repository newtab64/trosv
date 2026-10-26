from typing import Any
from fastapi import APIRouter, HTTPException

from app.gemini import get_api_key, is_gemini_enabled, recommend_areas_with_gemini
from app.heuristics import recommend_areas
from app.schemas import AreasReq

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


@router.post("/areas")
def areas(req: AreasReq) -> dict[str, Any]:
    """Xep hang khu vuc theo ngan sach + uu tien: tot nhat truoc."""
    if is_gemini_enabled() and req.areas:
        gemini_res = recommend_areas_with_gemini(
            req.preferences, req.areas, req.limit
        )
        if gemini_res:
            return gemini_res

    guard_fake()
    return recommend_areas(req)
