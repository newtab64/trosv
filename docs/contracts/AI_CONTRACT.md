# Hợp đồng AI: Backend <-> AI service

AI service là một ứng dụng FastAPI nhỏ. **Chỉ Backend gọi nó.** Frontend không bao giờ gọi. Backend chuẩn bị mọi dữ liệu (AI service không có database) và gửi kèm trong request. Nếu cần thay đổi, hãy sửa file này rồi báo cho cả nhóm.

## 1. Quy ước chung

- Base URL: `http://localhost:8001`. Mọi body là JSON. Văn bản do bạn sinh ra phải bằng **tiếng Việt**.
- Thành công: HTTP 200 kèm JSON như bên dưới. Thất bại: bất kỳ mã không phải 2xx (dùng mặc định của FastAPI `{ "detail": "..." }` là được). Khi đó Backend sẽ trả 503 cho Frontend.
- Backend chờ tối đa **30 giây**. Hãy trả lời nhanh hơn mức đó.
- Backend kiểm tra cấu trúc response của bạn. Thiếu trường hoặc sai kiểu dữ liệu đều bị tính là thất bại, nên hãy làm đúng cấu trúc.
- **Riêng tư**: bạn chỉ nhận id và thông tin hồ sơ. Không có tên, email, số điện thoại. Không ghi log body request chứa dữ liệu cá nhân.
- Để API key trong `.env`, không bao giờ để trong repo.

## 2. Chế độ fake (làm đầu tiên)

Khi `FAKE_MODE=true`, mọi endpoint trả dữ liệu giả có vẻ thật, **đúng cấu trúc response** bên dưới, mà không gọi model nào. Nhờ vậy Backend và Frontend có thể tích hợp ngay từ ngày đầu, và nhóm có bản demo chạy được không cần internet hay API key vào ngày thi. Sau đó thay dần logic giả bằng logic thật, từng endpoint một.

## 3. Giá trị cho phép

| Trường | Giá trị |
|---|---|
| `sleep_schedule` | `early`, `normal`, `late` |
| `personality` | `introvert`, `ambivert`, `extrovert` |
| `priorities` | `cheap`, `near_school`, `well_rated`, `many_options` |
| `type` | `room`, `apartment`, `house` |
| `verdict` | `high`, `fair`, `low` |

Tiền là số nguyên đơn vị VND. Khoảng cách tính bằng km.

## 4. Các endpoint

### `GET /health`

Response: `{ "status": "ok" }`

### `POST /roommates`

Xếp hạng các ứng viên bạn cùng phòng cho một sinh viên.

Request:
```json
{
  "requester": { "id": 1, "budget_min": 1500000, "budget_max": 3000000,
                 "sleep_schedule": "normal", "cleanliness": 4, "smoking": false,
                 "personality": "introvert", "interests": ["music", "gym"] },
  "candidates": [ { "id": 45, "budget_min": 2000000, "budget_max": 3500000,
                    "sleep_schedule": "late", "cleanliness": 3, "smoking": false,
                    "personality": "ambivert", "interests": ["music", "reading"] } ],
  "limit": 5
}
```
Response (tốt nhất trước, tối đa `limit` phần tử, `id` phải lấy từ danh sách ứng viên, `score` từ 0 đến 100):
```json
{ "results": [ { "id": 45, "score": 87, "reason": "Cùng thích âm nhạc, ngân sách giao nhau, đều không hút thuốc." } ] }
```

### `POST /price-advice`

Đánh giá giá thuê của một tin đăng có hợp lý không. Backend đã tính sẵn thống kê thị trường từ các tin tương tự (cùng phường, cùng loại, diện tích gần nhau).

Request:
```json
{
  "listing": { "type": "room", "price": 2500000, "area_m2": 22.5, "ward": "Thủ Đức",
               "amenities": ["Wi-Fi", "Máy lạnh"] },
  "stats": { "count": 12, "min": 1800000, "median": 2300000, "max": 3200000 }
}
```
Response (`message` là đoạn tin nhắn mẫu lịch sự để sinh viên gửi cho chủ nhà khi thương lượng):
```json
{ "verdict": "high", "fair_min": 2100000, "fair_max": 2500000,
  "tips": ["Hỏi về giá khi thuê từ 6 tháng", "So sánh với phòng có diện tích tương tự"],
  "message": "Chào anh/chị, em thấy mức giá 2,5 triệu hơi cao so với khu vực..." }
```

