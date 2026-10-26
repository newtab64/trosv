"""Google Gemini client integration for TROSV AI Service.

Implements real LLM generation for:
- POST /description
- POST /price-advice
- POST /roommates
- POST /areas
- POST /chat

Adheres strictly to docs/contracts/AI_CONTRACT.md.
Provides automatic fail-safe fallback to heuristic engine if Gemini is
disabled, rate-limited, or unavailable.
"""

from __future__ import annotations

import json
import logging
import os
from pathlib import Path
from typing import Any, Optional

from google import genai
from google.genai import types
from pydantic import BaseModel, Field

logger = logging.getLogger("ai_service.gemini")

# Model configuration
DEFAULT_MODEL = "gemini-3.5-flash-lite"
GEMINI_MODEL = os.getenv("GEMINI_MODEL", DEFAULT_MODEL)

# Load domain knowledge base for RAG-lite chatbot grounding
KNOWLEDGE_FILE = Path(__file__).parent / "knowledge.md"
if not KNOWLEDGE_FILE.exists():
    KNOWLEDGE_FILE = Path(__file__).parent.parent / "knowledge.md"
KNOWLEDGE_BASE = ""
if KNOWLEDGE_FILE.exists():
    try:
        KNOWLEDGE_BASE = KNOWLEDGE_FILE.read_text(encoding="utf-8")
    except Exception as exc:
        logger.warning(f"Failed to read knowledge.md: {exc}")


def get_api_key() -> Optional[str]:
    """Retrieve Gemini API key from environment."""
    return os.getenv("GEMINI_API_KEY") or os.getenv("LLM_API_KEY") or None


def is_gemini_enabled() -> bool:
    """Return True if Gemini is configured and FAKE_MODE is not forced."""
    fake_mode = os.getenv("FAKE_MODE", "true").lower() == "true"
    api_key = get_api_key()
    return bool(api_key) and not fake_mode


def _get_client() -> Optional[genai.Client]:
    """Initialize Google GenAI client if API key is present."""
    api_key = get_api_key()
    if not api_key:
        return None
    try:
        return genai.Client(api_key=api_key)
    except Exception as exc:
        logger.error(f"Failed to initialize Google GenAI client: {exc}")
        return None


def _generate_with_fallback(
    client: genai.Client, contents: Any, config: types.GenerateContentConfig
) -> Optional[str]:
    """Execute Gemini generation with model fallback on demand spikes or deprecation."""
    configured_model = os.getenv("GEMINI_MODEL", DEFAULT_MODEL)
    candidate_models = [configured_model, "gemini-3.5-flash-lite", "gemini-3.5-flash"]
    # Deduplicate preserving order
    seen: set[str] = set()
    models: list[str] = []
    for m in candidate_models:
        if m and m not in seen:
            seen.add(m)
            models.append(m)

    last_error: Optional[Exception] = None
    for model_name in models:
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=contents,
                config=config,
            )
            if response and response.text:
                return response.text
        except Exception as exc:
            last_error = exc
            logger.warning(
                f"Gemini call with model '{model_name}' failed: {exc}. Trying next candidate if available..."
            )
    logger.warning(f"All Gemini models exhausted. Last error: {last_error}")
    return None


# ============================================================================
# 1. POST /description Schema & Generation
# ============================================================================
class DescriptionResponseSchema(BaseModel):
    description: str = Field(
        ...,
        description="Mô tả tin đăng phòng trọ bằng tiếng Việt dài từ 80 đến 120 từ",
    )


