# Hợp đồng API: Frontend <-> Backend

Backend xây dựng, Frontend sử dụng. Nếu cần thay đổi, hãy sửa file này rồi báo cho cả nhóm.

## 1. Quy ước chung

- Base URL: `http://localhost:8000/api`. Mọi body là JSON (`Content-Type: application/json`), trừ upload tệp dùng `multipart/form-data`. Luôn gửi header `Accept: application/json`.
- Xác thực: `POST /login` trả về một token. Gửi `Authorization: Bearer {token}` ở mọi request cần đăng nhập. Frontend lưu token (dùng localStorage là đủ cho đồ án này) và xóa token khi đăng xuất hoặc khi nhận `401` mất phiên (request có Bearer token bị từ chối; 401 từ chính endpoint đăng nhập không tính).
- Tên trường dùng `snake_case`. Ngày giờ theo chuẩn ISO 8601. Tiền là số nguyên đơn vị VND. Khoảng cách tính bằng km.
- Thành công: `{ "data": ... }`. Danh sách có phân trang thêm `"meta": { "current_page", "last_page", "per_page", "total" }` và nhận `?page=`, `?per_page=` (mặc định 12, tối đa 50).
- Lỗi: `{ "message": "nội dung tiếng Việt" }`. Lỗi validate có thêm `"errors": { "field": ["thông báo"] }`.

