# Security Policy

## Reporting a Vulnerability

**KHÔNG** tạo issue công khai cho lỗ hổng bảo mật.

Email: **security@trosv.example** *(thay bằng địa chỉ thật trước khi chạy
production)*

Kèm theo:

1. Mô tả lỗ hổng và loại (IDOR, upload bypass, race condition, ...)
2. Các bước tái hiện / request HTTP cụ thể
3. Ảnh chụp hoặc response minh họa tác động
4. Đánh giá mức độ nghiêm trọng (CRITICAL / HIGH / MEDIUM / LOW)

Phản hồi trong vòng **72 giờ**; cam kết không truy cứu người báo cáo tốt
(safe harbor).

## Phạm vi

- Backend API (Laravel): xác thực Sanctum, tin đăng, hội thoại, AI proxy
- Frontend SPA (React/Vite)
- Cấu hình Docker / Reverb / Caddy trong repo này

Ngoài phạm vi: dịch vụ AI chạy riêng (`AI_URL`), hạ tầng máy chủ bên ngoài
repo.

## Biện pháp hiện có

- Header bảo mật toàn cục: `X-Content-Type-Options`, `Referrer-Policy`,
  `X-Frame-Options`, CSP **enforcing** chọn theo loại response - nghiêm
  `default-src 'none'; frame-ancestors 'none'` cho JSON/binary (toàn bộ
  API), policy riêng cho trang HTML duy nhất
  (`apps/api/app/Http/Middleware/SecurityHeaders.php`).
- Production fail-fast: backend từ chối phục vụ HTTP khi `APP_DEBUG=true`
  hoặc thiếu `APP_KEY`
  (`apps/api/app/Http/Middleware/EnsureProductionConfig.php` - console và
  composer vẫn chạy bình thường để CI/deploy không vỡ).
- Token Sanctum hết hạn sau 30 ngày (`SANCTUM_TOKEN_TTL_MINUTES`).
- Extension ảnh tin đăng suy từ nội dung đã xác thực, không tin tên file
  client gửi lên.
- File đính kèm chat là file riêng tư, chỉ mở qua URL ký hết hạn 60 phút.
- Quét secret trong CI (gitleaks) ở job `secrets`.

## Lưu ý khi triển khai

- Production luôn dùng `APP_ENV=production`, `APP_DEBUG=false` - backend
  sẽ từ chối phục vụ mọi request nếu ngược lại (500 chung, lý do chi tiết
  chỉ vào log).
- Đặt mật khẩu DB mạnh; không dùng `rental/rental` ngoài môi trường demo.
- CORS: `FRONTEND_URL` phải khớp chính xác origin frontend (kể cả scheme
  và port).
