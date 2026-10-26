#!/usr/bin/env bash
# ============================================================
# TROSV - fast demo deploy (Debian Linux)
#
# Hai che do:
#   bash infra/deploy/deploy.sh --docker  # KHUYEN DUNG: docker compose (1 file duy nhat)
#                                         # up -d --build + doi healthy + kiem tra API
#   bash infra/deploy/deploy.sh           # khong Docker: PHP + Node truc tiep tren may
#                                         # (PostgreSQL local, artisan serve :8000,
#                                         #  vite dev :5173, reverb :8080)
#   bash infra/deploy/deploy.sh --quick   # (che do local) bo qua install, GIU DB
#   bash infra/deploy/deploy.sh --dry-run # in cac duong dan da resolve va thoat
#   bash infra/deploy/deploy.sh --stop    # dung toan bo service
#
# Log/PID (che do local): /tmp/trosv-api.log /tmp/trosv-web.log
#                         /tmp/trosv-demo.pids
#
# Demo accounts (sau khi seed, SEED_ON_BOOT=1 trong .env khi docker):
#   student1@example.com  /  password   (sinh vien)
#   landlord1@example.com /  password   (chu nha)
#
# AI service (:8001, docker compose --profile ai) khong bat buoc -
# backend tu tra 503 fallback khi AI chet, e2e smoke van xanh.
# ============================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"
BACKEND="$ROOT/apps/api"
FRONTEND="$ROOT/apps/web"
API_LOG=/tmp/trosv-api.log
WEB_LOG=/tmp/trosv-web.log
PID_FILE=/tmp/trosv-demo.pids

c_green='\033[0;32m'; c_red='\033[0;31m'; c_yel='\033[0;33m'; c_off='\033[0m'
ok()   { echo -e "${c_green}[OK]${c_off} $1"; }
warn() { echo -e "${c_yel}[!!]${c_off} $1"; }
die()  { echo -e "${c_red}[XX]${c_off} $1"; exit 1; }

port_open() { (echo > "/dev/tcp/127.0.0.1/$1") 2>/dev/null; }

stop_all() {
    echo ">> Dung cac service demo..."
    if command -v docker >/dev/null 2>&1 && docker compose ps -q 2>/dev/null | grep -q .; then
        docker compose down
        ok "Docker stack da dung"
    fi
    if [[ -f "$PID_FILE" ]]; then
        while read -r pid; do kill "$pid" 2>/dev/null || true; done < "$PID_FILE"
        rm -f "$PID_FILE"
    fi
    pkill -f "php artisan serve" 2>/dev/null || true
    pkill -f "0.0.0.0:8000" 2>/dev/null || true
    pkill -f "node.*vite" 2>/dev/null || true
    sleep 1
    ok "Da dung (neu co process dang chay)"
    exit 0
}

run_docker() {
    command -v docker >/dev/null || die "Khong co docker - chay 'bash infra/deploy/deploy.sh' (che do local PHP + Node)"
    docker info >/dev/null 2>&1 || die "Docker daemon chua chay - mo Docker Desktop hoac systemctl start docker"
    [[ -f .env ]] || { cp .env.example .env; ok "Da tao .env tu .env.example"; }
    grep -q '^APP_KEY=base64' .env || {
        echo ">> tao APP_KEY..."
        echo "APP_KEY=$(docker run --rm php:8.3-cli php -r 'echo "base64:".base64_encode(random_bytes(32));')" >> .env
        ok "Da tao APP_KEY trong .env"
    }
    grep -q '^SEED_ON_BOOT=' .env || echo 'SEED_ON_BOOT=1' >> .env
    echo ">> docker compose up -d --build (lan dau mat vai phut)..."
    docker compose up -d --build || die "docker compose that bai"
    echo ">> doi healthy..."
    for i in $(seq 1 60); do
        [[ "$(docker inspect -f '{{.State.Health.Status}}' "$(docker compose ps -q backend)" 2>/dev/null)" == "healthy" ]] && break
        [[ "$i" = 60 ]] && { docker compose logs --tail 50 backend; die "backend chua healthy sau 60 lan kiem tra"; }
        sleep 2
    done
    curl -sf http://127.0.0.1:8000/api/cities >/dev/null || die "API khong tra loi - xem: docker compose logs backend"
    curl -sf http://127.0.0.1:5174/ >/dev/null || die "Web khong tra loi - xem: docker compose logs frontend"
    ok "API: http://localhost:8000/api - Web: http://localhost:5174"
    ok "Smoke: bash scripts/e2e-smoke.sh"
}

