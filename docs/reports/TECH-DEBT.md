# Sổ theo dõi nợ kỹ thuật (Tech Debt Register)

> **Baseline thiết lập mới: 2026-10-12**  
> Toàn bộ dữ liệu lịch sử của các giai đoạn trước đã được lưu trữ/làm mới. Tài liệu này ghi nhận hiện trạng nợ kỹ thuật thực tế của codebase TROSV bắt đầu từ mốc chuẩn hóa hoàn tất (100% TypeScript, Tailwind v4 + Radix UI, dọn sạch dead boilerplate và passing toàn bộ test suite).

---

## 1. Tổng quan hiện trạng (Baseline 2026-10-12)

Quét tự động bằng bộ công cụ `tech-debt-tracker` kết hợp bộ lọc phạm vi ứng dụng chuẩn (`scripts/filter-debt-app-only.py` giữ `apps/api/`, `apps/web/`, `apps/ai-service/`, loại bỏ build cache và test noise):

| Chỉ số | Giá trị | Đánh giá |
|---|---|---|
| **Tổng số tệp quét (App-only)** | **208** tệp | Phạm vi ứng dụng thực tế |
| **Tổng số dòng mã nguồn (App-only)** | **19,998** dòng | Sau khi tinh gọn dead boilerplate |
| **Tổng số debt item ghi nhận** | **1,699** item | Đều ở mức Medium và Low; **0 Critical, 0 High** |
| **Mật độ nợ kỹ thuật (Debt Density)** | **8.50%** (8.17 items/file) | Mức an toàn và ổn định |
| **Tệp vượt kích thước (`large_file` > 500 dòng)** | **0** tệp | Triệt tiêu hoàn toàn |
| **Hàm thiếu docstring (`missing_docstring`)** | **0** item | Tuân thủ tài liệu API |
| **Health Score tổng thể** | **60.0 / 100** (Fair) | Không có rủi ro kỹ thuật chặn release |

### Phân rã theo phân loại nợ:
- **`duplicate_code`**: **1,490** item (~87.7%) — Đa số là các khối import cấu trúc tương đồng, mẫu khai báo request/response và các khối tọa độ vector SVG trong các component giao diện.
- **`long_line`** (> 120 ký tự): **143** item (~8.4%) — Tập trung chủ yếu ở dữ liệu hạt nhân `SchoolSeeder.php` (tên trường và địa chỉ hành chính chi tiết).
- **`hardcoded_paths`**: **65** item (~3.8%) — Các đường dẫn thư mục cố định của framework (`storage/app/public/listings`, file `artisan`).
- **`todo_comment`**: **1** item (~0.1%) — Cấu hình build an toàn `drop_debugger: true` trong `vite.config.ts`.

---

## 2. Quy trình tái tạo dữ liệu (Pipeline)

> **Lưu ý**: Bộ công cụ `tech-debt-tracker` (trong thư mục `.agents/skills/tech-debt-tracker/`) là công cụ hỗ trợ của agent AI được gitignore, không nằm trong git history của repository. Khi quét thủ công trên máy dev, người dùng cần có sẵn skill `tech-debt-tracker` hoặc chạy script tương ứng từ môi trường agent.

Quy trình chuẩn hóa 4 bước để tái tạo và cập nhật sổ nợ kỹ thuật:

