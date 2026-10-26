# TROSV

Website tìm phòng trọ gần trường cho sinh viên: duyệt tin, xem bản đồ,
lọc theo trường và phường, nhắn tin trực tiếp với chủ trọ, yêu thích,
đánh giá, và các gợi ý AI (bạn cùng phòng, tư vấn giá, gợi ý khu vực,
trợ lý chat).

## Tính năng

| Tính năng | Ghi chú |
|---|---|
| Duyệt và lọc phòng | Từ khóa, loại tin, giá, khu vực (tỉnh/TP → phường), gần trường (bán kính km), tiện ích, sắp xếp |
| Bản đồ | Leaflet, điểm tin đăng + trường, lọc theo bán kính |
| Tài khoản | Sinh viên / chủ nhà, hồ sơ sở thích và lối sống |
| Nhắn tin | Chat realtime (WebSocket), gửi tệp đính kèm, đánh dấu đã đọc |
| Đánh giá | Chỉ sinh viên đã nhắn tin với chủ nhà mới được đánh giá |
| AI | Gợi ý bạn cùng phòng, tư vấn giá, gợi ý khu vực, chatbot, viết mô tả tin đăng |
| Phân quyền | API chặn theo vai trò; người ngoài không nhìn thấy dữ liệu không công khai |

## Kiến trúc

```mermaid
graph LR
    FE["Frontend (React SPA)"] -->|"JSON + Bearer token"| BE["Backend: Laravel API"]
    BE --> DB[(PostgreSQL)]
    BE -->|JSON| AI["AI service: FastAPI"]
```

- Frontend chỉ gọi Backend. Backend proxy sang AI service.
- AI service không chạm database, không cần LLM key khi chạy demo
  (`FAKE_MODE=true` trả dữ liệu mẫu đúng hợp đồng; backend tự trả 503
  lịch sự khi AI chết).

## Chạy trên máy

Cần Docker (hoặc Podman) trên Debian. Chi tiết đầy đủ trong
[docs/runbooks/DEPLOY.md](docs/runbooks/DEPLOY.md).

```bash
cp .env.example .env    # điền APP_KEY (lệnh tạo có sẵn trong file)
make up                 # khởi động container (hoặc COMPOSE="docker compose" make up)
```

| Dịch vụ | Địa chỉ |
|---|---|
| Web | http://localhost:5174 |
| API | http://localhost:5174/api (same-origin) hoặc :8000/api |
| AI service (tùy chọn) | `docker compose --profile ai up -d` → :8001/docs |

Dữ liệu demo: đặt `SEED_ON_BOOT=1` trong `.env`, hoặc chạy tay
`docker compose exec backend php artisan migrate:fresh --seed --force`.
Tài khoản demo (mật khẩu `password`): `student1@example.com` (sinh viên),
`landlord1@example.com` (chủ nhà).

Lệnh hay dùng (qua Makefile):

```bash
make logs               # xem log container theo thời gian thực
make down               # tắt, giữ nguyên dữ liệu volumes
make smoke              # chạy smoke test API và xác thực
make check              # chạy toàn bộ lint-api, test-api, lint-web, build-web
make help               # xem tất cả các target hỗ trợ
```

> [!WARNING]
> **Xóa toàn bộ dữ liệu (Full Reset)**: Khi cần dọn dẹp triệt để và **XÓA TOÀN BỘ DỮ LIỆU** (bao gồm volume cơ sở dữ liệu `pgdata` và volume lưu trữ file `trosv-storage`), chạy lệnh Docker trực tiếp:
> ```bash
> docker compose down -v
> ```
> *Makefile cố tình không cung cấp target này để tránh rủi ro vô tình xóa mất dữ liệu.*

Chạy không Docker (PHP + Node trực tiếp): `bash infra/deploy/deploy.sh` (lần sau thêm
`--quick` để giữ DB).

## Kiểm thử

| Lệnh | Phạm vi |
|---|---|
| `php artisan test` (trong thư mục `apps/api/`) | 210+ Feature test, gồm ma trận phân quyền |
| `./vendor/bin/pint --test` | Code style backend |
| `npm run lint && npm run build` (thư mục `apps/web/`) | ESLint + kiểm CSS + TypeScript strict + build |
| `npx playwright test` (thư mục `apps/web/`) | E2E trình duyệt thật, cần API :8000 + web :4173 |
| `bash scripts/e2e-smoke.sh` | Smoke mọi API theo luồng người dùng, AI tắt vẫn xanh |