[[ "${1:-}" == "--stop" ]] && stop_all
[[ "${1:-}" == "--docker" ]] && run_docker && exit 0
if [[ "${1:-}" == "--dry-run" ]]; then
    echo "ROOT=$ROOT"
    echo "BACKEND=$BACKEND"
    echo "FRONTEND=$FRONTEND"
    exit 0
fi

echo "=============================================="
echo " TROSV demo deploy - $(date '+%H:%M:%S')"
echo "=============================================="

# ------------------------------------------------------------
# 1. Kiem tra dependencies (Debian/Ubuntu)
# ------------------------------------------------------------
MISSING=()
command -v php      >/dev/null || MISSING+=("php")
command -v composer >/dev/null || MISSING+=("composer")
command -v node     >/dev/null || MISSING+=("nodejs")
command -v npm      >/dev/null || MISSING+=("npm")
command -v psql     >/dev/null || MISSING+=("postgresql")

if [[ ${#MISSING[@]} -gt 0 ]]; then
    warn "Thieu: ${MISSING[*]}"
    echo "   Cai tren Debian/Ubuntu:"
    echo "     sudo apt-get install -y php-cli php-pgsql php-mbstring php-xml php-zip php-gd curl composer nodejs npm postgresql"
    echo "   Khoi tao PostgreSQL lan dau:"
    echo "     sudo systemctl start postgresql"
    echo "     sudo -u postgres psql -c \"CREATE USER rental WITH PASSWORD 'rental';\""
    echo "     sudo -u postgres psql -c \"CREATE DATABASE rental OWNER rental;\""
    exit 1
fi
ok "Dependencies day du (php $(php -r 'echo PHP_VERSION;') / node $(node -v))"

# ------------------------------------------------------------
# 2. PostgreSQL
# ------------------------------------------------------------
if port_open 5432; then
    ok "PostgreSQL dang chay tren :5432"
else
    warn "PostgreSQL chua chay - thu start qua systemctl..."
    sudo -n systemctl start postgresql 2>/dev/null && sleep 2 || true
    port_open 5432 || {
        warn "Khong tu start duoc (can mat khau sudo). Chay tay:"
        echo "     sudo systemctl start postgresql"
        echo "   Va tao DB lan dau:"
        echo "     sudo -u postgres psql -c \"CREATE USER rental WITH PASSWORD 'rental';\""
        echo "     sudo -u postgres psql -c \"CREATE DATABASE rental OWNER rental;\""
        exit 1
    }
    ok "PostgreSQL da duoc start"
fi

# ------------------------------------------------------------
# 3. Backend .env + APP_KEY + dependencies
# ------------------------------------------------------------
cd "$BACKEND"
if [[ ! -f .env ]]; then
    cp .env.example .env
    ok "Da tao apps/api/.env tu .env.example"
fi

if ! grep -q "^APP_KEY=base64" .env; then
    php artisan key:generate --force >/dev/null
    ok "Da tao APP_KEY"
fi

if [[ "${1:-}" != "--quick" ]]; then
    echo ">> composer install..."
    composer install --no-interaction --prefer-dist --quiet \
        || die "composer install that bai - xem log o tren"
    ok "Composer dependencies"
else
    [[ -d vendor ]] || die "--quick nhung chua co vendor/ - chay 'bash infra/deploy/deploy.sh' (khong --quick) lan dau"
fi

# ------------------------------------------------------------
# 4. Database moi + seed (bo qua khi --quick)
# ------------------------------------------------------------
if [[ "${1:-}" != "--quick" ]]; then
    echo ">> migrate:fresh --seed (xoa va tao lai du lieu demo)..."
    php artisan migrate:fresh --seed --force >/dev/null \
        || die "migrate/seed that bai - kiem tra DB rental/rental trong apps/api/.env"
    ok "Database: 34 tinh/TP, wards, schools, users, listings"
else
    ok "Giu DB hien tai (--quick)"
fi

[[ -L public/storage ]] || { php artisan storage:link >/dev/null; ok "Da tao storage:link"; }

# ------------------------------------------------------------
# 5. Frontend dependencies + .env
# ------------------------------------------------------------
cd "$FRONTEND"
if [[ "${1:-}" != "--quick" || ! -d node_modules ]]; then
    echo ">> npm install..."
    npm install --silent || die "npm install that bai"
    ok "NPM dependencies"
fi
[[ -f .env ]] || { echo 'VITE_API_URL=http://localhost:8000/api' > .env; ok "Da tao apps/web/.env"; }

# ------------------------------------------------------------
# 6. Start services (background, log ra /tmp)
# ------------------------------------------------------------
# Don cac instance cu (neu co) de re-run an toan
[[ -f "$PID_FILE" ]] && { while read -r pid; do kill "$pid" 2>/dev/null || true; done < "$PID_FILE"; rm -f "$PID_FILE"; sleep 1; }
pkill -f "php artisan serve" 2>/dev/null || true
pkill -f "0.0.0.0:8000" 2>/dev/null || true
pkill -f "php artisan reverb:start" 2>/dev/null || true
pkill -f "node.*vite" 2>/dev/null || true

: > "$API_LOG"; : > "$WEB_LOG"

echo ">> start Laravel API :8000 ..."
cd "$BACKEND"
PHP_CLI_SERVER_WORKERS=4 setsid nohup php artisan serve --host=0.0.0.0 --port=8000 >> "$API_LOG" 2>&1 &
echo $! >> "$PID_FILE"

echo ">> start Reverb WebSocket :8080 ..."
setsid nohup php artisan reverb:start --host=0.0.0.0 --port=8080 >> "$API_LOG" 2>&1 &
echo $! >> "$PID_FILE"

echo ">> start Vite dev server :5173 ..."
cd "$FRONTEND"
setsid nohup npm run dev -- --host 0.0.0.0 >> "$WEB_LOG" 2>&1 &
echo $! >> "$PID_FILE"

# ------------------------------------------------------------
# 7. Health checks
# ------------------------------------------------------------
wait_for() { # $1=url  $2=ten
    for _ in $(seq 1 30); do
        curl -sf -o /dev/null "$1" && return 0
        sleep 1
    done
    die "$2 khong san sang sau 30s - xem log: $3"
}

wait_for "http://127.0.0.1:8000/api/cities" "Laravel API" "$API_LOG"
ok "API san sang: http://localhost:8000/api"
wait_for "http://127.0.0.1:5173" "Frontend" "$WEB_LOG"
ok "Web san sang:  http://localhost:5173"

echo ""
echo "=============================================="
echo -e " ${c_green}DEMO SAN SANG${c_off}"
echo "=============================================="
echo "  Web : http://localhost:5173"
echo "  API : http://localhost:8000/api"
echo "  WS  : ws://localhost:8080 (Reverb)"
echo ""
echo "  Tai khoan demo (mat khau: password)"
echo "    Sinh vien : student1@example.com"
echo "    Chu nha   : landlord1@example.com"
echo ""
echo "  Log   : $API_LOG | $WEB_LOG"
echo "  Stop  : bash infra/deploy/deploy.sh --stop"
echo "  Smoke : bash scripts/e2e-smoke.sh"
echo "=============================================="