def generate_description_with_gemini(data: dict[str, Any]) -> Optional[dict[str, str]]:
    """Generate listing description using Gemini."""
    client = _get_client()
    if not client:
        return None

    prompt = (
        f"Hãy viết mô tả phòng trọ cho tin đăng sau bằng tiếng Việt:\n"
        f"- Tiêu đề: {data.get('title', '')}\n"
        f"- Loại phòng: {data.get('type', 'phòng trọ')}\n"
        f"- Giá thuê: {data.get('price', 'thỏa thuận')} VNĐ/tháng\n"
        f"- Diện tích: {data.get('area_m2', 'không rõ')} m²\n"
        f"- Địa chỉ: {data.get('address', '')}, {data.get('ward', '')}\n"
        f"- Tiện ích: {', '.join(data.get('amenities') or []) or 'cơ bản'}\n\n"
        "Yêu cầu:\n"
        "1. Độ dài từ 80 đến 120 từ, giọng điệu thân thiện, rõ ràng, lịch sự.\n"
        "2. CHỈ sử dụng các thông tin đã được cung cấp ở trên.\n"
        "3. TUYỆT ĐỐI KHÔNG tự bịa đặt khoảng cách tới trường học, giá cả, hoặc tiện ích không có.\n"
        "4. Kêu gọi người thuê liên hệ trực tiếp qua tin nhắn để xem phòng."
    )

    system_instruction = (
        "Bạn là trợ lý viết tin đăng phòng trọ sinh viên chuyên nghiệp tại Việt Nam. "
        "Luôn trả lời dưới dạng JSON tuân thủ schema được chỉ định."
    )

    try:
        raw_text = _generate_with_fallback(
            client=client,
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                response_mime_type="application/json",
                response_schema=DescriptionResponseSchema,
                temperature=0.3,
            ),
        )
        if not raw_text:
            return None
        res_dict = json.loads(raw_text)
        if "description" in res_dict and isinstance(res_dict["description"], str):
            return {"description": res_dict["description"].strip()}
    except Exception as exc:
        logger.warning(f"Gemini generate_description failed: {exc}")
    return None


# ============================================================================
# 2. POST /price-advice Schema & Generation
# ============================================================================
class PriceAdviceResponseSchema(BaseModel):
    verdict: str = Field(..., description="'high', 'fair', hoặc 'low'")
    fair_min: int = Field(..., description="Giá đề xuất tối thiểu hợp lý (VND)")
    fair_max: int = Field(..., description="Giá đề xuất tối đa hợp lý (VND)")
    tips: list[str] = Field(..., description="2 đến 3 lời khuyên thương lượng giá")
    message: str = Field(..., description="Tin nhắn mẫu lịch sự gửi chủ nhà")


def generate_price_advice_with_gemini(
    listing: dict[str, Any], stats: dict[str, Any]
) -> Optional[dict[str, Any]]:
    """Evaluate rental price against area statistics using Gemini."""
    client = _get_client()
    if not client:
        return None

    prompt = (
        f"Đánh giá mức giá thuê của tin đăng sau dựa trên thống kê thị trường cùng khu vực:\n"
        f"- Tin đăng: loại '{listing.get('type')}', diện tích {listing.get('area_m2')} m², "
        f"khu vực '{listing.get('ward')}', tiện ích: {', '.join(listing.get('amenities') or [])}\n"
        f"- Giá hiện tại của tin: {listing.get('price')} VNĐ/tháng\n"
        f"- Thống kê khu vực (từ {stats.get('count', 0)} tin tương tự):\n"
        f"  + Thấp nhất (min): {stats.get('min')} VNĐ\n"
        f"  + Trung vị (median): {stats.get('median')} VNĐ\n"
        f"  + Cao nhất (max): {stats.get('max')} VNĐ\n\n"
        "Yêu cầu:\n"
        "1. 'verdict': Chọn 'high' nếu giá cao hơn median trên 10%, 'low' nếu thấp hơn median trên 10%, ngược lại 'fair'.\n"
        "2. 'fair_min' và 'fair_max': Khoảng giá hợp lý (số nguyên VNĐ).\n"
        "3. 'tips': 2-3 gợi ý thiết thực khi sinh viên trao đổi hoặc thương lượng với chủ nhà.\n"
        "4. 'message': Đoạn tin nhắn mẫu lịch sự, tinh tế để sinh viên gửi chủ nhà qua khung chat."
    )

    system_instruction = (
        "Bạn là chuyên gia tư vấn giá thuê nhà trọ sinh viên tại TP.HCM. "
        "Đưa ra đánh giá khách quan, bảo vệ quyền lợi sinh viên và luôn giữ thái độ tôn trọng chủ nhà. "
        "Luôn trả về định dạng JSON đúng cấu trúc."
    )

    try:
        raw_text = _generate_with_fallback(
            client=client,
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                response_mime_type="application/json",
                response_schema=PriceAdviceResponseSchema,
                temperature=0.2,
            ),
        )
        if not raw_text:
            return None
        res_dict = json.loads(raw_text)
        if res_dict.get("verdict") in ("high", "fair", "low"):
            return res_dict
    except Exception as exc:
        logger.warning(f"Gemini generate_price_advice failed: {exc}")
    return None


