## Mo ta thay doi
<!-- Mo ta ngan gon ve noi dung PR nay -->

## Loai thay doi
- [ ] Refactor / Don dep ma nguon (khong doi hanh vi)
- [ ] Sua loi (bug fix)
- [ ] Tinh nang moi (feature)
- [ ] Tai lieu / CI / Ha tang

## Kiem tra truoc khi tao PR
- [ ] Frozen contracts: Khong thay doi endpoints, route URIs, HTTP status codes, JSON shape hoac chuoi tieng Viet user-facing.
- [ ] Schema database: Khong sua doi, doi ten hoac di chuyen migrations hien co.
- [ ] Backend Pint: `./vendor/bin/pint --test` vuot qua (0 loi format).
- [ ] Backend Tests: `php artisan test` vuot qua (tat ca test case pass).
- [ ] Route list diff: `php artisan route:list` khong co thay doi ngoai y muon.
- [ ] Frontend Lint: `npm run lint` khong co warning / error.
- [ ] Frontend Build: `npm run build` bien dich thanh cong.
- [ ] E2E / Smoke: Cac kich ban kiem thu hoat dong on dinh.
- [ ] Bao mat: Khong commit file `.env`, credential, hay secret token.
- [ ] Conventional commit: Format commit ro rang, khong dau tieng Viet (vd: `chore(repo): ...`).

## Ghi chu them / Can chu y khi deploy
<!-- Cac luu y dac biet, bien moi truong can thiet, hoac rui ro neu co -->