### `POST /areas`

Xếp hạng các khu vực theo ngân sách và ưu tiên của sinh viên. Backend đã tính sẵn thống kê theo từng khu vực.

Request:
```json
{
  "preferences": { "budget_min": 1500000, "budget_max": 3000000,
                   "priorities": ["cheap", "near_school"] },
  "areas": [ { "ward_id": 1, "name": "Thủ Đức", "listings_count": 41, "avg_price": 2300000,
               "avg_rating": 4.2, "distance_to_school_km": 1.2 } ],
  "limit": 3
}
```
`avg_rating` và `distance_to_school_km` có thể là `null`. Response (tốt nhất trước, tối đa `limit` phần tử, `ward_id` lấy từ dữ liệu đầu vào):
```json
{ "results": [ { "ward_id": 1, "reason": "Giá trung bình 2,3 triệu nằm trong ngân sách, gần trường (1,2 km)." } ] }
```

### `POST /chat`

Trả lời câu hỏi về việc thuê nhà, khu vực hoặc hợp đồng.

Request:
```json
{
  "message": "Tiền cọc thường là bao nhiêu?",
  "history": [ { "role": "user", "content": "..." }, { "role": "assistant", "content": "..." } ],
  "listing": { "title": "Phòng trọ gần ĐHQG", "price": 2500000, "area_m2": 22.5, "address": "12 Đường số 5",
               "ward": "Thủ Đức", "amenities": ["Wi-Fi"], "description": "..." }
}
```
`history` có tối đa 10 phần tử. `listing` là `null` khi câu hỏi mang tính chung chung. Response:
```json
{ "reply": "Thông thường tiền cọc bằng 1 đến 2 tháng tiền phòng..." }
```
Quy tắc: dùng các thông tin trong `apps/ai-service/knowledge.md` (khoảng 40 dòng do bạn viết: mẹo thuê trọ, tiền cọc, kiến thức cơ bản về hợp đồng, những điều cần kiểm tra để an toàn). Nếu câu trả lời liên quan đến hợp đồng, tiền cọc hoặc pháp lý, kết thúc bằng: "Thông tin mang tính tham khảo, không thay thế tư vấn pháp lý." Nếu không biết thì nói không biết. Không bịa thông tin về tin đăng.

### `POST /description`

Viết mô tả tin đăng từ các thông tin cơ bản.

Request:
```json
{ "title": "Phòng trọ gần ĐHQG", "type": "room", "price": 2500000, "area_m2": 22.5,
  "address": "12 Đường số 5", "ward": "Thủ Đức", "amenities": ["Wi-Fi", "Máy lạnh"] }
```
Mọi trường trừ `title` có thể là `null` hoặc bị thiếu. Response:
```json
{ "description": "Phòng trọ thoáng mát, đầy đủ tiện nghi..." }
```
Quy tắc: 80 đến 120 từ, giọng văn thân thiện, chỉ dùng thông tin được cung cấp, không bịa (không tự nghĩ ra khoảng cách, giá, nội quy).

## 5. Checklist cho người làm AI

1. `GET /health` và cả 5 endpoint trả về dữ liệu giả hợp lệ (`FAKE_MODE=true`). Báo cho nhóm ngay khi xong bước này.
2. Làm logic thật cho `/description` và `/price-advice` trước, sau đó `/roommates`, `/areas`, `/chat`.
3. Mọi endpoint thật vẫn đúng cấu trúc ở trên. Kiểm thử bằng các request mẫu trong file này.
4. Nếu model trả JSON sai, thử lại một lần, sau đó trả mã lỗi (không trả cấu trúc bị hỏng).
5. Trong repo có `knowledge.md`, `.env.example` và một `README` ngắn (cách cài đặt và chạy).