```bash
# Bước 1: Quét toàn bộ codebase với cấu hình chuẩn hóa (loại trừ cache/vendor/node_modules)
python3 .agents/skills/tech-debt-tracker/scripts/debt_scanner.py . \
  --config scripts/debt-scanner-config.json --format json \
  --output ~/tech-debt-tracker/trosv/debt_$(date +%F).json

# Bước 2: Lọc phạm vi app-only (loại trừ tests, bootstrap cache và regex noise)
python3 scripts/filter-debt-app-only.py \
  ~/tech-debt-tracker/trosv/debt_$(date +%F).json \
  --output ~/tech-debt-tracker/trosv/debt_$(date +%F).app-only.json

# Bước 3: Phân tích và chấm điểm ưu tiên theo framework WSJF
python3 .agents/skills/tech-debt-tracker/scripts/debt_prioritizer.py \
  ~/tech-debt-tracker/trosv/debt_$(date +%F).app-only.json \
  --framework wsjf --team-size 6 --sprint-capacity 20 \
  --format json --output ~/tech-debt-tracker/trosv/debt_priorities_$(date +%F).json

# Bước 4: Tạo báo cáo Dashboard theo dõi xu hướng
python3 .agents/skills/tech-debt-tracker/scripts/debt_dashboard.py \
  ~/tech-debt-tracker/trosv/debt_$(date +%F).app-only.json \
  --period monthly --format both \
  --output ~/tech-debt-tracker/trosv/debt_dashboard
```

---

## 3. Phân loại mã nguồn và các ngoại lệ không tính là nợ

Các tín hiệu sau được quét bởi công cụ nhưng được xác nhận là hành vi có chủ ý của hệ thống:

1. **Khung cấu trúc framework & cấu hình**:
   - `vite.config.ts`: Cấu hình terser `drop_debugger: true` (bị regex quét trúng do chứa chuỗi con `bug`).
   - `apps/api/artisan` & `config/database.php`: Các hằng số đường dẫn và cấu hình kết nối chuẩn của Laravel.
2. **Bộ dữ liệu hạt giống (Seeders)**:
   - `SchoolSeeder.php`: Dữ liệu danh mục các trường đại học/cao đẳng tại TP.HCM. Việc giữ các dòng khai báo địa chỉ nguyên vẹn giúp dễ đối soát với danh mục Bộ GD&ĐT.
3. **Bộ minh họa giao diện vector (SVG Icons & Illustrations)**:
   - `apps/web/src/ui/illustrations.tsx`: Các thẻ hình học SVG có thuộc tính lặp lại (stroke, fill, path coordinates).

---

## 4. Kế hoạch bảo trì ưu tiên (Backlog theo WSJF)

Dựa trên kết quả từ `debt_prioritizer.py`, các hạng mục bảo trì định kỳ tiếp theo được xếp hạng như sau:

| STT | Hạng mục | Vị trí | Điểm WSJF | Đề xuất xử lý |
|---|---|---|---|---|
| 1 | Chuẩn hóa hằng số đường dẫn lưu trữ | `AttachmentController.php`, `LandlordListingController.php` | 6.5 | Tập trung các đường dẫn thư mục upload vào cấu hình `filesystems.disks` thay vì hardcode chuỗi |
| 2 | Tối ưu khai báo Base Request trong AI service | `apps/ai-service/main.py` | 5.8 | Tách các schema Pydantic chung ra module `schemas.py` khi mở rộng các endpoint AI mới |
| 3 | Tách nhỏ dữ liệu mảng Seeder trường học | `apps/api/database/seeders/SchoolSeeder.php` | 4.2 | Chuyển mảng trường học sang tệp JSON/CSV nạp ngoài để giảm các dòng dài > 120 ký tự |
| 4 | Rà soát các khối JSX lặp trong sub-card Profile | `ProfileHabitsCard.tsx` | 3.5 | Tạo generic habit item component cho các trường lựa chọn thói quen sinh hoạt |

---

## 5. Bảng theo dõi xu hướng (Bắt đầu từ Baseline 2026-10-12)

| Ngày ghi nhận | Items (App-only) | Mật độ nợ | Trạng thái / Cột mốc |
|---|---|---|---|
| **2026-10-12** | **1,699** | **8.50%** | **Baseline khởi điểm mới:** 100% TypeScript, Tailwind v4 + Radix UI, dọn sạch boilerplate thừa, 0 large file, 0 high priority debt, CI 4 job xanh hoàn toàn |
