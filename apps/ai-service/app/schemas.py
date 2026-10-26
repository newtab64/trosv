from typing import Any, Optional
from pydantic import BaseModel


class BaseReq(BaseModel):
    """Request base: bo qua truong khong khai bao (contract cho phep)."""

    model_config = {"extra": "ignore"}


class RoommatesReq(BaseReq):
    """POST /roommates - requester + candidate profiles de xep hang."""

    requester: dict[str, Any]
    candidates: Optional[list[dict[str, Any]]] = []
    limit: int = 5


class PriceAdviceReq(BaseReq):
    """POST /price-advice - tin dang + thong ke thi truong tu backend."""

    listing: dict[str, Any]
    stats: dict[str, Any]


class AreasReq(BaseReq):
    """POST /areas - uu tien sinh vien + thong ke tung khu vuc."""

    preferences: dict[str, Any]
    areas: Optional[list[dict[str, Any]]] = []
    limit: int = 3


class ChatReq(BaseReq):
    """POST /chat - cau hoi + lich su hoi thoai + ngu canh tin dang."""

    message: str
    history: Optional[list[dict[str, Any]]] = []
    listing: Optional[dict[str, Any]] = None


class DescriptionReq(BaseReq):
    """POST /description - thong tin co ban cua tin dang can viet mo ta."""

    title: str
    type: Optional[str] = None
    price: Optional[int] = None
    area_m2: Optional[float] = None
    address: Optional[str] = None
    ward: Optional[str] = None
    amenities: Optional[list[str]] = []
