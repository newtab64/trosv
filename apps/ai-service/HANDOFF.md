# AI Service - Handoff

Trạng thái: **Đã hoàn thiện cả stub FAKE_MODE lẫn tích hợp Google Gemini thật** trong package `app/`.
- Khi `FAKE_MODE=true`: chạy logic heuristic nội bộ, không cần key và không gọi ra ngoài.
- Khi `FAKE_MODE=false`: gọi Google Gemini (`gemini-3.5-flash-lite`, fallback `gemini-3.5-flash`) nếu có `GEMINI_API_KEY` hoặc `LLM_API_KEY`. Nếu thiếu key, trả 503 (`guard_fake`). Nếu Gemini gặp sự cố mạng hoặc hạn mức, tự động fallback sang engine heuristic để duy trì uptime.
Hợp đồng đầu-cuối: [docs/contracts/AI_CONTRACT.md](../../docs/contracts/AI_CONTRACT.md).

## Bối cảnh

- `docker-compose.yml` đã có service `ai-service` (profile `ai`): build từ
  thư mục này, chạy `uvicorn app.main:app --port 8001`, env `FAKE_MODE` +
  `GEMINI_API_KEY` / `LLM_API_KEY` đọc từ `.env` gốc repo.
- Backend làm proxy: `POST /api/ai/*` (hợp đồng §4) → forward JSON sang
  `AI_URL` (docker: `http://ai-service:8001`). Lỗi/không 2xx/sai shape →
  backend trả 503 "Dịch vụ AI tạm thời không khả dụng."
- Frontend không bao giờ gọi service này trực tiếp.

## Nguyên tắc thiết kế & vận hành

- Giữ nguyên 5 endpoint và response shape theo hợp đồng §4 - backend và
  frontend đang phụ thuộc chính xác các trường này.
- **Stateless**: backend gửi đủ ngữ cảnh trong body. Cần thêm dữ liệu DB
  thì đề nghị backend bổ sung vào body, không tự kết nối PostgreSQL.
- Thời gian phản hồi ≤ 30 giây; lỗi nào cũng trả JSON có nghĩa.
- Không đưa name/email/phone vào output ngoài các trường hợp đồng cho phép.
- Không sửa `apps/api/` hay `docs/` - cần đổi interface thì đề xuất sửa hợp
  đồng trước, cả nhóm đồng thuận rồi mới code.

## Kiểm tra vận hành

```bash
# Kiểm tra với FAKE_MODE (không cần key):
FAKE_MODE=true docker compose --profile ai up -d --build ai-service
curl localhost:8001/health
curl -X POST localhost:8001/chat -H "Content-Type: application/json" \
  -d '{"message": "cho hỏi giá phòng gần UIT"}'

# Chạy kiểm thử hợp đồng tự động:
make test-ai
```

Rồi chạy lại backend test (`php artisan test`) - các test AI dùng
`Http::fake` nên vẫn phải xanh; cuối cùng thử thật qua backend:
`POST /api/ai/chat` với Bearer token.
