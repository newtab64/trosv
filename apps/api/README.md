# Backend - API nhà trọ cho sinh viên (Laravel 11)

API theo `docs/contracts/API_CONTRACT.md`. Lỗi trả JSON `{ message }` (+ `errors` cho 422), thông báo tiếng Việt.

## Chạy nhanh

### Cách A: Docker (backend + PostgreSQL)

```bash
cp apps/api/.env.example apps/api/.env
docker compose up -d --build        # db + backend (+ ai-service nếu có thư mục)
docker compose exec backend php artisan key:generate
docker compose exec backend php artisan migrate --seed
```

Backend chạy ở http://localhost:8000. Kiểm tra: `curl http://localhost:8000/api/cities`

### Cách B: Không Docker

Cần PHP 8.2+, Composer, PostgreSQL 16. Chạy `docker compose up -d db` để có database, rồi:

```bash
cd apps/api
composer install
cp .env.example .env                # DB_HOST=127.0.0.1
php artisan key:generate
php artisan migrate --seed
php artisan serve                   # http://localhost:8000
```

## Test

```bash
cd apps/api
php artisan test                    # toàn bộ suite
vendor/bin/pint --test app tests    # check style
```

Tài khoản demo (mật khẩu `password`):
- Sinh viên: `student1@example.com` … `student10@example.com`
- Chủ nhà: `landlord1@example.com` … `landlord3@example.com`

## Cấu trúc chính

| Thư mục | Nội dung |
|---|---|
| `app/Http/Controllers` | Auth/Profile, Reference (cities/wards/schools/amenities), Listing (duyệt + chi tiết + đánh giá), LandlordListing (CRUD + ảnh), Favorite, Conversation (nhắn tin), Attachment (signed URL), AiController |
| `app/Http/Resources` | User, City, Ward, School, ListingSummary, ListingDetail, Review, Conversation, Message - shape đúng §3 hợp đồng |
| `app/Http/Middleware` | `role:student|landlord` (EnsureRole), `throttle.api` (429 tiếng Việt theo IP/User), SecurityHeaders |
| `app/Services` | `AiService` (chuẩn bị dữ liệu và xử lý nghiệp vụ AI), `AiClient` (HTTP client gọi FastAPI) |
| `lang/vi` | Thông báo lỗi validate tiếng Việt |

## Ghi chú kỹ thuật

- `role` **không** nằm trong `$fillable` - chỉ được đặt khi tạo qua `register`/factory (`forceCreate`). Không endpoint nào đổi vai trò được.
- Ảnh tin đăng: public disk `storage/app/public/listings`, tối đa 5 ảnh/tin, jpg/png/webp ≤ 2MB, xử lý atomic với rollback disk cleanup khi lỗi.
- Tệp nhắn tin: **private** disk, chỉ mở qua signed URL 60 phút (không cần token, mở thẳng trong tab), tên file được khử nhiễm chống header injection.
- `Model::preventLazyLoading(!isProduction())` - N+1 sẽ ném exception trong dev/test.
- Rate limiting: 10 req/phút cho login/register (theo IP) và các endpoint AI (theo User ID cho người dùng đăng nhập). Mọi request guest thiếu `Accept: application/json` vẫn nhận JSON 401 (không redirect).

## Dịch vụ AI (FastAPI proxy)

Các endpoint `/ai/*` (roommates, price-advice, area-suggestions, chat, description) được định tuyến đầy đủ qua `AiController` và `AiService`, gọi tới AI service qua `config('services.ai.url')`. Khi AI service không khả dụng hoặc lỗi, backend tự động trả về 503 JSON `"Dịch vụ AI tạm thời không khả dụng."` theo hợp đồng.

