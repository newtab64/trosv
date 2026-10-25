from typing import Any
from fastapi import APIRouter, HTTPException

from app.gemini import chat_with_gemini, get_api_key, is_gemini_enabled
from app.heuristics import reply_chat
from app.schemas import ChatReq

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


@router.post("/chat")
def chat(req: ChatReq) -> dict[str, Any]:
    """Tra loi FAKE_MODE theo tu khoa; ket thuc bang mui ten phap ly khi can."""
    if is_gemini_enabled():
        gemini_res = chat_with_gemini(
            req.message, req.history or [], req.listing
        )
        if gemini_res:
            return gemini_res

    guard_fake()
    return reply_chat(req)
