# 2. Backend Lam Proxy Cho AI Service

- **Trang thai**: Accepted
- **Ngay**: 2026-10-14
- **Nguoi quyet dinh**: Doi ngu phat trien TROSV

## Boi canh (Context)

TROSV cung cap cac tinh nang AI ho tro tim tro, bao gom:
- De xuat khu vuc thue phong (`POST /api/ai/recommend-areas`)
- Ghep ban o ghep phu hop (`POST /api/ai/match-roommates`)
- Tro ly tu van phong tro bang ngon ngu tu nhien (`POST /api/ai/chat` & `/stream`)
- Tu van dinh gia phong cho chu nha (`POST /api/ai/suggest-price`)

Cac tinh nang nay duoc xu ly boi mot microservice rieng biet (`ai-service` viet bang Python/FastAPI), su dung mo hinh LLM (Google Gemini).

## Quyet dinh (Decision)

Chung toi quyet dinh **toan bo request tu trinh duyet phai di qua Laravel Backend (`/api/ai/*`)**, sau do backend se dong vai tro reverse proxy goi noi bo toi `ai-service` (`http://ai-service:8001`). Frontend tuyet doi **khong bao gio** goi truc tiep den `ai-service`.

## Ly do (Rationale)

1. **Bao mat khoa API (API Key Protection)**:
   - Khoa truy cap LLM (`GEMINI_API_KEY`, `LLM_API_KEY`) chi duoc luu tren server trong mang compose noi bo, khong bao gio lo ra ngoai trinh duyet.

2. **Phan quyen & Kiem soat truy cap (RBAC & Throttling)**:
   - Backend dung Laravel Sanctum de kiem tra vai tro (vi du: chi sinh vien moi duoc tim ban o ghep, chi chu nha moi duoc xin tu van gia phong).
   - Rate limit tap trung thong qua `ApiThrottle` de ngan chan spam va can kiet quota LLM.

3. **Kha nang chiu loi & Co che phong ve (Graceful Degradation / Fallback)**:
   - Neu `ai-service` gap su co, bi crash hoac vuot han muc Gemini, backend bat loi ket noi va tra ve ma HTTP 503 kem thong bao than thien (`Dịch vụ AI tạm thời không khả dụng.`), giup ung dung khong bi vo UI.
   - Ho tro che do `FAKE_MODE=true` cho moi truong dev/test/CI ma khong can API key that.

4. **Kien truc don gian (Single Public Origin)**:
   - Frontend chi can biet mot API origin duy nhat (`/api/*`), khong can cau hinh CORS phuc tap giua nhieu domain khac nhau.

## Rui ro & Bien phap giam thieu (Consequences & Mitigations)

- **Do tre (Latency)**: Request phai di qua mot hop trung gian (Frontend -> Backend -> AI Service -> LLM).
  - *Giam thieu*: Giao tiep giua Backend va AI Service dien ra qua mang Docker bridge cuc bo nen do tre bo sung khong dang ke (< 5ms).
  - Ho tro streaming response (`/api/ai/chat/stream`) qua Server-Sent Events (SSE) de nguoi dung nhan ket qua tuc thi ma khong can doi toan bo cau tra loi.
