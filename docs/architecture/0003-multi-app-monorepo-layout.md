# 3. Tái Cấu Trúc Monorepo Đa Ứng Dụng (Multi-App Monorepo Layout)

- **Trạng thái**: Accepted
- **Ngày**: 2026-10-14
- **Người quyết định**: Đội ngũ phát triển TROSV

## Bối cảnh (Context)

Ban đầu, repository TROSV chứa mã nguồn của 3 ứng dụng (`backend`, `frontend`, `ai-service`) và các tệp vận hành, bảo trì, tài liệu đặt lộn xộn ngay tại thư mục gốc:
1. Các thư mục ứng dụng đặt ngang hàng ở gốc (`backend/`, `frontend/`, `ai-service/`).
2. Các tệp vận hành và script hạ tầng nằm rải rác (`docker/`, `backup.sh`, `restore.sh`, `deploy.sh`, `rollback.sh`).
3. Tài liệu dự án và hợp đồng nằm ở thư mục gốc hoặc thiếu phân loại rõ ràng (`API_CONTRACT.md`, `AI_CONTRACT.md`, `ERD.md`, `BACKEND-AUDIT-REPORT.md`, `TECH-DEBT.md`, `DEMO.md`, `DEPLOY.md`).

Điều này làm cho người mới tiếp cận khó nắm bắt ranh giới giữa mã nguồn ứng dụng (application code), hạ tầng (infrastructure), và tài liệu (documentation), đồng thời gây khó khăn cho việc thiết lập phạm vi quét của CI, Dependabot, và công cụ phân tích nợ kỹ thuật.

## Quyết định (Decision)

Chúng tôi quyết định tái cấu trúc toàn bộ repository theo bố cục monorepo quy ước (conventional multi-app monorepo layout):

```
trosv/
  .github/        (workflows/, ISSUE_TEMPLATE/, PULL_REQUEST_TEMPLATE.md, CODEOWNERS, dependabot.yml)
  apps/
    api/          <- backend/ (Laravel API)
    web/          <- frontend/ (React SPA)
    ai-service/   <- ai-service/ (FastAPI)
  infra/
    docker/       (Caddyfile, compose helpers)
    deploy/       (deploy.sh, server scripts)
    backup/       (backup.sh, RESTORE.md, ROLLBACK.md)
  scripts/        (dev helpers, cong cu no ky thuat, smoke tests)
  docs/
    contracts/    (API_CONTRACT.md, AI_CONTRACT.md, ERD.md)
    architecture/ (ADRs: 0001, 0002, 0003, ...)
    reports/      (BACKEND-AUDIT-REPORT.md, TECH-DEBT.md, PLAN.md)
    runbooks/     (DEPLOY.md, DEMO.md)
    ONBOARDING.md
  .env.example, docker-compose.yml, Makefile, README.md, CONTRIBUTING.md, SECURITY.md, LICENSE
```

### Tại sao CHƯA có `packages/` và khi nào cần bổ sung?
- **Hiện tại chưa có `packages/`**: Các ứng dụng trong repo sử dụng công nghệ hoàn toàn khác nhau (PHP 8.3 / Laravel cho API, TypeScript / React cho Web, Python 3.12 / FastAPI cho AI service). Hiện tại không có mã nguồn dùng chung (shared library) được chia sẻ trực tiếp giữa các runtime này. Việc tạo thư mục `packages/` trong khi không có code chia sẻ sẽ chỉ tạo boilerplate thừa.
- **Khi nào cần bổ sung `packages/`**: Bổ sung khi xuất hiện thư viện chung thực sự, ví dụ:
  1. Monorepo mở rộng thêm ứng dụng di động (React Native) và dùng chung UI components hoặc API client types với `apps/web`.
  2. Sử dụng code generator từ OpenAPI schema để sinh TypeScript client SDK hoặc Python SDK dùng chung giữa các dịch vụ.

## Hậu quả (Consequences)

1. **Thay đổi toàn bộ đường dẫn hệ thống (All paths updated)**:
   - Toàn bộ tham chiếu đường dẫn trong `docker-compose.yml`, `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`, `.github/dependabot.yml`, `infra/deploy/deploy.sh`, `infra/backup/backup.sh`, `scripts/filter-debt-app-only.py`, và toàn bộ tài liệu Markdown đã được cập nhật đồng bộ.
2. **Ghim tên dự án compose (`name: trosv`)**:
   - `docker-compose.yml` được ghim rõ `name: trosv` để bảo đảm tên các container và volume không bị thay đổi khi thư mục gốc hoặc môi trường deploy thay đổi, tái sử dụng 100% volume dữ liệu hiện có (`trosv_pgdata`, `trosv_trosv-storage`) mà không gây thất thoát dữ liệu.
3. **Cơ chế Rollback qua nhánh `legacy/pre-restructure`**:
   - Nhánh `legacy/pre-restructure` (và tag kèm theo) đã được lưu trữ và đẩy lên origin trước khi thực hiện bất kỳ thay đổi nào. Nếu cần hủy bỏ đợt refactor, toàn bộ hệ thống có thể được checkout về nhánh legacy mà không làm gián đoạn sản phẩm.
4. **Không thay đổi hành vi hệ thống (Zero behavior change)**:
   - Giữ nguyên 100% API endpoints, route definitions, UI frontend, DB schema, dữ liệu seed, và pipeline CI/CD.
