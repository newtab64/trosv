# Design: Landlord "Đăng tin mới" wizard, multi-photo fix, address search

**Date:** 2026-11-13
**Target base:** `unstable`
**Scope:** `apps/web` (landlord feature) plus the upload size limit in `apps/api` and its infra config.

---

## 1. Intent and why

A landlord creating a listing can only add one batch of photos: every file pick replaces the previous pick. The root cause is `pickFiles` in `apps/web/src/features/landlord/hooks/useListingForm.ts`, which calls `setNewFiles(files)` instead of appending. There is also no preview and no way to remove one picked photo.

The same page asks landlords to type a latitude and a longitude. The map already accepts a click, but the two required number fields make it look like manual entry is the real path.

The goal is a form that is quick to finish on a phone or a laptop: pick an address once and have the city, ward, address and map pin follow, add photos in several rounds, and see problems before submitting.

## 2. Goals, non-goals, anti-goals

### Goals
- Photos accumulate across picks and drops, up to 5 in total, with a thumbnail for each, a remove button on each, and a way to choose the cover.
- Per-photo limit rises from 2 MB to 5 MB, enforced consistently from browser to PHP.
- Replace the manual latitude/longitude fields with address search, a draggable pin, and a "use my current location" action.
- Redesign the create page as a 4-step wizard that matches the existing TROSV look.
- The edit page (`/landlord/edit/:id`) keeps working and benefits from the same photo and address components.

### Non-goals
- No change to the listing data model, to the API request shape (`latitude`, `longitude`, `ward_id`, `address` stay), or to browse/search.
- No reordering of already-uploaded photos beyond "make this the cover".
- No server-side geocoding, no paid map provider in this iteration.

### Anti-goals
- Do not ship a wizard that loses entered data when moving back and forth between steps.
- Do not call a geocoder on every keystroke without debounce, or from more than one request at a time per field.
- Do not raise the web or PHP body limits so far that chat attachment limits (5 MB per file) silently change.

## 3. Constraints and existing conventions

- Frontend structure: `features/landlord/{pages,components,hooks,lib,api}`; import direction `app > features > shared` is enforced by ESLint.
- Visual language (taken from `apps/web/src/styles.css` and the real pages): cream page `#fbf8f1`, card `#fffdf9`, line `#e9e0d1`, plate blue `#17479e` for the one primary action and selected chips, 48px inputs with 8px radius, section cards with 12px radius and 24px padding, `h2` at 20px semibold, required marker `*` in plate blue, page title in the display font with no highlighted keyword. Use the existing `Button`, `Field`, `Input`, `Tag`, `PageHeader` components, not new look-alikes.
- Language: all UI strings Vietnamese, with diacritics.
- Existing pure model lives in `lib/listingFormModel.ts` (`MAX_PHOTOS`, `photoLimitError`, payload builders); keep logic there, React in the hook.
- `Permissions-Policy` already allows `geolocation=(self)`. The web nginx config sets no CSP, so calling Photon from the browser needs no header change. Verify this again at build time.

## 4. Decisions (made by the user)

1. **Layout: wizard, 4 steps**, in this order (the order itself was approved by the user): **Vị trí → Thông tin → Ảnh → Mô tả**. Last step shows a short review and the "Đăng tin" button.
2. **Address search with Photon** (OpenStreetMap-based, free, built for search-as-you-type). Choosing a suggestion flies the map to the place, drops the pin, and fills Tỉnh/TP, Phường and Địa chỉ. The pin stays draggable and the map still accepts a click.
3. **Latitude/longitude fields are removed from the UI.** The values stay in form state and in the payload.
4. **Photo limit is 5 MB per file**, 5 photos per listing (unchanged).
5. **Page title has no highlighted word.**

## 5. Behaviour

### 5.1 Wizard
- Stepper shows four steps; completed steps show a check, the current step is outlined in plate blue.
- "Tiếp tục" validates only the current step's fields and shows errors inline; it does not advance while errors remain. "Quay lại" never validates.
- Form state lives in one place (the existing `useListingForm`) so going back keeps all values and picked photos.
- Step 1 "Cancel" returns to the dashboard; steps 2-4 show "Quay lại".
- Edit mode uses the same steps, starts on step 1 with values filled, and shows the already-uploaded photos (with delete only) before the new photos in step 3. "Make cover" applies to new photos only, and only while the listing has no photos yet: the API's cover is the oldest photo and there is no endpoint to change it. A stepper click on a completed step may jump to it. The builder decides whether to also allow jumping forward in edit mode.
- Required fields per step: Vị trí needs a pin (latitude/longitude set), ward and address; Thông tin needs title, type, price, area; Ảnh and Mô tả have no required fields (same as today).

