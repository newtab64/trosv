#!/usr/bin/env bash
# ============================================================
# TROSV - backup du lieu tren may chu Debian (chay trong thu muc repo)
#
#   ./infra/backup/backup.sh              # backup ngay
#   ./infra/backup/backup.sh --verify     # backup + kiem tra doc lai dump
#
# Backup 3 thu:
#   1. DB       : pg_dump TU CONTAINER db (khong can psql tren host)
#   2. Uploads  : volume trosv-storage (anh tin dang) - ten volume duoc
#                 resolve dong (tien to la ten project compose)
#   3. .env     : APP_KEY + Reverb keys - mat file nay la mat toan phien
#
# Giu: 7 ban gan nhat + 4 ban chu nhat (tu xoa ban cu).
# Cron khuyen nghi (02:30 hang ngay) - xem docs/runbooks/DEPLOY.md muc 6.
# Restore: xem infra/backup/RESTORE.md. Rollback code: docs/runbooks/ROLLBACK.md.
# ============================================================
set -euo pipefail

# Mot file compose duy nhat; TLS profile de khop dung stack dang chay.
# Docker hoac Podman - tu dong chon runtime co san (may chu bat ky).
if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
    DOCKER="docker"
elif command -v podman >/dev/null 2>&1; then
    DOCKER="podman"
else
    echo "LOI: khong tim thay docker hoac podman." >&2
    exit 1
fi
DC="$DOCKER compose --profile tls"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

# Mac dinh: ./backups trong repo (da gitignore). Co the ghi de:
#   BACKUP_DIR=/mnt/backup-drive/trosv ./infra/backup/backup.sh
BACKUP_DIR="${BACKUP_DIR:-$ROOT/backups}"
TS="$(date +%Y%m%d-%H%M%S)"
KEEP_DAILY=7
KEEP_WEEKLY=4

mkdir -p "$BACKUP_DIR"

# Ten volume co tien to ten project (ten thu muc repo) - resolve, dung doan.
VOL_STORAGE="$($DOCKER volume ls -q | grep -E 'trosv-storage$' | head -1)"
[ -n "$VOL_STORAGE" ] || { echo "LOI: khong thay volume trosv-storage - stack chua chay lan nao?" >&2; exit 1; }

echo ">> [$(date '+%F %T')] backup bat dau (TS=$TS, dir=$BACKUP_DIR)"

# ------------------------------------------------------------
# 1. Database (pg_dump tu container db)
# ------------------------------------------------------------
$DC exec -T db pg_dump -U rental -d rental --no-owner \
  | gzip > "$BACKUP_DIR/db-$TS.sql.gz"

DB_SIZE="$(du -h "$BACKUP_DIR/db-$TS.sql.gz" | cut -f1)"
echo "   db dump: $BACKUP_DIR/db-$TS.sql.gz ($DB_SIZE)"

# Dump rong (< 1KB) gan nhu chac la loi - that bai som de cron bao do.
[ "$(stat -c%s "$BACKUP_DIR/db-$TS.sql.gz")" -ge 1024 ] \
  || { echo "   LOI: dump qua nho - postgres co the chua san sang." >&2; exit 1; }

# ------------------------------------------------------------
# 2. Uploads (volume trosv-storage) - stream tar qua stdout, khong bind
#    mount ra host: chay duoc ca rootless (podman) lan rootful (docker).
# ------------------------------------------------------------
$DOCKER run --rm -v "$VOL_STORAGE":/data:ro alpine:3.20 \
    tar cz -C /data . > "$BACKUP_DIR/uploads-$TS.tar.gz"

echo "   uploads: $BACKUP_DIR/uploads-$TS.tar.gz ($(du -h "$BACKUP_DIR/uploads-$TS.tar.gz" | cut -f1))"

# ------------------------------------------------------------
# 3. .env (chmod 600 - co APP_KEY, bi mat thi moi nguoi phai dang nhap lai)
# ------------------------------------------------------------
if [ -f .env ]; then
    cp .env "$BACKUP_DIR/env-$TS.bak"
    chmod 600 "$BACKUP_DIR/env-$TS.bak"
    echo "   .env da sao chep (chmod 600)"
fi

# ------------------------------------------------------------
# 4. Xoa ban cu: giu KEEP_DAILY ban gan nhat + KEEP_WEEKLY ban chu nhat
# ------------------------------------------------------------
ls -1t "$BACKUP_DIR"/db-*.sql.gz 2>/dev/null | tail -n +$((KEEP_DAILY + 1)) | while read -r f; do
    ts="$(basename "$f")"; ts="${ts#db-}"; ts="${ts%.sql.gz}"
    dow="$(date -d "${ts:0:8}" +%u 2>/dev/null || echo 0)"
    if [ "$dow" != "7" ]; then rm -f "$f" "$BACKUP_DIR/uploads-$ts.tar.gz" "$BACKUP_DIR/env-$ts.bak"; fi
done
ls -1t "$BACKUP_DIR"/db-*.sql.gz 2>/dev/null | tail -n +$((KEEP_WEEKLY + 1)) | while read -r f; do
    ts="$(basename "$f")"; ts="${ts#db-}"; ts="${ts%.sql.gz}"
    dow="$(date -d "${ts:0:8}" +%u 2>/dev/null || echo 1)"
    if [ "$dow" = "7" ]; then rm -f "$f" "$BACKUP_DIR/uploads-$ts.tar.gz" "$BACKUP_DIR/env-$ts.bak"; fi
done

# ------------------------------------------------------------
# 5. Verify (--verify): dump la plain-SQL gzip - dem lenh CREATE TABLE
# ------------------------------------------------------------
if [ "${1:-}" = "--verify" ]; then
    echo ">> verify: kiem tra dump vua tao"
    gunzip -t "$BACKUP_DIR/db-$TS.sql.gz" \
      || { echo "   LOI verify: gzip hong." >&2; exit 1; }
    TABLES="$(gunzip -c "$BACKUP_DIR/db-$TS.sql.gz" | grep -c 'CREATE TABLE' || true)"
    echo "   dump chua $TABLES lenh CREATE TABLE"
    [ "$TABLES" -gt 0 ] || { echo "   LOI verify: khong thay CREATE TABLE nao." >&2; exit 1; }
    echo "   OK: dump doc duoc va co du lieu."
fi

echo ">> [$(date '+%F %T')] backup hoan tat: $BACKUP_DIR"
