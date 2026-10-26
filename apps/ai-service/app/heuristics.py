from typing import Any, Optional
from fastapi import HTTPException

from app.schemas import (
    AreasReq,
    ChatReq,
    DescriptionReq,
    PriceAdviceReq,
    RoommatesReq,
)


def _int_or(value: Any, default: int) -> int:
    """Ep gia tri bat ky ve int an toan (null/str/None -> default)."""
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _shared_interests(a: dict[str, Any], b: dict[str, Any]) -> list[str]:
    """So huu tinh chung giua hai ho so (khong phan biet hoa/thuong)."""
    sa = {str(x).lower() for x in (a.get("interests") or [])}
    sb = {str(x).lower() for x in (b.get("interests") or [])}
    return sorted(sa & sb)


# ------------------------------------------------------------ roommates
def _score_candidate(req: RoommatesReq, cand: dict[str, Any]) -> tuple[int, str]:
    """Diem tuong thich 0-100 + ly do tieng Viet cho mot ung vien."""
    r = req.requester
    shared = _shared_interests(r, cand)
    overlap = max(
        0,
        min(r.get("budget_max", 0), cand.get("budget_max", 0))
        - max(r.get("budget_min", 0), cand.get("budget_min", 0)),
    )
    score = (
        40
        + 12 * len(shared)
        + (20 if overlap > 0 else 0)
        + (8 if r.get("cleanliness") == cand.get("cleanliness") else 0)
        + (8 if r.get("smoking") == cand.get("smoking") else 0)
    )
    bits = []
    if shared:
        bits.append("Cung thich " + ", ".join(shared))
    bits.append("ngan sach giao nhau" if overlap > 0 else "ngan sach lech nhau")
    if r.get("personality") == cand.get("personality"):
        bits.append("tinh cach tuong dong")
    reason: str = (", ".join(bits) + ".").capitalize()
    return min(score, 100), reason


def score_roommates(req: RoommatesReq) -> dict[str, Any]:
    """Heuristic scoring for roommates."""
    scored = sorted(
        ((_score_candidate(req, c), c["id"]) for c in (req.candidates or [])),
        key=lambda pair: (-pair[0][0], pair[1]),
    )
    return {
        "results": [
            {"id": cid, "score": sc, "reason": why}
            for (sc, why), cid in scored[: max(1, req.limit)]
        ]
    }


# --------------------------------------------------------- price-advice
def advise_price(req: PriceAdviceReq) -> dict[str, Any]:
    """Heuristic price evaluation."""
    price = _int_or(req.listing.get("price"), 0)
    median = _int_or(req.stats.get("median"), 0)
    if median <= 0:
        raise HTTPException(status_code=422, detail="stats.median thieu")
    if price > median * 1.1:
        verdict = "high"
    elif price < median * 0.9:
        verdict = "low"
    else:
        verdict = "fair"
    fair_min = _int_or(req.stats.get("min"), median * 0.9)
    fair_max = _int_or(req.stats.get("max"), median * 1.1)
    compare = "cao hon" if verdict == "high" else ("thap hon" if verdict == "low" else "tuong duong")
    return {
        "verdict": verdict,
        "fair_min": fair_min,
        "fair_max": fair_max,
        "tips": [
            "Hoi ve gia cho thue dai han tu 6 thang",
            "So sanh voi cac phong co dien tich tuong tu trong khu vuc",
            "Kiem tra tien dien, nuoc co tinh theo dong ho hay khoan cu",
        ],
        "message": (
            f"Chao anh/chi, em thay muc gia {price:,} vay {compare} gia trung binh "
            f" khu vuc (khoang {median:,}). Anh/chi co the xem xet chinh lai mot chut duoc khong ah?"
        ).replace(" ,", ","),
    }


# ---------------------------------------------------------------- areas
def _budget_bonus(avg: int, budget_min: int, budget_max: int) -> int:
    """Diem cong/tru theo do phu hop cua gia trung binh voi ngan sach."""
    if not (budget_min and budget_max):
        return 0
    if budget_min <= avg <= budget_max:
        return 20
    return -10 if avg > budget_max else 0


def _priority_bonus(area: dict[str, Any], priorities: set[str], avg: int, budget_max: int) -> int:
    """Diem cong theo tung uu tien (cheap/near_school/well_rated/many_options)."""
    weights = {"cheap": 15, "near_school": 15, "well_rated": 10, "many_options": 10}
    dist = area.get("distance_to_school_km")
    rating = area.get("avg_rating")
    rules = (
        ("cheap", bool(avg) and avg <= budget_max),
        ("near_school", dist is not None and dist <= 3),
        ("well_rated", bool(rating) and float(rating) >= 4),
        ("many_options", _int_or(area.get("listings_count"), 0) >= 20),
    )
    return sum(weights[name] for name, hit in rules if name in priorities and hit)


def _describe_area(area: dict[str, Any], avg: int) -> str:
    """Mo ta mot dong tieng Viet ve khu vuc cho truong `reason`."""
    bits = [f"Gia trung binh {avg:,}" if avg else "Chua co du lieu gia"]
    if area.get("avg_rating"):
        bits.append(f"diem trung binh {area['avg_rating']}")
    if area.get("distance_to_school_km") is not None:
        bits.append(f"cach truong {area['distance_to_school_km']} km")
    bits.append(f"{area.get('listings_count', 0)} tin dang")
    return ("; ".join(bits) + ".").capitalize()


