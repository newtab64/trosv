from typing import Any
from fastapi import APIRouter, HTTPException

from app.gemini import generate_description_with_gemini, get_api_key, is_gemini_enabled
from app.heuristics import generate_description
from app.schemas import DescriptionReq

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


@router.post("/description")
def description(req: DescriptionReq) -> dict[str, Any]:
    """Viet mo ta tin dang tu thong tin co ban (chi dung du lieu duoc cung cap)."""
    if is_gemini_enabled():
        gemini_res = generate_description_with_gemini(req.model_dump())
        if gemini_res:
            return gemini_res

    guard_fake()
    return generate_description(req)
