# TROSV - Deploy runbook (Debian)

> Máy chủ bất kỳ: cloud nào cũng được, máy sàn cá nhân, máy phòng lab -
> miễn là **Debian 12 (bookworm) hoặc 13 (trixie)** + Docker hoặc Podman
> + quyền sudo. File này là runbook duy nhất cho việc deploy; backup/restore
> xem `infra/backup/RESTORE.md`, rollback code xem `docs/runbooks/ROLLBACK.md`.

Một file `docker-compose.yml` duy nhất phục dev, demo và production:

| Chế độ | Lệnh | Cổng browser dùng |
|---|---|---|
| Demo HTTP | `docker compose up -d --build` | `http://<host>:5174`, API `:8000`, WS `:8080` |
| **Production TLS (khuyên dùng)** | `docker compose --profile tls up -d --build` | Chỉ `https://$DOMAIN` (80 → 301 HTTPS, WS là `wss://$DOMAIN/app/*`) |

TLS mode: Caddy tự cấp + tự gia hạn chứng chỉ Let's Encrypt. Cần đúng một
tên miền (DNS A record trỏ về máy chủ) - IP trần không lấy được chứng chỉ
tin cậy. Chưa có miền? DuckDNS miễn phí (`yourname.duckdns.org`).

> Đây là setup demo/production-lite: dữ liệu seed, mật khẩu demo công
> khai. Trước khi đưa dữ liệu thật vào: đổi mật khẩu tất cả tài khoản,
> đặt `DB_PASSWORD`, và bật backup hằng ngày (mục 6).

## 0. Yêu cầu (Debian)

- Debian 12/13, 2 GB RAM là đủ (stack: PostgreSQL + PHP + nginx + Caddy +
  Reverb + queue).
- Docker Engine + plugin compose (cách nhanh nhất, nếu chưa có):

  ```bash
  curl -fsSL https://get.docker.com | sh
  sudo usermod -aG docker "$USER"   # đăng nhập lại để dùng docker không sudo
  ```

  Podman rootless cũng chạy được: thay `docker` bằng `podman compose`;
  podman cần file override đặt `NGINX_DNS_RESOLVER` = IP gateway của mạng
  (vd `10.89.0.1`) - xem `docker-compose.local-test.yml` làm mẫu.
- Git, curl: `sudo apt install -y git curl`
- Firewall (nếu dùng ufw; bỏ qua nếu nhà cung cấp quản lý firewall riêng):

  ```bash
  sudo apt install -y ufw
  sudo ufw allow 22/tcp    # SSH - allow TRƯỚC khi enable
  sudo ufw allow 80,443/tcp
  sudo ufw enable
  ```

  Demo HTTP mode (không TLS): mở 5174, 8000, 8080 thay cho 80/443 - nhưng
  khuyên dùng TLS mode, không mở cổng nào khác.

## 1. Lấy code + cấu hình

```bash
sudo mkdir -p /srv/trosv && sudo chown "$USER" /srv/trosv
git clone <repo-url> /srv/trosv && cd /srv/trosv
git checkout stable
cp .env.example .env
```

Điền `.env` cho TLS mode (thay `trosv.example.com` bằng miền của bạn):

```dotenv
APP_KEY=base64:...            # lệnh sinh ở dưới đây
DOMAIN=trosv.example.com
FRONTEND_URL=https://trosv.example.com
WS_HOST=trosv.example.com
APP_ENV=production
APP_DEBUG=false
DB_PASSWORD=<mật-khau-db-manh>
REVERB_APP_ID=...             # chuỗi bất kỳ, dùng key thật không dùng my-app-key
REVERB_APP_KEY=...
REVERB_APP_SECRET=...
SEED_ON_BOOT=1                # CHỈ cho demo; production dữ liệu thật: 0
```

Sinh `APP_KEY` (không cần PHP trên máy chủ):

```bash
echo "APP_KEY=$(docker run --rm php:8.3-cli php -r 'echo "base64:".base64_encode(random_bytes(32));')" >> .env
chmod 600 .env
```

DNS: tạo record A `$DOMAIN -> IP máy chủ` TRƯỚC khi chạy lần đầu (Caddy
cần cổng 80 từ internet để thực hiện HTTP-01 challenge).

## 2. Build + chạy (lần đầu)

```bash
docker compose --profile tls up -d --build
docker compose logs -f backend   # đợi thấy migrate/seed xong, Ctrl+C
docker compose ps                # cả 6 service phải healthy/running
```