# ============================================================================
# 3. POST /roommates Schema & Generation
# ============================================================================
class RoommateItem(BaseModel):
    id: int = Field(..., description="ID của ứng viên")
    score: int = Field(..., description="Điểm tương thích từ 0 đến 100")
    reason: str = Field(..., description="Lý do tương thích ngắn gọn bằng tiếng Việt")


class RoommatesResponseSchema(BaseModel):
    results: list[RoommateItem] = Field(
        ..., description="Danh sách xếp hạng bạn cùng phòng"
    )


def rank_roommates_with_gemini(
    requester: dict[str, Any], candidates: list[dict[str, Any]], limit: int = 5
) -> Optional[dict[str, Any]]:
    """Rank roommate candidates and generate personalized reasoning using Gemini."""
    client = _get_client()
    if not client or not candidates:
        return None

    prompt = (
        f"Hãy phân tích độ tương thích và xếp hạng bạn cùng phòng cho sinh viên sau:\n"
        f"Người tìm: Ngân sách {requester.get('budget_min')}-{requester.get('budget_max')} VNĐ, "
        f"ngủ {requester.get('sleep_schedule')}, sạch sẽ {requester.get('cleanliness')}/5, "
        f"hút thuốc: {requester.get('smoking')}, tính cách: {requester.get('personality')}, "
        f"sở thích: {', '.join(requester.get('interests') or [])}\n\n"
        f"Danh sách các ứng viên ({len(candidates)} người):\n"
    )
    for c in candidates:
        prompt += (
            f"- ID {c.get('id')}: Ngân sách {c.get('budget_min')}-{c.get('budget_max')} VNĐ, "
            f"ngủ {c.get('sleep_schedule')}, sạch sẽ {c.get('cleanliness')}/5, "
            f"hút thuốc: {c.get('smoking')}, tính cách: {c.get('personality')}, "
            f"sở thích: {', '.join(c.get('interests') or [])}\n"
        )

    prompt += (
        f"\nYêu cầu:\n"
        f"1. Chấm điểm tương thích 'score' từ 0 đến 100 cho mỗi ứng viên.\n"
        f"2. Viết 'reason' ngắn gọn, súc tích (1-2 câu tiếng Việt) nêu điểm chung về lối sống, sở thích, ngân sách.\n"
        f"3. Sắp xếp thứ tự từ cao xuống thấp theo 'score', tối đa {max(1, limit)} ứng viên.\n"
        f"4. 'id' trong kết quả PHẢI thuộc danh sách ứng viên đầu vào."
    )

    system_instruction = (
        "Bạn là trợ lý ghép bạn cùng phòng sinh viên thông minh. Đánh giá kỹ sự hòa hợp "
        "về ngân sách, nhịp sinh hoạt (ngủ/thức), mức độ sạch sẽ và thái độ với thuốc lá. "
        "Luôn trả về kết quả JSON chuẩn xác."
    )

    try:
        raw_text = _generate_with_fallback(
            client=client,
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                response_mime_type="application/json",
                response_schema=RoommatesResponseSchema,
                temperature=0.2,
            ),
        )
        if not raw_text:
            return None
        res_dict = json.loads(raw_text)
        cand_ids = {c["id"] for c in candidates}
        valid_results = [
            r for r in res_dict.get("results", []) if r.get("id") in cand_ids
        ]
        if valid_results:
            return {"results": valid_results[:limit]}
    except Exception as exc:
        logger.warning(f"Gemini rank_roommates failed: {exc}")
    return None


