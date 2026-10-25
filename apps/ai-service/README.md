# AI service

FastAPI service triển khai [docs/contracts/AI_CONTRACT.md](../../docs/contracts/AI_CONTRACT.md)
(5 endpoint + `/health`). **Chỉ Backend gọi service này** - frontend không
bao giờ gọi trực tiếp.

Trạng thái hiện tại: **Đã tích hợp Google Gemini (Gemini 1.5 Flash)**.
Khi `GEMINI_API_KEY` (hoặc `LLM_API_KEY`) được cung cấp và `FAKE_MODE=false`,
toàn bộ 5 endpoint đều gọi model Gemini để sinh văn bản và đánh giá thông minh
với structured JSON output. Nếu không có key hoặc gặp sự cố mạng/hạn mức,
hệ thống tự động kích hoạt engine heuristic dự phòng (fallback) để đảm bảo 100% uptime.

## Chạy

```bash
# Trong docker stack (với Gemini):
GEMINI_API_KEY=your_key FAKE_MODE=false docker compose --profile ai up -d --build ai-service

# Độc lập:
pip install -r requirements.txt
GEMINI_API_KEY=your_key FAKE_MODE=false uvicorn app.main:app --port 8001
```

Swagger UI: http://localhost:8001/docs

## Thử nhanh

```bash
curl localhost:8001/health
curl -X POST localhost:8001/description -H 'Content-Type: application/json' \
  -d '{"title":"Phòng trọ gần ĐHQG","type":"room","price":2500000,"area_m2":22.5,"ward":"Thủ Đức","amenities":["Wi-Fi","Máy lạnh"]}'
```

Kết quả mong đợi: `/health` → `{"status":"ok"}`, `/description` → JSON có
trường `description` (tiếng Việt). Backend tự kiểm tra shape; sai shape
bị tính là 503 phía backend.

## Cấu hình Gemini

Yêu cầu từ hợp đồng ([docs/contracts/AI_CONTRACT.md](../../docs/contracts/AI_CONTRACT.md)):

- 5 endpoint: `/roommates`, `/price-advice`, `/areas`, `/chat`, `/description` - request/response shape bám đúng hợp đồng.
- **Stateless**: backend gửi đủ ngữ cảnh trong body; không kết nối cơ sở dữ liệu.
- Thời gian phản hồi ≤ 30 giây.
- `GEMINI_API_KEY` (hoặc `LLM_API_KEY`) đọc từ biến môi trường. `GEMINI_MODEL` mặc định là `gemini-3.5-flash-lite` (tự động thử các model flash dự phòng nếu gặp tải cao).

