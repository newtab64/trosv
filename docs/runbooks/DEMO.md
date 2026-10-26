# TROSV - Hướng dẫn chạy Demo

> **Lưu ý**: Hướng dẫn này **CHỈ DÙNG ĐỂ DEMO**, không áp dụng cho production.

## 0. Yêu cầu hệ thống

- Một máy tính hoặc máy chủ Debian (hoặc Linux tương thích) có sẵn Docker Engine + Compose plugin hoặc Podman.
- Không cần cài PHP hoặc Node.js trực tiếp trên máy host; toàn bộ dịch vụ chạy trong container.

---

## 1. Các bước khởi chạy

### Bước 1: Lấy mã nguồn
```bash
git clone https://github.com/52400067/trosv.git
cd trosv
```

### Bước 2: Thiết lập cấu hình `.env`
Sao chép file cấu hình mẫu (mặc định phù hợp cho localhost, không cần chỉnh sửa):
```bash
cp .env.example .env
```

Tạo `APP_KEY` và bật chế độ tự động seed dữ liệu demo:
```bash
echo "APP_KEY=$(docker run --rm php:8.3-cli php -r 'echo "base64:".base64_encode(random_bytes(32));')" >> .env
echo "SEED_ON_BOOT=1" >> .env
```

### Bước 3: Khởi chạy toàn bộ hệ thống
```bash
docker compose up -d --build
```
*(Nếu dùng Podman, chạy lệnh tương đương: `podman compose up -d --build`)*

### Bước 4: Kiểm tra và truy cập
Đợi khoảng 30–60 giây cho các container đạt trạng thái healthy, sau đó truy cập:

- **Web UI**: [http://localhost:5174](http://localhost:5174)
- **API**: [http://localhost:5174/api](http://localhost:5174/api) *(same-origin định tuyến qua Nginx)*

> Các thiết bị khác trong cùng mạng LAN có thể truy cập qua: `http://<IP-may-host>:5174`

---

## 2. Tài khoản Demo

Mật khẩu mặc định cho tất cả tài khoản: `password`

- **Sinh viên**: `student1@example.com`
- **Chủ nhà**: `landlord1@example.com`

---

## 3. Dừng hệ thống

- Dừng container và giữ lại dữ liệu:
  ```bash
  docker compose down
  ```
- Dừng container và xóa sạch dữ liệu (volumes):
  ```bash
  docker compose down -v
  ```

---

## 4. Lưu ý quan trọng

- Đây là cấu hình demo trên máy cá nhân: sử dụng HTTP không mã hóa, mật khẩu DB mặc định và dữ liệu hạt nhân được nạp sẵn.
- Để làm mới và nạp lại dữ liệu sạch:
  ```bash
  docker compose exec backend php artisan migrate:fresh --seed --force
  ```
- Hướng dẫn triển khai thực tế trên server (TLS, Caddy, backup/restore, rollback):
  - [docs/runbooks/DEPLOY.md](DEPLOY.md)
  - [infra/backup/RESTORE.md](../../infra/backup/RESTORE.md)
  - [docs/runbooks/ROLLBACK.md](ROLLBACK.md)
  - [README.md](../../README.md)
