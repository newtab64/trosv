from typing import Any
from fastapi import APIRouter, HTTPException

from app.gemini import generate_price_advice_with_gemini, get_api_key, is_gemini_enabled
from app.heuristics import advise_price
from app.schemas import PriceAdviceReq

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


@router.post("/price-advice")
def price_advice(req: PriceAdviceReq) -> dict[str, Any]:
    """Danh gia gia tin dang so voi median thi truong backend tinh san."""
    if is_gemini_enabled():
        gemini_res = generate_price_advice_with_gemini(req.listing, req.stats)
        if gemini_res:
            return gemini_res

    guard_fake()
    return advise_price(req)