CI (GitHub Actions) chạy đủ 4 job: backend, frontend, e2e, quét secret.
Merge vào `stable` khi xanh là tự động deploy.

## Git

- `unstable`: nhánh tích hợp. Làm trên nhánh riêng (`be/...`, `fe/...`,
  `ai/...`) rồi merge vào đây.
- `stable`: nhánh release. Chỉ cập nhật qua PR từ `unstable` sau khi CI
  xanh; merge là deploy tự động.
- Commit: conventional, tiếng Việt không dấu, gọn một dòng
  (`fix(fe): ...`, `feat(be): ...`).

## Tài liệu

| File | Nội dung | Đọc khi |
|---|---|---|
| [docs/contracts/API_CONTRACT.md](docs/contracts/API_CONTRACT.md) | Hợp đồng API: endpoint, shape JSON, mã lỗi | Làm backend/frontend - nguồn sự thật, đổi API phải sửa đây trước |
| [docs/contracts/AI_CONTRACT.md](docs/contracts/AI_CONTRACT.md) | Hợp đồng giữa Backend và AI service | Làm AI service |
| [docs/contracts/ERD.md](docs/contracts/ERD.md) | Cơ sở dữ liệu: bảng, quan hệ, dữ liệu seed | Làm backend, sửa migration |
| [docs/ONBOARDING.md](docs/ONBOARDING.md) | Onboarding người mới | Ngày đầu vào nhóm |
| [docs/runbooks/DEPLOY.md](docs/runbooks/DEPLOY.md) | Deploy lên máy chủ Debian | Triển khai production |
| [docs/runbooks/DEMO.md](docs/runbooks/DEMO.md) | Chạy thử nghiệm nhanh (demo) | Demo nội bộ hoặc đánh giá tính năng |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Quy ước phân nhánh, commit style, chạy kiểm tra | Trước khi mở Pull Request |
| [SECURITY.md](SECURITY.md) | Chính sách bảo mật, cách báo cáo lỗ hổng | Báo cáo hoặc tìm hiểu biện pháp bảo mật |
| [docs/reports/TECH-DEBT.md](docs/reports/TECH-DEBT.md) | Sổ nợ kỹ thuật và quy trình theo dõi | Trước khi refactor |
| [docs/reports/BACKEND-AUDIT-REPORT.md](docs/reports/BACKEND-AUDIT-REPORT.md) | Báo cáo kiểm tra và tối ưu hóa backend toàn diện | Tham khảo kiến trúc và hiệu năng backend |
| [docs/reports/PLAN.md](docs/reports/PLAN.md) | Kế hoạch triển khai và roadmap | Nắm định hướng phát triển |
| [infra/backup/RESTORE.md](infra/backup/RESTORE.md) | Quy trình restore từ backup | Khi cần khôi phục dữ liệu |
| [docs/runbooks/ROLLBACK.md](docs/runbooks/ROLLBACK.md) | Quy trình rollback code | Khi deployment lỗi |

## Cấu trúc

```
trosv/
├── Makefile             # Quản lý và kiểm tra nhanh (help, up, down, check, smoke, ...)
├── docker-compose.yml   # DB + backend + frontend + reverb + queue + scheduler
│                        # (+ caddy khi profile tls, + ai-service khi profile ai)
├── .env.example
├── CONTRIBUTING.md      # Quy ước đóng góp, nhánh git, commit style
├── docs/                # contracts/, architecture/, reports/, runbooks/, ONBOARDING.md
├── infra/               # docker/ (Caddyfile), deploy/ (deploy.sh), backup/ (backup.sh, RESTORE.md)
├── scripts/             # công cụ nợ kỹ thuật & dev helpers
└── apps/
    ├── api/             # Laravel API (PHP 8.3, PostgreSQL 16, Sanctum, Reverb)
    ├── web/             # React 18 SPA (TypeScript strict, Vite, Tailwind CSS v4, Radix UI, Leaflet)
    └── ai-service/      # FastAPI (stub FAKE_MODE)
```