| Mã | Ý nghĩa |
|---|---|
| 401 | Chưa đăng nhập hoặc token sai |
| 403 | Đã đăng nhập nhưng không có quyền (sai vai trò, không phải chủ sở hữu) |
| 404 | Không tìm thấy |
| 422 | Dữ liệu không hợp lệ (có `errors`) |
| 429 | Quá giới hạn tần suất yêu cầu (`ApiThrottle`, trả kèm headers `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `Retry-After`) |
| 503 | AI service không khả dụng (chỉ với `/ai/*`) |
| 500 | Lỗi máy chủ |

- Cột "Quyền" bên dưới: **Công khai** = không cần token, **User** = bất kỳ người dùng đã đăng nhập, **Student** = sinh viên, **Landlord** = chủ nhà, **Owner** = chủ nhà sở hữu tin đăng đó.
- Endpoint công khai vẫn nhận token. Khi có token, các trường như `is_favorited` sẽ được cá nhân hóa.

## 2. Giá trị và tài khoản demo

| Trường | Giá trị |
|---|---|
| `role` | `student`, `landlord` |
| `type` (tin đăng) | `room` (phòng trọ), `apartment` (căn hộ), `house` (nhà nguyên căn) |
| `status` (tin đăng) | `available` (còn trống), `rented` (đã thuê), `hidden` (ẩn) |
| `sleep_schedule` | `early` (ngủ sớm), `normal` (bình thường), `late` (ngủ muộn) |
| `personality` | `introvert` (hướng nội), `ambivert` (trung tính), `extrovert` (hướng ngoại) |
| `priorities` | `cheap` (giá rẻ), `near_school` (gần trường), `well_rated` (đánh giá tốt), `many_options` (nhiều lựa chọn) |

Tài khoản mẫu (mật khẩu `password`): từ `student1@example.com` đến `student10@example.com`, từ `landlord1@example.com` đến `landlord3@example.com`.

## 3. Các đối tượng dữ liệu

**User**
```json
{ "id": 1, "name": "Nguyễn Văn A", "email": "a@example.com", "role": "student",
  "phone": "0901234567", "bio": null, "school_id": 1,
  "budget_min": 1500000, "budget_max": 3000000,
  "sleep_schedule": "normal", "cleanliness": 4, "smoking": false,
  "personality": "introvert", "interests": "music,gym", "looking_for_roommate": true }
```
Các trường chỉ dành cho sinh viên sẽ là `null` với chủ nhà. `cleanliness` từ 1 đến 5. `interests` là chuỗi ngăn cách bằng dấu phẩy.

**Listing (dạng tóm tắt, dùng cho danh sách và bản đồ)**
```json
{ "id": 101, "title": "Phòng trọ gần ĐHQG", "type": "room", "price": 2500000, "area_m2": 22.5,
  "address": "12 Đường số 5", "latitude": 21.0056, "longitude": 105.8339, "status": "available",
  "ward": { "id": 1, "name": "Thủ Đức" },
  "cover_image": "http://localhost:8000/storage/listings/1.jpg",
  "avg_rating": 4.3, "reviews_count": 7, "distance_km": 0.85, "is_favorited": false }
```
`cover_image` có thể là `null`. `avg_rating` có thể là `null`. `distance_km` chỉ có giá trị khi request gửi `school_id`, ngược lại là `null`. `is_favorited` luôn là `false` với khách.

**Listing (dạng chi tiết)**: gồm mọi trường của dạng tóm tắt, cộng thêm
```json
{ "description": "...", "created_at": "2026-09-20T08:30:00Z",
  "images": [ { "id": 1, "url": "http://localhost:8000/storage/listings/1.jpg" } ],
  "amenities": [ { "id": 1, "name": "Wi-Fi" } ],
  "landlord": { "id": 5, "name": "Trần Thị B", "phone": "0909999999" },
  "ratings": { "listing_avg": 4.3, "landlord_avg": 4.6, "area_avg": 4.1 },
  "my_conversation_id": null, "can_review": false }
```
`landlord.phone` là `null` với khách. Các giá trị trong `ratings` có thể là `null`. `my_conversation_id` và `can_review` chỉ có ý nghĩa với sinh viên.

**Conversation (hội thoại)**
```json
{ "id": 33, "listing": { "id": 101, "title": "Phòng trọ gần ĐHQG", "cover_image": null },
  "other_user": { "id": 5, "name": "Trần Thị B", "role": "student" },
  "last_message": { "body": "Phòng còn trống không ạ?", "created_at": "2026-09-20T08:30:00Z" },
  "unread_count": 2 }
```

**Message (tin nhắn)**
```json
{ "id": 901, "sender_id": 1, "is_mine": true, "is_unsent": false, "body": "Phòng còn trống không ạ?",
  "attachment_name": "hop-dong.pdf", "attachment_url": "http://localhost:8000/attachments/901?signature=...",
  "created_at": "2026-09-20T08:30:00Z" }
```
`attachment_url` là link tạm thời có chữ ký (hiệu lực 60 phút). Mở thẳng trong tab trình duyệt, không cần token. Cả hai trường tệp đính kèm là `null` khi tin nhắn không có tệp.

`is_unsent` là `true` khi người gửi đã thu hồi tin (xem `DELETE /messages/{id}`): `body`, `attachment_name`, `attachment_url` đều là `null` và mọi client hiển thị tombstone "Tin nhắn đã được thu hồi". Tin đã bị xóa "chỉ ở phía mình" không xuất hiện trong kết quả của người đó nữa (bị lọc khỏi danh sách).

**Review (đánh giá)**
```json
{ "id": 21, "student": { "id": 1, "name": "Nguyễn Văn A" },
  "listing_rating": 4, "landlord_rating": 5, "comment": "Chủ nhà nhiệt tình", "created_at": "2026-09-21T10:00:00Z" }
```

## 4. Danh sách endpoint

### Xác thực và hồ sơ

| Endpoint | Quyền | Body | Trả về |
|---|---|---|---|
| `POST /register` | Công khai | `name`, `email` (duy nhất), `password` (tối thiểu 8 ký tự), `password_confirmation`, `role` | 201 `data: { token, user }` (đăng nhập luôn) |
| `POST /login` | Công khai | `email`, `password` | `data: { token, user }`. Sai thông tin: 422 |
| `POST /logout` | User | | `data: null` |
| `GET /me` | User | | `data: User` |
| `PUT /profile` | User | Một hoặc nhiều trường: `name`, `phone`, `bio`, và với sinh viên `school_id`, `budget_min`, `budget_max` (max >= min), `sleep_schedule`, `cleanliness`, `smoking`, `personality`, `interests`, `looking_for_roommate` | `data: User` |

### Dữ liệu tham chiếu (cho dropdown và bản đồ)

Cascade địa lý: chọn Tỉnh/TP (34 đơn vị cấp tỉnh theo NQ 202/2025/QH15) trước,
rồi lọc phường/xã và trường theo `city_id`.

| Endpoint | Quyền | Trả về |
|---|---|---|
| `GET /cities` | Công khai | `data: [{ id, name, type: "city\|"province", latitude, longitude }]` (xếp theo tên A-Z, được cache tăng tốc) |
| `GET /wards?city_id=` | Công khai | `data: [{ id, name, city: { id, name, type }, latitude, longitude }]` |
| `GET /schools?city_id=` | Công khai | `data: [{ id, name, city: { id, name, type }, ward: { id, name } \| null, latitude, longitude }]` - `ward` la phuong chua truong, dung `ward.id` de goi `GET /listings?ward_id=` |
| `GET /amenities` | Công khai | `data: [{ id, name }]` (được cache tăng tốc) |

### Duyệt tin đăng

| Endpoint | Quyền | Query | Trả về |
|---|---|---|---|
| `GET /listings` | Công khai | `q` (tiêu đề hoặc địa chỉ), `price_min`, `price_max`, `city_id` (qua ward của tin), `ward_id`, `type`, `amenity_ids[]` (phải có tất cả), `school_id` + `max_km` (lọc theo khoảng cách), `sort` = `newest` (mặc định), `price_asc`, `price_desc`, `distance` (cần `school_id`), `rating`, `page`, `per_page` | `Listing (tóm tắt)` có phân trang. Chỉ tin `available`. Sắp xếp `rating` tối ưu hóa đánh giá tốt nhất lên trước, tin chưa đánh giá xuống cuối |
| `GET /listings/{id}` | Công khai | | `data: Listing (chi tiết)`. Tin `hidden`: trả 404 trừ chủ tin |
| `GET /listings/{id}/reviews` | Công khai | `page` | `Review` có phân trang, mới nhất trước |

Với bản đồ, Frontend gọi `GET /listings` với cùng bộ lọc và `per_page=50`, rồi vẽ các điểm theo `latitude`, `longitude` của kết quả.

### Chủ nhà: quản lý tin đăng

| Endpoint | Quyền | Body | Trả về |
|---|---|---|---|
| `GET /my/listings` | Landlord | `page`, `status` | `Listing (tóm tắt)` có phân trang, mọi trạng thái |
| `POST /listings` | Landlord | `title` (5-200 ký tự), `type`, `price` (100000-100000000), `area_m2` (5-1000), `address`, `latitude`, `longitude`, `ward_id`, `description` (tùy chọn), `amenity_ids[]` (tùy chọn) | 201 `data: Listing (chi tiết)` |
| `PUT /listings/{id}` | Owner | Các trường như trên (đều tùy chọn) và thêm `status` | `data: Listing (chi tiết)` |
| `DELETE /listings/{id}` | Owner | | `data: null`. Xóa tin kèm xóa file ảnh trên disk một cách an toàn |
| `POST /listings/{id}/images` | Owner | `multipart`: `images[]` (jpg/png/webp, tối đa 2 MB mỗi ảnh, tối đa 5 ảnh mỗi tin tính tổng) | `data: [{ id, url }]` (toàn bộ ảnh của tin). Ảnh đầu tiên là ảnh bìa. Xử lý atomic (database transaction kèm tự động dọn dẹp file disk nếu lỗi) |
| `DELETE /listings/{id}/images/{image_id}` | Owner | | `data: null` |

### Yêu thích (sinh viên)

| Endpoint | Quyền | Trả về |
|---|---|---|
| `GET /favorites` | Student | `Listing (tóm tắt)` có phân trang |
| `PUT /favorites/{listing_id}` | Student | `data: { is_favorited: true }`. Gọi hai lần vẫn an toàn |
| `DELETE /favorites/{listing_id}` | Student | `data: { is_favorited: false }`. Gọi hai lần vẫn an toàn |

### Nhắn tin (sinh viên <-> chủ nhà, mỗi tin đăng một hội thoại)

| Endpoint | Quyền | Body | Trả về |
|---|---|---|---|
| `POST /conversations` | Student | `listing_id` | `data: Conversation`. Nếu đã có thì trả hội thoại cũ |
| `POST /users/{id}/message` | Student | không có | Get-or-create hội thoại **trực tiếp** giữa 2 sinh viên (không qua tin đăng, `listing` = null). Đích là chủ nhà hoặc chính mình → 404. Trả `201` khi tạo mới, `200` khi đã có |
| `GET /conversations` | User | | `data: [Conversation]`, hoạt động mới nhất trước (không phân trang) |
| `GET /conversations/{id}/messages` | Participant | `after_id` (tùy chọn, chỉ lấy tin mới hơn) | `data: [Message]` cũ nhất trước, đã ẩn các tin bị xóa "chỉ ở phía mình" với người gọi. Dùng cho lần tải đầu; tin mới đến qua WebSocket (xem mục *WebSocket realtime* bên dưới), không còn polling 5 giây |
| `POST /conversations/{id}/messages` | Participant | JSON `{ body }` (tối đa 1000 ký tự), hoặc multipart `body` + `file` (pdf, jpg, png, docx, tối đa 5 MB) | 201 `data: Message`. Đồng thời broadcast `.message.sent` qua WebSocket (xem mục *WebSocket realtime* bên dưới) |
| `POST /conversations/{id}/read` | Participant | | `data: null`. Đánh dấu đã đọc các tin của người kia |
| `DELETE /messages/{id}` | Participant | query `scope` = `unsent` hoặc `self` (mặc định) | `data: null`. `unsent` = **Thu hồi** cho cả hai phía: tin thành tombstone (`is_unsent: true`), chỉ người gửi được gọi (403 nếu không phải), chỉ trong 1 giờ sau khi gửi (422 nếu quá), gọi hai lần vẫn an toàn. `self` = **Xóa chỉ ở phía mình**: ẩn tin với người gọi, người kia vẫn thấy bình thường, không có confirm, gọi hai lần vẫn an toàn |

Participant = một trong hai người tham gia hội thoại. Người ngoài nhận 404. Số tin chưa đọc trên thanh menu = tổng `unread_count` từ `GET /conversations` (lần đầu), sau đó cập nhật realtime qua WebSocket (xem mục *WebSocket realtime* bên dưới).

### WebSocket realtime (Laravel Reverb)

Tin nhắn và sự kiện xóa được đẩy realtime qua WebSocket, thay cho polling 5 giây trước đây. Giao thức là Pusher protocol; frontend dùng `laravel-echo` + `pusher-js` (xem `src/api/echo.js`). Server: `ws://localhost:8080/app/{REVERB_APP_KEY}` - key khai báo ở `REVERB_APP_KEY` (apps/api/.env) và **phải trùng** `VITE_REVERB_APP_KEY` (apps/web/.env); key lệch thì Reverb trả lỗi `4001 Application does not exist`. `bash infra/deploy/deploy.sh` tự khởi động Reverb cùng stack.

**Xác thực private channel:** Echo gọi `POST /broadcasting/auth` (cùng origin với API nhưng **không có** tiền tố `/api`) với header `Authorization: Bearer {token}` và body JSON `{ socket_id, channel_name }`, nhận `{ auth }` để hoàn tất subscribe. Route này chạy trong nhóm `api` + `auth:sanctum` (đăng ký qua `withBroadcasting` trong `bootstrap/app.php`); CORS đã mở cho `broadcasting/auth`.

**Kênh (đều là private):**

| Kênh | Ai được subscribe | Sự kiện |
|---|---|---|
| `conversation.{id}` | Hai người trong hội thoại (người khác bị từ chối) | `.message.sent`, `.message.deleted`, `.message.seen`, `.message.reacted` |
| `App.Models.User.{id}` | Chính chủ | `.message.sent`, `.message.deleted` (badge chưa đọc, sidebar) |

Ngoài ra kênh `conversation.{id}` truyền **client-event** `typing` (không qua backend): bên đang gõ gọi `whisper('typing', { user_id })` trên mỗi thay đổi input; bên kia hiện bubble "đang soạn" (3 chấm) và tự ẩn sau 2.5 giây không có whisper mới.

Tên sự kiện phía client có dấu chấm đầu (do backend dùng `broadcastAs`): `.listen('.message.sent', ...)`. `chat.{id}` của user-to-user không dùng riêng - hội thoại trực tiếp cũng nằm trong `conversation.{id}`.

**`.message.sent`** - payload dùng chung cho cả hai phía nên **không có** `is_mine`; client tự so `sender_id` với user hiện tại:
```json
{ "conversation_id": 33,
  "message": { "id": 902, "sender_id": 1, "body": "Còn phòng không ạ?",
    "attachment_name": null, "attachment_url": null, "created_at": "2026-09-25T09:00:00Z" } }
```
UI thread đang mở lắng nghe `conversation.{id}` (append bubble nếu chưa có - event thường đến trước HTTP response của chính tin đó); badge + sidebar lắng nghe `App.Models.User.{id}` (badge +1 nếu `sender_id` khác mình; người đang mở hội thoại gọi `POST /conversations/{id}/read` như cũ).

**`.message.deleted`** - payload:
```json
{ "conversation_id": 33, "message_id": 902, "sender_id": 1,
  "removed": true, "deleted_for": [],
  "conversation": { "id": 33, "last_message": { "body": "Tin nhắn đã được thu hồi", "created_at": "..." } } }
```
- `removed: true` - thu hồi cho mọi người: bubble thành tombstone, sidebar dùng `conversation.last_message` làm preview mới.
- `removed: false` - xóa "chỉ ở phía mình": **chỉ** client có id trong `deleted_for` mới ẩn tin; người còn lại bỏ qua event. Khi đó `conversation` là `null`.
- `sender_id` để client trừ badge nếu tin chưa đọc bị thu hồi.

**`.message.seen`** - receiver gọi `POST /conversations/{id}/read` (mở thread) thì backend broadcast event này, sender hiển thị "Đã xem" realtime:
```json
{ "conversation_id": 33, "reader_id": 5, "seen_at": "2026-09-25T09:05:00Z" }
```
Client chỉ xử lý khi `reader_id` khác mình: cập nhật `seen_at` cho các tin `is_mine` chưa seen. `Message` mới thêm trường `seen_at` (thời điểm người nhận đọc, `null` = chưa); tin của chính mình gửi đi luôn có `seen_at` ban đầu là `null`.

**`.message.reacted`** - reaction kiểu Messenger (bộ 6: 👍 ❤️ 😂 😮 😢 😠, mỗi user một reaction trên mỗi tin):
```json
{ "conversation_id": 33, "message_id": 902, "user_id": 5,
  "reactions": { "5": "❤️", "1": "😂" } }
```
Client chỉ cần thay map `reactions` của tin tương ứng bằng giá trị payload. Endpoint: `PUT /messages/{id}/reactions` body `{ emoji }` - đặt/đổi, gọi lần nữa với cùng emoji là bỏ; `DELETE /messages/{id}/reactions` - bỏ. `Message` có thêm trường `reactions` (map `{ "userId": "emoji" }`, `{}` khi không có).

**Quy tắc fallback:** không còn poll `after_id` lặp lại. `GET /conversations/{id}/messages` chỉ chạy lần đầu khi mở hội thoại và khi Echo mất kết nối (tự reconnect); logout gọi `disconnect()` để đóng socket.

### Đánh giá (sinh viên)

| Endpoint | Quyền | Body | Trả về |
|---|---|---|---|
| `POST /listings/{id}/reviews` | Student | `listing_rating` (1-5), `landlord_rating` (1-5), `comment` (tùy chọn, tối đa 1000 ký tự) | 201 `data: Review`. 403 nếu sinh viên chưa có hội thoại về tin này. 422 nếu đã đánh giá rồi |

Chỉ hiển thị form đánh giá khi chi tiết tin có `can_review: true`.

### AI (gọi AI service thông qua Backend)

Các lệnh gọi này có thể mất đến khoảng 30 giây. Hãy hiển thị vòng quay loading. Nếu AI service không chạy, trạng thái là 503 kèm `message` tiếng Việt. Luôn gắn nhãn cho kết quả: "Gợi ý tham khảo do AI tạo ra".

| Endpoint | Quyền | Body | Trả về |
|---|---|---|---|
| `GET /users/{id}` | Công khai | không có | `data: User` công khai của sinh viên (không có `email`/`phone`; `interests` là mảng key; chủ nhà → 404) |
| `POST /ai/roommates` | Student | không có | `data: [{ user_id, name, school, phone, interests: string[], interests_shared: string[], score, reason }]` (tối đa 5, xếp theo `interests_shared` giảm dần - trùng nhiều sở thích nhất trước - rồi `score` từ 0 đến 100 cao nhất trước; `interests` là key sở thích để hiển thị chip, `interests_shared` là giao với người yêu cầu). 422 nếu hồ sơ sinh viên chưa đủ hoặc `looking_for_roommate` là false |
| `POST /ai/price-advice` | Student | `listing_id` | `data: { listing_price, verdict, fair_min, fair_max, tips: [string], message, stats: { count, min, median, max } }`. `verdict` là `high`, `fair` hoặc `low`. `message` là đoạn tin nhắn mẫu để gửi cho chủ nhà |
| `POST /ai/area-suggestions` | Student | `budget_min`, `budget_max`, `school_id`, `priorities[]` (đều tùy chọn, thiếu thì lấy từ hồ sơ) | `data: [{ ward_id, name, reason, stats: { listings_count, avg_price, avg_rating, distance_to_school_km } }]` (tối đa 3) |
| `POST /ai/chat` | User | `message` (1-1000 ký tự), `history` (tùy chọn, 10 lượt gần nhất dạng `{ role: "user" hoặc "assistant", content }`), `listing_id` (tùy chọn, làm ngữ cảnh) | `data: { reply }`. Frontend giữ lịch sử và gửi lại mỗi lần |
| `POST /ai/description` | Landlord | `title`, `type`, `price`, `area_m2`, `address`, `ward_id`, `amenity_ids[]` (đều tùy chọn) | `data: { description }`. Frontend điền vào ô mô tả để chủ nhà chỉnh sửa |

## 5. Thay đổi hợp đồng này

Sửa file này, báo trong nhóm chat, và chờ người bị ảnh hưởng đồng ý trước khi merge. Việc bổ sung nhỏ (thêm một trường tùy chọn) không cần chờ duyệt nhưng vẫn phải thông báo.
