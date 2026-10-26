# Frontend

React 18 + TypeScript strict + Vite 6 + Tailwind CSS v4 + Radix UI + Lucide React (Node 22 theo `.nvmrc`).
Build luôn chạy `tsc --noEmit` trước - TypeScript lỗi thì không build được.
Gọi toàn bộ API qua Backend theo [docs/contracts/API_CONTRACT.md](../../docs/contracts/API_CONTRACT.md).

## Chạy

```bash
npm install
cp .env.example .env   # VITE_API_URL=http://localhost:8000/api
npm run dev            # http://localhost:5173
```

Cần Backend chạy ở `:8000`. Khi chạy full Docker stack, web ở
http://localhost:5174 và API same-origin `/api`.

## Tài khoản demo (mật khẩu `password`)

- `student1@example.com` … `student10@example.com` - sinh viên
- `landlord1@example.com` … `landlord3@example.com` - chủ nhà

## Trang

| Đường dẫn | Chức năng |
|---|---|
| `/` | Trang chủ: hero responsive (SVG artwork), tin mới nhất, loại tin, tính năng AI |
| `/rooms` | Duyệt + lọc tin (từ khóa, loại, tỉnh/TP → phường, trường, giá, tiện ích), phân trang |
| `/rooms/:id` | Chi tiết: lightbox ảnh, tiện ích, đánh giá, yêu thích, nhắn tin, tư vấn giá AI |
| `/map` | Bản đồ Leaflet: điểm tin đăng + trường, lọc bán kính km |
| `/login`, `/register` | Đăng nhập / đăng ký theo vai trò |
| `/favorites` | Phòng yêu thích (sinh viên) |
| `/messages`, `/messages/:id` | Hộp thư, chat realtime (WebSocket Reverb), gửi tệp đính kèm |
| `/profile` | Hồ sơ cá nhân (`PUT /profile`) |
| `/students/:id` | Hồ sơ công khai của sinh viên |
| `/ai/roommates` | AI gợi ý bạn cùng phòng (sinh viên) |
| `/ai/area-suggestions` | AI gợi ý khu vực (sinh viên) |
| `/ai/chat` | Trợ lý AI, hỗ trợ ngữ cảnh tin đăng qua `?listing_id=` |
| `/landlord` | Quản lý tin đăng (chủ nhà) |
| `/landlord/new`, `/landlord/edit/:id` | Đăng/sửa tin: chọn vị trí trên bản đồ, ảnh, tiện ích, "Viết mô tả giúp tôi" (AI) |

## Kiểm thử

| Lệnh | Phạm vi |
|---|---|
| `npm run lint` | ESLint (TypeScript parser, quy tắc a11y và hooks) |
| `npm run build` | `tsc --noEmit && vite build` - biên dịch TypeScript và đóng gói Vite |
| `npx playwright test` | 11+ spec E2E trình duyệt thật; cần API :8000 đã seed + web :4173 (`E2E_BASE_URL`) |
| `bash ../../scripts/e2e-smoke.sh` | Smoke mọi API theo luồng người dùng, AI tắt vẫn xanh |
| `npm run test:e2e` | Hành trình người dùng đầy đủ (Python + Chromium hệ thống) |

```bash
# Playwright với Docker stack local:
E2E_BASE_URL=http://localhost:5174 npx playwright test
```

## Ghi chú kỹ thuật

- Token lưu `localStorage` (`token`, `user`); nhận 401 "mất phiên" thì xóa
  cả hai và chuyển `/login` (xem `src/api/axiosClient.ts` - 401 từ form
  login sai mật khẩu không gây redirect).
- Style hệ thống sử dụng **Tailwind CSS v4** với design tokens tập trung tại
  `src/styles.css` (bảng màu ấm sinh viên, font Inter & Inter Tight Variable,
  bóng đổ warm-depth, bo góc card 16px) kết hợp các headless primitives
  từ **Radix UI** (`@radix-ui/react-*`), icons từ **Lucide React**, và
  thông báo qua **Sonner**.
- Bundle bake `VITE_*` lúc build - đổi `.env` xong phải build lại, restart
  không đủ.
