# Rollback - TROSV production

Khi 1 deployment trên `stable` bị lỗi và cần quay lại bản trước. Đáp ứng
khớp với `.github/workflows/deploy.yml` (deploy = `git reset --hard <sha>` +
`docker compose --profile tls up -d --build`) và `infra/backup/RESTORE.md` (khi
phải quay lại dữ liệu).

## 0. Tìm SHA tốt cuối cùng

Mỗi deploy run gắn với một SHA cụ thể - xem: GitHub → tab Actions →
workflow "Deploy" → run gần nhất còn tốt → commit được deploy
(`head_sha`). Hoặc trên máy chủ:

```bash
cd /srv/trosv
git fetch origin stable --tags
git log --oneline -5 origin/stable   # sha cần quay về nằm ngay trên commit lỗi
GOOD=<sha-tot>   # thay bằng sha thật
```

## 1. Rollback code (1 lần)

```bash
DC="docker compose --profile tls"
cd /srv/trosv
git fetch origin stable --tags
git reset --hard $GOOD
$DC up -d --build
```

Smoke nhanh (giống post-deploy smoke của deploy.yml):

```bash
DOMAIN="$(grep -E '^DOMAIN=' .env | cut -d= -f2- | tr -d '"')"
R="--resolve $DOMAIN:443:127.0.0.1"
curl -sf $R "https://$DOMAIN/api/health"
curl -s -o /dev/null -w 'frontend: %{http_code}\n' $R "https://$DOMAIN/"
curl -s -o /dev/null -w 'cities:   %{http_code}\n' $R "https://$DOMAIN/api/cities"
```

## 2. Quan trọng: migration chỉ đi xuôi

`php artisan migrate --force` trong backend container không tự roll back.
Nếu commit lỗi CHẠY migration làm hỏng dữ liệu/schema thì rollback code
không đủ - phải restore DB từ backup: xem `infra/backup/RESTORE.md` (bước 2 là
không-đường-lùi).

Nếu commit lỗi chứa migration: tự sao lưu DB hiện tại TRƯỚC khi reset:

```bash
bash infra/backup/backup.sh
```

## 3. Sau khi đã rollback

- Đoán đúng: commit fix trên nhánh feature → merge `unstable` → PR sang
  `stable` như thường. KHÔNG force-push để "ghi đè" lịch sử `stable`
  (branch protection đã chặn force-push).
- Nếu nghiên cứu nguyên nhân: kéo log máy chủ về máy
  `docker compose logs --since 1h backend > /tmp/trosv-rollback.log`.