### 5.2 Photos
- A pick or drop adds to the current set. Duplicates (same name, size and last-modified) are ignored.
- Total (existing + new) may not exceed 5; extra files beyond the limit are dropped with a notice saying how many were kept.
- Files over 5 MB, or not JPG/PNG/WebP, are skipped individually; the others are kept. The notice names each skipped file and why.
- Each new photo shows a thumbnail from an object URL (revoked on removal and on unmount), a remove button, and "Đặt làm ảnh bìa", which moves it to the front. The first photo carries the "Ảnh bìa" tag.
- Counter "n/5" and the text "JPG, PNG hoặc WebP · tối đa 5 ảnh · mỗi ảnh 5 MB" are visible.
- Upload progress: keep what exists today; a per-photo progress bar is optional if the API client already exposes upload progress.
- The file input is reset after each pick so choosing the same file again works.

### 5.3 Address search and map
- One search field with a suggestion list under it; debounce about 300 ms, minimum 3 characters, cancel the previous request when a new one starts.
- Photon queries are biased to Vietnam (language `vi`, a country filter or bounding box). Show up to 5 suggestions, each with a bold name and a muted line for ward, district and city.
- Choosing a suggestion: fly the map to it, place the pin, set latitude/longitude, and try to match the suggestion's city and ward against the cities/wards already loaded from the API (by normalized name, diacritics-insensitive). If a match is found, set `city_id` and `ward_id`; if not, leave them empty and show the existing selects for the landlord to pick. Fill `address` with the street line.
- A short text "Đã tự điền từ địa chỉ bạn chọn. Bạn vẫn sửa được." appears after a successful fill; the three fields stay editable.
- "Dùng vị trí hiện tại" uses `navigator.geolocation`; on denial or error, show a short message and keep manual options. Coordinates only; city and ward are not guessed from raw coordinates unless the builder finds a cheap, reliable way (Photon reverse geocoding is acceptable).
- If Photon is unreachable or returns nothing, show "Không tìm thấy địa chỉ" and let the landlord click the map and fill the selects by hand. Submitting must never depend on Photon being up.
- Show the current coordinates as one small muted line with a link "Nhập tọa độ thủ công" that reveals the two number inputs for anyone who wants them.
- Known limit: OpenStreetMap data in Vietnam often resolves to street or ward level, not exact house number, which is why the pin stays draggable. If landlords report frequent misplacement, a provider with better Vietnamese address data (for example Goong) is the follow-up; it should be possible to swap the provider behind a small `geocodeApi` module.

### 5.4 Size limit change (5 MB)
Change all layers together or uploads fail with 413:
- `apps/api/app/Modules/Listing/Http/Requests/ListingImageUploadRequest.php`: `max:2048` to `max:5120`; update its docblock and the comment in `LandlordListingController.php` near line 117.
- Update `apps/api/tests/Feature/Listing/LandlordListingTest.php` (the "3 MB > 2 MB" case) to a size over 5 MB, and add a case showing 4 MB passes.
- `apps/api/docker/php.ini`: `upload_max_filesize = 6M` already fits one 5 MB file; `post_max_size` must fit 5 photos of 5 MB plus overhead, so raise it from 16M to about 26M.
- Web nginx and API reverse proxy: raise `client_max_body_size` (currently 16m) and the Caddyfile limit to match `post_max_size`, as `docs/runbooks/DEPLOY.md` (around line 178) instructs.
- Docs: `apps/api/README.md` line about images, `docs/contracts/API_CONTRACT.md` row for `POST /listings/{id}/images`, and the DEPLOY runbook text.
- Chat attachments stay at 5 MB per file; confirm they are unaffected by the larger `post_max_size`.

## 6. Testing expectations
- Unit tests for the new pure logic in `listingFormModel` (adding files, de-duplication, limit trimming, skipped-file reasons, cover reordering, step validation, ward/city matching).
- Hook and component tests following `useListingForm.test.tsx` and the existing landlord tests: two separate picks accumulate; removing one photo; cover change; step validation blocks "Tiếp tục"; going back keeps values.
- Photon calls mocked in tests; cover empty result, network error, and a stale response arriving after a newer one.
- Update `apps/web/e2e/design/landlord-form.spec.ts` for the wizard flow; keep it read-only (it must not press "Đăng tin").
- Backend feature test for the 5 MB boundary.
- Run the existing lint, type check, unit tests and the landlord e2e specs before claiming done.

## 7. Left to the builder
- Component names and file split under `components/landlord-form/`, keeping files small.
- How wizard step state is held (hook state versus URL query).
- Debounce and cancellation implementation, Photon endpoint parameters, and the exact Vietnam bias.
- The ward and city name-matching rule, provided it is diacritics-insensitive and falls back safely.
- Whether per-photo upload progress is shown.
- Animation and exact spacing, provided they match the rest of the app.

## 8. Calls made by the author (not stated by the user)
- Step order beyond the user's approval of "address first" is as listed in section 4.
- Debounce 300 ms, minimum 3 characters, 5 suggestions.
- Duplicate photo detection by name, size and last-modified.
- `post_max_size` target about 26M.
- Manual-coordinate link kept as an escape hatch.
- Photon is called straight from the browser, not proxied through the API.
