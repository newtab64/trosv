# Restore - TROSV production

Quy trình restore cho stack `docker compose --profile tls`. Đọc hết file
này TRƯỚC khi làm. Điểm không-đường-lùi duy nhất là bước 2 (xóa volume
`pgdata`) - hãy chắc chắn bản backup muốn restore đã nằm trong thư mục
backup (mặc định `./backups` trong repo, có thể ở đĩa khác nếu đặt
`BACKUP_DIR`) trước khi bắt đầu.

Chạy trên máy chủ Debian, trong thư mục repo (ví dụ `/srv/trosv`).

## 0. Chọn bản backup

```bash
ls -1t backups/db-*.sql.gz | head -5
TS=20260927-023000   # ts của bản muốn restore
ls -lh backups/{db-$TS.sql.gz,uploads-$TS.tar.gz,env-$TS.bak}
```

Mọi lệnh dưới đây dùng hai biến chung (runtime: Docker hoặc Podman -
podman rootless chạy được nhờ các bước stream, không dùng bind mount host):

```bash
# Docker rootful:
DC="docker compose --profile tls"; DOCKER="docker"
# Podman rootless:
DC="podman compose --profile tls"; DOCKER="podman"
```

Tên volume có tiền tố tên project (tên thư mục repo), nên resolve động
thay vì đoán:

```bash
VOL_PG="$($DOCKER volume ls -q | grep -E 'pgdata$' | head -1)"
VOL_STORAGE="$($DOCKER volume ls -q | grep -E 'trosv-storage$' | head -1)"
echo "$VOL_PG / $VOL_STORAGE"   # phải in ra đúng 2 tên, không được trống
```

## 1. Dừng toàn bộ stack

```bash
$DC stop caddy backend reverb queue scheduler db
```

## 2. Xóa + tạo lại volume Postgres (KHÔNG ĐƯỜNG LÙI)

`$DC down` bỏ container nhưng GIỮ nguyên volume; ta xóa volume rỗng rồi
tạo lại:

```bash
$DC down
$DOCKER volume rm "$VOL_PG"
$DOCKER volume create "$VOL_PG"
```

## 3. Khởi động db rỗng + đợi healthy

POSTGRES_* env sẽ tạo lại user/db `rental` trên volume mới:

```bash
$DC up -d db
$DC exec db sh -c 'until pg_isready -U rental -d rental >/dev/null 2>&1; do sleep 1; done'
```

## 4. Nạp dump (plain SQL, gzip)

```bash
gunzip -c "backups/db-$TS.sql.gz" | $DC exec -T db psql -U rental -d rental -q
```

Lỗi thường gặp:
- `role "rental" does not exist` = bước 3 chưa xong (volume chưa được khởi
  tạo bởi POSTGRES_* env) - đợi `pg_isready` xong rồi nạp lại.
- `relation ... already exists` = volume KHÔNG rỗng - quay lại bước 2 xóa
  volume đúng, không nạp dump vào DB đã có dữ liệu.

Kiểm tra nhanh số bảng được nạp:

```bash
$DC exec db psql -U rental -d rental -c "\dt" | head -15
$DC exec db psql -U rental -d rental -tAc \
  "SELECT 'users='||(SELECT count(*) FROM users)||' listings='||(SELECT count(*) FROM listings);"
```

## 5. Khôi phục uploads (ảnh tin đăng)

Volume `trosv-storage` bị backend mount vào; dừng backend trước khi thay
thế dữ liệu. Stream tar qua stdin (không bind mount thư mục host ra
container - cách này chạy được cả Docker rootful lẫn Podman rootless):

```bash
$DC stop backend
cat "backups/uploads-$TS.tar.gz" | $DOCKER run --rm -i -v "$VOL_STORAGE":/data alpine:3.20 \
    sh -c "rm -rf /data/* && tar xz -C /data"
$DC start backend
```

Đối lại sau khi nạp:

```bash
$DOCKER run --rm -v "$VOL_STORAGE":/data:ro alpine:3.20 \
    sh -c "ls /data/public/listings | wc -l"   # phải = số ảnh trong bản backup
```

## 6. Khôi phục `.env` (nếu mất / đổi máy chủ)

`.env` chứa APP_KEY - nếu không khôi phục đúng bản cũ, cookie/session +
token Reverb bị đổi, mọi người phải đăng nhập lại:

```bash
cp "backups/env-$TS.bak" .env
```

## 7. Khởi động lại toàn bộ + kiểm tra

```bash
$DC up -d
sleep 20
DOMAIN="$(grep -E '^DOMAIN=' .env | cut -d= -f2- | tr -d '"')"
curl -sf "https://$DOMAIN/api/health" && echo " API OK"
curl -s -o /dev/null -w 'frontend: %{http_code}\n' "https://$DOMAIN/"
curl -s -o /dev/null -w 'cities:   %{http_code}\n' "https://$DOMAIN/api/cities"
```

Cuối cùng smoke thủ công: đăng nhập 1 tài khoản thật từ DB đã restore trên
UI.

## Sau restore

- Kiểm tra `docker compose logs -f --tail 50 backend queue reverb` trong
  vài phút đầu.
- Nếu cron backup đã tồn tại (chạy `infra/backup/backup.sh`), nó sẽ tự chạy bước tới - không cần làm gì thêm.