def recommend_areas(req: AreasReq) -> dict[str, Any]:
    """Heuristic area recommendations."""
    prefs = req.preferences
    budget_max = _int_or(prefs.get("budget_max"), 0)
    budget_min = _int_or(prefs.get("budget_min"), 0)
    priorities = set(prefs.get("priorities") or [])

    def score(area: dict[str, Any]) -> tuple[int, str]:
        avg = _int_or(area.get("avg_price"), 0)
        s = 50
        s += _budget_bonus(avg, budget_min, budget_max)
        s += _priority_bonus(area, priorities, avg, budget_max)
        return min(s, 100), _describe_area(area, avg)

    ranked = sorted(
        ((score(a), a["ward_id"]) for a in (req.areas or [])),
        key=lambda p: (-p[0][0], p[1]),
    )
    return {
        "results": [
            {"ward_id": wid, "reason": why}
            for (sc, why), wid in ranked[: max(1, req.limit)]
        ]
    }


# ----------------------------------------------------------------- chat
_DEPOSIT_KW = ("coc", "deposit", "hop dong", "contract", "phap ly")
_PRICE_KW = ("gia", "price", "bao nhieu", "re", "muc gia")


def _reply_about_deposit() -> str:
    """Cau tra loi FAKE_MODE cho nhom cau hoi tien coc/hop dong."""
    return (
        "Thong thuong tien coc bang 1 den 2 thang tien phong, va can ky hop dong "
        "ghi ro tien coc, gia thue, ky han va dieu khoan hoan tra. Truoc khi ky, "
        "hay kiem tra giay to chu nha, doc ky dieu khoan ve quan ly va sua chua."
    )


def _reply_about_price(listing: Optional[dict[str, Any]]) -> str:
    """Cau tra loi FAKE_MODE cho nhom cau hoi ve gia (co/khong ngu canh tin)."""
    if listing:
        return (
            f"Tin \u201c{listing.get('title')}\u201d co gia {_int_or(listing.get('price'), 0):,} "
            f"cho {listing.get('area_m2')} m2 tai {listing.get('ward')}. Ban co the dung "
            "tinh nang Tu van gia AI ngay trang chi tiet phong de so sanh voi cac tin tuong tu."
        )
    return (
        "Gia phong tro khu vuc thuoc dai hoc thuong tu 1,5 den 4 trieu mot thang "
        "tuy dien tich va tien ich. Ban vao trang Ban do hoac Tim phong, loc theo "
        "khoang gia va khoang cach toi truong de thay muc pho bien quanh ban."
    )


def _reply_about_listing(listing: dict[str, Any]) -> str:
    """Cau tra loi FAKE_MODE khi ngu canh la mot tin dang cu the."""
    return (
        f"Ve tin \u201c{listing.get('title')}\u201d tai {listing.get('address')}: "
        "ban co the xem anh, tien ich va danh gia tren trang chi tiet. Neu thich, "
        "bam Nhan tin de noi chuyen truc tiep voi chu nha."
    )


def reply_chat(req: ChatReq) -> dict[str, Any]:
    """Heuristic chatbot replies."""
    msg = req.message.lower()
    tail = " Thong tin mang tinh tham khao, khong thay the tu van phap ly."
    if any(k in msg for k in _DEPOSIT_KW):
        return {"reply": _reply_about_deposit() + tail}
    if any(k in msg for k in _PRICE_KW):
        return {"reply": _reply_about_price(req.listing)}
    if req.listing:
        return {"reply": _reply_about_listing(req.listing)}
    return {
        "reply": (
            "Minh co the giu ve tim phong, gia ca, tien coc va hop dong thue tro. "
            "Ban muon hoi dieu gi truoc?"
        )
    }


# ---------------------------------------------------------- description
_TYPE_LABELS = {"room": "Phong tro", "apartment": "Can ho", "house": "Nha nguyen can"}


def generate_description(req: DescriptionReq) -> dict[str, Any]:
    """Heuristic description generation."""
    type_label = _TYPE_LABELS.get(req.type or "", "Phong tro")
    parts: list[str] = [f"{type_label} \u201c{req.title}\u201d dang cho thue"]
    if req.area_m2:
        parts.append(f"dien tich {req.area_m2:g} m2")
    if req.ward or req.address:
        parts.append("vi tri " + ", ".join(x for x in [req.address, req.ward] if x))
    if req.amenities:
        parts.append("co san " + ", ".join(req.amenities))
    if req.price:
        parts.append(f"gia thue {_int_or(req.price, 0):,} dong mot thang")
    body = ", ".join(parts) + ". Khong gian thoang, phu hop sinh vien hoac nguoi di lam muon an toan, tien nghi gan nha. Lien he truc tiep qua tin nhan trong trang de xem phong va trao doi chi tiet."
    words = body.split()
    return {"description": " ".join(words[:130])}
