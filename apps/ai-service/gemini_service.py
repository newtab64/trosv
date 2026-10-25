"""Backward-compatible entrypoint re-exporting from app.gemini."""

from app.gemini import (
    DEFAULT_MODEL,
    GEMINI_MODEL,
    KNOWLEDGE_BASE,
    chat_with_gemini,
    generate_description_with_gemini,
    generate_price_advice_with_gemini,
    get_api_key,
    is_gemini_enabled,
    rank_roommates_with_gemini,
    recommend_areas_with_gemini,
)

__all__ = [
    "DEFAULT_MODEL",
    "GEMINI_MODEL",
    "KNOWLEDGE_BASE",
    "chat_with_gemini",
    "generate_description_with_gemini",
    "generate_price_advice_with_gemini",
    "get_api_key",
    "is_gemini_enabled",
    "rank_roommates_with_gemini",
    "recommend_areas_with_gemini",
]
