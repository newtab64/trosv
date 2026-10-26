# Productionization Plan - Status

Mục tiêu: đưa TROSV thành dự án full-stack gọn, an toàn, có test, chạy
production được - **không đổi** các hợp đồng trong `docs/` và không đổi
hành vi người dùng. Tất cả các phase dưới đây đã hoàn thành và merge vào
`stable`.

## Đã xong

| Phase | Nội dung | Bằng chứng |
|---|---|---|
| 1. Safety net | PHPUnit chạy trên PostgreSQL; Playwright config cho CI; `GET /api/health` | `apps/api/tests/` (210+ test), `apps/web/playwright.config.ts` |
| 2. Debloat + tối ưu | Tách service/form-request, bỏ N+1, index + JSONB, chuyển đổi UI sang Tailwind CSS v4 + Radix UI + Lucide React, tối ưu Dockerfile | `docs/reports/TECH-DEBT.md`, `apps/web/src/styles.css` |
| 3. Đúng đắn | FormRequest cho mọi endpoint ghi, IDOR sweep, idempotency seen/reaction, regression test cho từng fix | `apps/api/tests/Feature/` |
| 4. Bảo mật | Security headers + CSP enforcing, prod fail-fast, token TTL 30 ngày, upload validation, gitleaks trong CI, `SECURITY.md` | `SECURITY.md`, `apps/api/app/Http/Middleware/` |
| 5. Production | CI 4 job (backend/frontend/e2e/secrets), deploy-on-green qua SSH, image Debian trixie, compose production-tier duy nhất, runbook + backup/restore/rollback | `.github/workflows/`, `docs/runbooks/DEPLOY.md`, `infra/backup/` |
| 6. Kiểm chứng cuối | Suite backend 210+ test xanh trên PostgreSQL, e2e 11+ spec trình duyệt thật, drill backup→restore chạy thật | CI trên `stable` |
| 7. Audit & tối ưu toàn diện | Sửa foreign key User/School, thêm index hiệu năng, xử lý atomic upload ảnh, tối ưu subquery rating và rate-limiting, khử bỏ Bootstrap hoàn toàn | `docs/reports/BACKEND-AUDIT-REPORT.md`, `apps/api/database/migrations/2026_10_11_*` |

## Hợp đồng bất khả xâm phạm

- `docs/contracts/API_CONTRACT.md`, `docs/contracts/AI_CONTRACT.md`, `docs/contracts/ERD.md` - mọi thay
  đổi phải sửa hợp đồng trước, code sau.
- Bearer token trong `localStorage`: giữ nguyên (quyết định hợp đồng;
  phương án httpOnly cookie để trong mục "Tiếp theo" nếu cần).

## Tiếp theo (chưa làm, theo thứ tự ưu tiên)

1. Chạy deploy thật trên máy chủ theo `docs/runbooks/DEPLOY.md` + cấu hình secrets
   (`DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`, `DEPLOY_PATH`) để
   deploy-on-green vận hành thực tế.
2. Quên mật khẩu / đặt lại mật khẩu (blocker trước khi có người dùng thật).
3. Audit dữ liệu ward/school của các tỉnh/TP còn lại theo danh mục hành
   chính sau sáp nhập (TP.HCM đã chuẩn hóa).
4. Cung cấp API key production cho AI service (mã nguồn đã tích hợp sẵn Google Gemini với model mặc định `gemini-3.5-flash-lite`, chỉ cần cấu hình `GEMINI_API_KEY` hoặc `LLM_API_KEY` và `FAKE_MODE=false`).
5. httpOnly cookie session (thay localStorage token) - cân nhắc sau.
