# Quy trình đóng góp (Contributing)

Tài liệu này tóm tắt các quy ước phát triển chính của dự án TROSV.

## 1. Cấu trúc ứng dụng

Mã nguồn của 3 ứng dụng nằm độc lập trong thư mục `apps/`:
- `apps/api/`: Laravel RESTful API (PHP 8.3, PostgreSQL 16, Sanctum, Reverb)
- `apps/web/`: React 18 SPA (TypeScript strict, Vite, Tailwind CSS v4, Radix UI)
- `apps/ai-service/`: FastAPI microservice (Python 3.12, Google Gemini / stub FAKE_MODE)

Tài liệu thiết kế kiến trúc và quyết định kỹ thuật: [docs/architecture/](docs/architecture/).

## 2. Quy tắc hợp đồng trước (Contract-first)

Mọi thay đổi liên quan đến interface dữ liệu, API schema, hoặc định dạng AI response đều phải **thay đổi và thống nhất tại `docs/contracts/` trước khi viết code**:
- [docs/contracts/API_CONTRACT.md](docs/contracts/API_CONTRACT.md): Quy định endpoint, status code, payload và response envelope của backend.
- [docs/contracts/AI_CONTRACT.md](docs/contracts/AI_CONTRACT.md): Quy định input/output schema của các endpoint AI service.
- [docs/contracts/ERD.md](docs/contracts/ERD.md): Thiết kế lược đồ cơ sở dữ liệu quan hệ.

Tuyệt đối không tự ý thay đổi shape JSON mà chưa cập nhật hợp đồng.

## 3. Phân nhánh (Git Branches)

- `unstable`: Nhánh tích hợp chính cho mọi tính năng mới đang phát triển.
- Các nhánh tính năng được tách ra từ `unstable` theo tiền tố:
  - `be/<ten-tinh-nang>`: Thay đổi backend API
  - `fe/<ten-tinh-nang>`: Thay đổi frontend web
  - `ai/<ten-tinh-nang>`: Thay đổi AI service
  - `chore/<ten-cong-viec>`: Cập nhật hạ tầng, tài liệu, cấu hình
- `stable`: Nhánh production. **Chỉ merge vào `stable` thông qua Pull Request từ `unstable`** sau khi đã vượt qua toàn bộ CI và kiểm thử thực tế.

## 4. Quy ước Commit

- Sử dụng Conventional Commits định dạng một dòng, viết bằng tiếng Việt không dấu:
  ```
  <type>(<scope>): <thong diep mot dong khong dau>
  ```
- Ví dụ:
  - `feat(be): them bo loc ban kinh gan truong hoc`
  - `fix(fe): sua loi cuon tu dong trong danh sach tin nhan`
  - `chore(repo): cap nhat cau truc thu muc monorepo`

## 5. Chạy kiểm tra chất lượng (Verification)

Trước khi mở PR, luôn chạy các bước kiểm tra thông qua `make`:
- `make check`: Chạy lint-api, test-api, lint-web, build-web
- `make smoke`: Chạy kịch bản smoke test toàn diện API và luồng người dùng
- `make test-e2e`: Chạy kiểm thử Playwright giao diện
- `make help`: Xem danh sách tất cả các lệnh hỗ trợ

> [!NOTE]
> Khi clone dự án mới, lệnh `make test-api` và `make check` sẽ tự động kiểm tra và khởi tạo cơ sở dữ liệu `rental_test` trên container `db` nếu chưa tồn tại (hoàn toàn tự động, không cần tạo thủ công).