# ============================================================================
# 4. POST /areas Schema & Generation
# ============================================================================
class AreaItem(BaseModel):
    ward_id: int = Field(..., description="ward_id của khu vực")
    reason: str = Field(..., description="Lý do đề xuất ngắn gọn bằng tiếng Việt")


class AreasResponseSchema(BaseModel):
    results: list[AreaItem] = Field(..., description="Danh sách khu vực phù hợp nhất")


def recommend_areas_with_gemini(
    preferences: dict[str, Any], areas: list[dict[str, Any]], limit: int = 3
) -> Optional[dict[str, Any]]:
    """Rank and recommend rental areas using Gemini."""
    client = _get_client()
    if not client or not areas:
        return None

    budget_min = preferences.get("budget_min", 0)
    budget_max = preferences.get("budget_max", 0)
    priorities = preferences.get("priorities", [])

    prompt = (
        f"Đề xuất khu vực thuê trọ phù hợp nhất cho sinh viên:\n"
        f"- Ngân sách mong muốn: {budget_min:,} - {budget_max:,} VNĐ/tháng\n"
        f"- Các tiêu chí ưu tiên: {', '.join(priorities) or 'giá hợp lý'}\n\n"
        f"Dữ liệu các khu vực (phường/xã):\n"
    )
    for a in areas:
        dist = a.get("distance_to_school_km")
        rating = a.get("avg_rating")
        dist_str = f"{dist} km" if dist is not None else "chưa có khoảng cách"
        rating_str = f"{rating}/5" if rating is not None else "chưa có đánh giá"
        prompt += (
            f"- ward_id {a.get('ward_id')} ({a.get('name')}): Giá TB {a.get('avg_price', 0):,} VNĐ, "
            f"cách trường {dist_str}, điểm TB {rating_str}, {a.get('listings_count', 0)} tin đăng.\n"
        )

    prompt += (
        f"\nYêu cầu:\n"
        f"1. Chọn ra tối đa {max(1, limit)} khu vực tốt nhất phù hợp với ngân sách và ưu tiên.\n"
        f"2. Viết 'reason' ngắn gọn (1 câu tiếng Việt) nêu rõ tại sao khu vực này phù hợp.\n"
        f"3. Sắp xếp thứ tự từ tốt nhất đến thấp hơn.\n"
        f"4. 'ward_id' PHẢI thuộc danh sách các khu vực trên."
    )

    system_instruction = (
        "Bạn là chuyên gia tư vấn vị trí thuê trọ sinh viên tại TP.HCM. "
        "Cân nhắc hài hòa giữa khoảng cách tới trường và ngân sách hàng tháng. "
        "Luôn trả về JSON đúng cấu trúc."
    )

    try:
        raw_text = _generate_with_fallback(
            client=client,
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                response_mime_type="application/json",
                response_schema=AreasResponseSchema,
                temperature=0.2,
            ),
        )
        if not raw_text:
            return None
        res_dict = json.loads(raw_text)
        area_ids = {a["ward_id"] for a in areas}
        valid_results = [
            r for r in res_dict.get("results", []) if r.get("ward_id") in area_ids
        ]
        if valid_results:
            return {"results": valid_results[:limit]}
    except Exception as exc:
        logger.warning(f"Gemini recommend_areas failed: {exc}")
    return None


# ============================================================================
# 5. POST /chat Schema & Generation (RAG-lite with knowledge.md)
# ============================================================================
class ChatResponseSchema(BaseModel):
    reply: str = Field(..., description="Câu trả lời tư vấn cho sinh viên")


