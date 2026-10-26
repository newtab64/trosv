import pytest
from fastapi.testclient import TestClient


def get_app_and_module():
    """Import FastAPI app and module across flat layout and package layout."""
    try:
        import main as m
        return m.app, m
    except ImportError:
        try:
            import app.main as m
            return m.app, m
        except ImportError:
            import app as m
            return m.app, m


app, app_module = get_app_and_module()


@pytest.fixture
def client():
    return TestClient(app)


def set_fake_mode(monkeypatch, enabled: bool):
    """Set FAKE_MODE in environment and loaded modules, unsetting LLM keys."""
    monkeypatch.setenv("FAKE_MODE", "true" if enabled else "false")
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    monkeypatch.delenv("LLM_API_KEY", raising=False)
    for mod_name in ["main", "app.main", "app", "config", "app.config", "routers", "app.routers"]:
        try:
            mod = __import__(mod_name, fromlist=["FAKE_MODE", "guard_fake"])
            if hasattr(mod, "FAKE_MODE"):
                monkeypatch.setattr(mod, "FAKE_MODE", enabled)
        except ImportError:
            pass


# ----------------------------------------------------------------------
# 1. GET /health
# ----------------------------------------------------------------------

def test_health_endpoint(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_health_returns_200_even_when_fake_mode_disabled(client, monkeypatch):
    set_fake_mode(monkeypatch, False)
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


# ----------------------------------------------------------------------
# 2. POST /roommates
# ----------------------------------------------------------------------

def test_roommates_contract_shape(client):
    payload = {
        "requester": {
            "id": 1,
            "budget_min": 1500000,
            "budget_max": 3000000,
            "sleep_schedule": "normal",
            "cleanliness": 4,
            "smoking": False,
            "personality": "introvert",
            "interests": ["music", "gym"],
        },
        "candidates": [
            {
                "id": 45,
                "budget_min": 2000000,
                "budget_max": 3500000,
                "sleep_schedule": "late",
                "cleanliness": 3,
                "smoking": False,
                "personality": "ambivert",
                "interests": ["music", "reading"],
            }
        ],
        "limit": 5,
    }
    response = client.post("/roommates", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "results" in data
    assert isinstance(data["results"], list)
    assert len(data["results"]) == 1

    candidate = data["results"][0]
    assert candidate["id"] == 45
    assert isinstance(candidate["score"], int)
    assert 0 <= candidate["score"] <= 100
    assert isinstance(candidate["reason"], str)
    assert len(candidate["reason"]) > 0


def test_roommates_empty_candidates(client):
    payload = {
        "requester": {
            "id": 1,
            "budget_min": 1500000,
            "budget_max": 3000000,
            "sleep_schedule": "normal",
            "cleanliness": 4,
            "smoking": False,
            "personality": "introvert",
            "interests": ["music"],
        },
        "candidates": [],
        "limit": 5,
    }
    response = client.post("/roommates", json=payload)
    assert response.status_code == 200
    assert response.json() == {"results": []}


# ----------------------------------------------------------------------
# 3. POST /price-advice
# ----------------------------------------------------------------------

def test_price_advice_contract_shape(client):
    payload = {
        "listing": {
            "type": "room",
            "price": 2500000,
            "area_m2": 22.5,
            "ward": "Thủ Đức",
            "amenities": ["Wi-Fi", "Máy lạnh"],
        },
        "stats": {
            "count": 12,
            "min": 1800000,
            "median": 2300000,
            "max": 3200000,
        },
    }
    response = client.post("/price-advice", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["verdict"] in ["high", "fair", "low"]
    assert isinstance(data["fair_min"], int)
    assert isinstance(data["fair_max"], int)
    assert data["fair_min"] <= data["fair_max"]
    assert isinstance(data["tips"], list)
    for tip in data["tips"]:
        assert isinstance(tip, str)
    assert isinstance(data["message"], str)
    assert len(data["message"]) > 0


# ----------------------------------------------------------------------
# 4. POST /areas
# ----------------------------------------------------------------------

def test_areas_contract_shape(client):
    payload = {
        "preferences": {
            "budget_min": 1500000,
            "budget_max": 3000000,
            "priorities": ["cheap", "near_school"],
        },
        "areas": [
            {
                "ward_id": 1,
                "name": "Thủ Đức",
                "listings_count": 41,
                "avg_price": 2300000,
                "avg_rating": 4.2,
                "distance_to_school_km": 1.2,
            }
        ],
        "limit": 3,
    }
    response = client.post("/areas", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert "results" in data
    assert isinstance(data["results"], list)
    assert len(data["results"]) == 1
    area = data["results"][0]
    assert area["ward_id"] == 1
    assert isinstance(area["reason"], str)
    assert len(area["reason"]) > 0


# ----------------------------------------------------------------------
# 5. POST /chat
# ----------------------------------------------------------------------

def test_chat_contract_general_reply(client):
    payload = {"message": "Khu vực này có thuận tiện đi xe buýt không?"}
    response = client.post("/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "reply" in data
    assert isinstance(data["reply"], str)
    assert len(data["reply"]) > 0


def test_chat_deposit_includes_legal_tail(client):
    payload = {"message": "Tien coc thue phong thuong la bao nhieu?"}
    response = client.post("/chat", json=payload)
    assert response.status_code == 200
    reply = response.json()["reply"]
    assert "khong thay the tu van phap ly" in reply.lower() or "không thay thế tư vấn pháp lý" in reply.lower()


def test_chat_with_listing_context(client):
    payload = {
        "message": "Phòng này giá bao nhiêu một tháng?",
        "listing": {
            "title": "Phòng trọ gần ĐHQG",
            "price": 2500000,
            "area_m2": 22.5,
            "ward": "Thủ Đức",
            "address": "12 Đường số 5",
            "amenities": ["Wi-Fi"],
            "description": "Phòng đẹp",
        },
    }
    response = client.post("/chat", json=payload)
    assert response.status_code == 200
    reply = response.json()["reply"]
    assert isinstance(reply, str)
    assert len(reply) > 0


# ----------------------------------------------------------------------
# 6. POST /description
# ----------------------------------------------------------------------

def test_description_contract_shape(client):
    payload = {
        "title": "Phòng trọ gần ĐHQG",
        "type": "room",
        "price": 2500000,
        "area_m2": 22.5,
        "address": "12 Đường số 5",
        "ward": "Thủ Đức",
        "amenities": ["Wi-Fi", "Máy lạnh"],
    }
    response = client.post("/description", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "description" in data
    assert isinstance(data["description"], str)
    assert len(data["description"]) > 0


# ----------------------------------------------------------------------
# 7. 503 behavior when FAKE_MODE=false and no LLM API key configured
# ----------------------------------------------------------------------

@pytest.mark.parametrize("endpoint,payload", [
    (
        "/roommates",
        {
            "requester": {
                "id": 1,
                "budget_min": 1500000,
                "budget_max": 3000000,
                "sleep_schedule": "normal",
                "cleanliness": 4,
                "smoking": False,
                "personality": "introvert",
                "interests": ["music"],
            },
            "candidates": [
                {
                    "id": 45,
                    "budget_min": 2000000,
                    "budget_max": 3500000,
                    "sleep_schedule": "late",
                    "cleanliness": 3,
                    "smoking": False,
                    "personality": "ambivert",
                    "interests": ["music"],
                }
            ],
            "limit": 5,
        },
    ),
    (
        "/price-advice",
        {
            "listing": {
                "type": "room",
                "price": 2500000,
                "area_m2": 22.5,
                "ward": "Thủ Đức",
                "amenities": ["Wi-Fi"],
            },
            "stats": {"count": 12, "min": 1800000, "median": 2300000, "max": 3200000},
        },
    ),
    (
        "/areas",
        {
            "preferences": {"budget_min": 1500000, "budget_max": 3000000, "priorities": ["cheap"]},
            "areas": [
                {
                    "ward_id": 1,
                    "name": "Thủ Đức",
                    "listings_count": 41,
                    "avg_price": 2300000,
                    "avg_rating": 4.2,
                    "distance_to_school_km": 1.2,
                }
            ],
            "limit": 3,
        },
    ),
    (
        "/chat",
        {"message": "Tiền cọc thường là bao nhiêu?"},
    ),
    (
        "/description",
        {"title": "Phòng trọ gần ĐHQG", "type": "room", "price": 2500000, "area_m2": 22.5},
    ),
])
def test_endpoints_return_503_when_fake_mode_disabled(client, monkeypatch, endpoint, payload):
    set_fake_mode(monkeypatch, False)
    response = client.post(endpoint, json=payload)
    assert response.status_code == 503
    detail = response.json().get("detail", "")
    assert "chua duoc cau hinh" in detail.lower() or "gemini" in detail.lower()
