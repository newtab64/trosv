# 1. Bearer Token Luu Trong localStorage

- **Trang thai**: Accepted
- **Ngay**: 2026-10-14
- **Nguoi quyet dinh**: Doi ngu phat trien TROSV

## Boi canh (Context)

TROSV la ung dung tim phong tro danh cho sinh vien, bao gom mot React SPA (frontend) va mot RESTful API tren nen tang Laravel (backend) su dung Laravel Sanctum.

Khi nguoi dung dang nhap (`POST /api/login`), he thong can cap phuong thuc xac thuc cho cac request tiep theo. Hai phuong an pho bien la:
1. Cookie-based sessions / HttpOnly cookies.
2. Bearer token (Personal Access Token) tra ve qua JSON va duoc client luu tru (vi du trong `localStorage`).

## Quyet dinh (Decision)

Chung toi quyet dinh su dung **Bearer token duoc luu trong `localStorage`** cua trinh duyet va gui qua header `Authorization: Bearer <token>` trong moi request den API.

## Ly do (Rationale)

1. **Khong bi anh huong boi CSRF**:
   - Khi token khong nam trong cookie, trinh duyet khong tu dong gui token kem theo cac cross-site request (nhu the `<img>`, `<form action="...">`).
   - Loai bo nhu cau quan ly CSRF token phuc tap giua frontend SPA va backend API.

2. **Linh hoat cho da nen tang (Multi-client)**:
   - Trong tuong lai, cung mot he thong API co the phuc vu ung dung di dong (React Native / Flutter) hoac cac client ben thu ba ma khong can xu ly co che cookie domain / SameSite.

3. **Don gian hoa moi truong phat trien va proxy**:
   - Trong moi truong dev/demo, frontend chay tren cong `5174` (hoac `5173`/`4173`) va backend chay tren `8000`. Bearer token hoat dong nhat quan ma khong gap cac van de ve cookie scope, HTTPS requirements (Secure flag), hay CORS credentials configuration.

## Hau qua & Bien phap giam thieu (Consequences & Mitigations)

### Nhuoc diem (Downsides)
- **Token co the bi doc boi bat ky lo hong XSS nao**: Neu ung dung frontend dinh loi Cross-Site Scripting (XSS), ma doc JavaScript doc quyen chay tren trinh duyet co the truy cap vao `localStorage.getItem("token")` va danh cap token xac thuc cua nguoi dung.

### Bien phap giam thieu hien co (Existing Mitigations)
1. **Thuc thi Content-Security-Policy (CSP) nghiem ngat**:
   - Cau hinh qua `security-headers.conf` (Nginx/Caddy) va `App\Http\Middleware\SecurityHeaders` (Laravel) de ngan chan nap script tu cac nguon khong tin cay va vo hieu hoa inline script nguy hiem.
2. **Khong dung `dangerouslySetInnerHTML`**: Toan bo du lieu nguoi dung deu duoc React escape tu dong truoc khi render.
3. **Thoi han song cua token (Token TTL) & Kha nang thu hoi**:
   - Token duoc sinh boi Laravel Sanctum va quan ly tap trung trong bang `personal_access_tokens`.
   - Token co the bi thu hoi chu dong boi nguoi dung khi dang xuat (`POST /api/logout`) hoac het han theo TTL cau hinh trong `config/sanctum.php`.

### Phuong an thay the da ghi nhan (Documented Alternative)
- **HttpOnly Cookies**: Day la phuong an thay the da duoc ghi nhan trong [docs/reports/PLAN.md](../reports/PLAN.md) (muc "Tiếp theo", muc uu tien 5: *"httpOnly cookie session (thay localStorage token) - cân nhắc sau"*). Neu sau nay he thong can nang cao hon nua muc do phong thu truoc XSS ma khong can uu tien tinh don gian cua REST client, kien truc co the chuyen sang su dung HttpOnly session cookies voi co che CSRF bao ve cua Sanctum.