def chat_with_gemini(
    message: str,
    history: list[dict[str, Any]],
    listing: Optional[dict[str, Any]] = None,
) -> Optional[dict[str, str]]:
    """Answer rental questions using Gemini with domain knowledge injection."""
    client = _get_client()
    if not client:
        return None

    legal_tail = " Thông tin mang tính tham khảo, không thay thế tư vấn pháp lý."

    # Construct context from knowledge base and listing
    context_sections = []
    if KNOWLEDGE_BASE:
        context_sections.append(
            f"=== KIẾN THỨC NỀN TẢNG THUÊ TRỌ ===\n{KNOWLEDGE_BASE}"
        )
    if listing:
        context_sections.append(
            f"=== THÔNG TIN PHÒNG TRỌ ĐANG XEM ===\n"
            f"- Tiêu đề: {listing.get('title')}\n"
            f"- Giá: {listing.get('price')} VNĐ/tháng\n"
            f"- Diện tích: {listing.get('area_m2')} m²\n"
            f"- Địa chỉ: {listing.get('address')}, {listing.get('ward')}\n"
            f"- Tiện ích: {', '.join(listing.get('amenities') or [])}\n"
            f"- Mô tả: {listing.get('description', '')}"
        )

    system_instruction = (
        "Bạn là trợ lý ảo thân thiện, đáng tin cậy của nền tảng tìm phòng trọ sinh viên TROSV.\n"
        "Nhiệm vụ của bạn là giải đáp thắc mắc về tìm phòng, giá thuê, tiền cọc, an toàn và hợp đồng thuê trọ.\n\n"
        "QUY TẮC BẮT BUỘC:\n"
        "1. Luôn trả lời bằng tiếng Việt lịch sự, dễ hiểu, ấm áp.\n"
        "2. Sử dụng thông tin trong KIẾN THỨC NỀN TẢNG THUÊ TRỌ để trả lời.\n"
        "3. Nếu câu hỏi liên quan đến hợp đồng, tiền cọc, hoặc pháp lý, BẮT BUỘC kết thúc câu trả lời bằng câu: "
        f"'{legal_tail.strip()}'\n"
        "4. Nếu không có thông tin hoặc không chắc chắn, hãy thành thật nói không biết, không tự bịa đặt.\n"
        "5. Tuyệt đối không bịa đặt thêm thông tin sai lệch về phòng trọ đang xem.\n"
        "6. Luôn trả về định dạng JSON theo schema đã cho."
    )

    contents: list[types.Content] = []
    if context_sections:
        contents.append(
            types.Content(
                role="user",
                parts=[types.Part.from_text(text="\n\n".join(context_sections))],
            )
        )
        contents.append(
            types.Content(
                role="model",
                parts=[
                    types.Part.from_text(
                        text="Tôi đã nắm rõ kiến thức nền tảng và thông tin phòng trọ. Tôi sẵn sàng hỗ trợ sinh viên."
                    )
                ],
            )
        )

    # Append recent conversation history (max 10 turns)
    for turn in history[-10:]:
        role = "user" if turn.get("role") == "user" else "model"
        content_text = str(turn.get("content", ""))
        if content_text.strip():
            contents.append(
                types.Content(
                    role=role,
                    parts=[types.Part.from_text(text=content_text)],
                )
            )

    # Append current message
    contents.append(
        types.Content(
            role="user",
            parts=[types.Part.from_text(text=message)],
        )
    )

    try:
        raw_text = _generate_with_fallback(
            client=client,
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                response_mime_type="application/json",
                response_schema=ChatResponseSchema,
                temperature=0.3,
            ),
        )
        if not raw_text:
            return None
        res_dict = json.loads(raw_text)
        reply = res_dict.get("reply", "").strip()
        if reply:
            return {"reply": reply}
    except Exception as exc:
        logger.warning(f"Gemini chat failed: {exc}")
    return None