Caddy bắt đầu phát hành chứng chỉ ngay lúc này - xem tiến độ:

```bash
docker compose logs -f caddy     # thành công: "certificate obtained successfully"
```

## 3. Kiểm tra

```bash
DOMAIN="$(grep -E '^DOMAIN=' .env | cut -d= -f2- | tr -d '"')"
curl -sf "https://$DOMAIN/api/health" && echo " API OK"
curl -s -o /dev/null -w 'frontend: %{http_code}\n' "https://$DOMAIN/"
curl -s  "https://$DOMAIN/api/cities" | head -c 120; echo
```

Bằng browser: mở `https://$DOMAIN`, đăng nhập `student1@example.com` /
`password` (khi `SEED_ON_BOOT=1`). Thử chat realtime: mở thêm 1 cửa sổ
ẩn danh, đăng nhập bằng chủ nhà, nhắn tin từ trang phòng - badge chưa đọc
tăng ngay = WebSocket (`wss://$DOMAIN/app/*`) chạy đúng.

## 4. Deploy-on-green (GitHub Actions tự động)

Workflow `.github/workflows/deploy.yml` chạy khi CI xanh trên tip `stable`:
SSH vào máy chủ, `git reset --hard <sha>`, `docker compose --profile tls
up -d --build`, rồi smoke `api/health` + frontend + cities qua Caddy.
Cấu hình một lần trong GitHub: Settings → Environments → `production` →
secrets:

| Secret | Giá trị |
|---|---|
| `DEPLOY_HOST` | IP hoặc hostname máy chủ |
| `DEPLOY_USER` | user SSH (thuộc group `docker`) |
| `DEPLOY_SSH_KEY` | private key PEM (public key đưa vào `~/.ssh/authorized_keys`) |
| `DEPLOY_PATH` | `/srv/trosv` |
| `DEPLOY_PORT` | tùy chọn, mặc định 22 |

Từ lúc đó: merge PR sang `stable` = deploy tự động. Chưa có secrets thì
workflow tự bỏ qua (không báo đỏ).

## 5. Cheatsheet

```bash
docker compose ps                        # trạng thái
docker compose logs -f backend reverb    # log trực tiếp
docker compose --profile tls up -d --build   # sau khi sửa code/.env
docker compose --profile tls restart caddy   # đổi DOMAIN (Caddyfile mount, không bake)
docker compose exec backend php artisan migrate:fresh --seed --force  # CHỈ demo
docker compose down                      # dừng, GIỮ dữ liệu
docker compose down -v                   # XÓA pgdata + uploads - cẩn trọng
```

## 6. Backup hằng ngày (bắt buộc trước khi có dữ liệu thật)

Script sẵn sàng: `infra/backup/backup.sh` (dump DB + tar uploads + bản sao
`.env`, giữ 7 ngày + 4 chủ nhật). Cron trên máy chủ:

```bash
sudo crontab -e -u "$USER"
# 02:30 hằng ngày:
30 2 * * * cd /srv/trosv && ./infra/backup/backup.sh >> ./backups/backup.log 2>&1
```

Restore drill + quy trình: `infra/backup/RESTORE.md`. Rollback code:
`docs/runbooks/ROLLBACK.md`. Kiểm tra lại backup định kỳ: `./infra/backup/backup.sh --verify`.

## 7. Gotchas

- **Mọi request trả 500 "Lỗi máy chủ."** - backend từ chối phục vụ vì cấu
  hình không an toàn (`APP_DEBUG=true` hoặc thiếu `APP_KEY`). Log chứa
  dòng `Refusing to serve: ...` - sửa `.env` rồi `up -d --build backend`.
- **Caddy không lấy được chứng chỉ** - DNS A record chưa trỏ về máy chủ,
  hoặc cổng 80 bị chặn từ internet. Xem `docker compose logs caddy`.
- **Chat không realtime** - kiểm tra caddy container đang chạy và browser
  nối `wss://$DOMAIN/app/*` (TLS mode). HTTP mode: cổng 8080 phải mở.
- **CORS error** - `FRONTEND_URL` phải khớp chính xác origin browser
  (scheme + host, không có slash cuối), rồi rebuild backend + frontend.
- **Sửa `.env` không có tác dụng** - frontend bake `VITE_*` lúc build:
  phải `up -d --build` (restart không đủ).
- **Ảnh biến mất sau `down`** - uploads nằm trong volume `trosv-storage`;
  `down -v` xóa nó. Chỉ `down` là giữ.
