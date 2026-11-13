# Landlord "Đăng tin mới" Wizard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let landlords add photos in several rounds (5 MB each, max 5), find the address with a search box that pins the map, and fill the listing through a 4-step wizard that matches the existing TROSV look.

**Architecture:** Pure logic (photo merging, address matching, step validation) goes in `features/landlord/lib`, React state in small hooks next to `useListingForm`, and presentational step components under `components/landlord-form/`. Photon is called from the browser through one module, `api/geocodeApi.ts`. The backend change is only the upload size limit and the infra limits that must match it.

**Tech Stack:** React + TypeScript, Vitest + Testing Library, Playwright (e2e), Leaflet (already used), Laravel (validation rule), PHP/nginx/Caddy config.

**Spec:** `docs/superpowers/specs/2026-11-13-landlord-new-listing-wizard-design.md`

## Global Constraints

- Work on a branch `feat/landlord-wizard` created from `unstable`.
- Commit messages: Conventional Commits. **No `Co-Authored-By` trailer** (repo rule, see user memory `feedback_no-ai-coauthor`).
- UI strings Vietnamese with full diacritics. Page title `Đăng tin mới` has **no highlighted word**.
- Photo limits: **5 photos per listing, 5 MB per photo** (`5 * 1024 * 1024` bytes), JPG/PNG/WebP only.
- Required UI copy: `JPG, PNG hoặc WebP · tối đa 5 ảnh · mỗi ảnh 5 MB`; `Đặt làm ảnh bìa`; `Ảnh bìa`; `Dùng vị trí hiện tại`; `Nhập tọa độ thủ công`; `Đã tự điền từ địa chỉ bạn chọn. Bạn vẫn sửa được.`; `Không tìm thấy địa chỉ`.
- Wizard steps in this order: `Vị trí`, `Thông tin`, `Ảnh`, `Mô tả`.
- Photon debounce 300 ms, minimum 3 characters, 5 suggestions, only results with `countrycode === "VN"`.
- Photon requests use plain `fetch`, never the shared `axiosClient` (it attaches the user's bearer token to every request).
- Reuse `Button`, `Field`, `Input`, `Tag`, `PageHeader`, `Chip` from `@/shared/ui`; visual tokens come from `apps/web/src/styles.css`. ESLint import direction `app > features > shared` must hold.
- Latitude/longitude stay in `ListingFormState` and in the API payload; only the UI fields are hidden.
- Verification commands (from `apps/web`): `npx vitest run <file>`, `npm run typecheck`, `npm run lint`. Backend (from `apps/api`): `php artisan test --filter=<name>`.

## Review Focus

1. Picking the same file twice, or picking a file again after removing it, must work: duplicates are ignored, and the file input is reset after every pick (Task 3, Task 4).
2. A slow Photon response that arrives after a newer query, or after unmount, must not overwrite newer suggestions (Task 6).
3. A server 422 on a field that lives in an earlier step must move the wizard to that step with the error visible (Task 9).
4. Pressing Enter inside a text input on steps 1-3 must go to the next step, never submit the listing (Task 9).
5. Object URLs for thumbnails must be revoked when a photo is removed and on unmount (Task 4).

## File Structure

- Modify `apps/web/src/features/landlord/lib/listingFormModel.ts`: photo merge logic replaces `photoLimitError`.
- Create `lib/addressMatch.ts`: `normalizeName`, `matchAddress`.
- Create `lib/wizardModel.ts`: `WIZARD_STEPS`, `validateStep`, `stepOfField`.
- Create `api/geocodeApi.ts`: Photon search and reverse.
- Modify `hooks/useListingForm.ts`; create `hooks/useLocationFill.ts`, `hooks/useAddressSearch.ts`, `hooks/useObjectUrls.ts`, `hooks/useWizardSteps.ts`.
- Create components in `components/landlord-form/`: `WizardStepper.tsx`, `AddressSearch.tsx`, `LocationStep.tsx`, `PhotosStep.tsx`, `ReviewSummary.tsx`. Modify `BasicsSection.tsx`, `CoordinatePicker.tsx`. Delete `LocationSection.tsx`, `PhotoSections.tsx`.
- Modify `pages/LandlordForm.tsx`.
- Backend/infra: `ListingImageUploadRequest.php`, `LandlordListingController.php` (comment), `LandlordListingTest.php`, `apps/api/docker/php.ini`, `apps/api/docker/Caddyfile`, `apps/web/nginx.conf.template`, `apps/api/README.md`, `docs/contracts/API_CONTRACT.md`, `docs/runbooks/DEPLOY.md`.

---

### Task 1: 5 MB upload limit across backend and infra

**Files:**
- Modify: `apps/api/app/Modules/Listing/Http/Requests/ListingImageUploadRequest.php:9,24`
- Modify: `apps/api/app/Modules/Listing/Http/Controllers/LandlordListingController.php:117` (docblock)
- Modify: `apps/api/docker/php.ini:5-7`, `apps/api/docker/Caddyfile:28-31`, `apps/web/nginx.conf.template:57`
- Modify: `apps/api/README.md:60`, `docs/contracts/API_CONTRACT.md:139`, `docs/runbooks/DEPLOY.md:178-181`
- Test: `apps/api/tests/Feature/Listing/LandlordListingTest.php` (around line 343)

**Interfaces:**
- Produces: API accepts `images[]` up to 5 MB each; request bodies up to 26 MB pass every proxy layer.

- [ ] **Step 1: Write failing tests** in `LandlordListingTest.php`: `test_image_up_to_5mb_is_accepted` (fake `create('ok.jpg', 4500, 'image/jpeg')` returns 200) and change the existing oversize case to `create('big.jpg', 5200, ...)` expecting 422 on `images.0`. Add `test_uploaded_images_keep_request_order` (upload 3 files named a, b, c; the first uploaded gets the smallest id, because the smallest id is the cover).
- [ ] **Step 2: Run** `php artisan test --filter=LandlordListingTest` from `apps/api`. Expected: the 4.5 MB test FAILS with 422.
- [ ] **Step 3: Change** `'max:2048'` to `'max:5120'` and fix the docblocks mentioning 2 MB.
- [ ] **Step 4: Raise limits together:** `php.ini` `post_max_size = 26M` (keep `upload_max_filesize = 6M`, fix the comment); Caddyfile `max_size 26MB`; nginx template `client_max_body_size 26m;`.
- [ ] **Step 5: Update docs** (README, API_CONTRACT row, DEPLOY runbook: "ảnh 5 MB, tệp chat 5 MB", 26m) .
- [ ] **Step 6: Run** `php artisan test --filter=LandlordListingTest` and `php artisan test --filter=Conversation`. Expected: PASS (chat attachment limit unaffected).
- [ ] **Step 7: Commit** `feat(api): nâng giới hạn ảnh tin đăng lên 5 MB`.

---

### Task 2: Photo merge logic (pure)

**Files:**
- Modify: `apps/web/src/features/landlord/lib/listingFormModel.ts` (remove `photoLimitError`)
- Test: `apps/web/src/features/landlord/lib/listingFormModel.test.ts` (replace the `photoLimitError` describe)

**Interfaces:**
- Produces:
  - `export const MAX_PHOTO_BYTES: number` (5 MiB), `export const PHOTO_TYPES: readonly string[]`
  - `export interface MergeResult { files: File[]; notices: string[]; added: number }`
  - `export function mergePhotos(existingCount: number, current: File[], incoming: File[]): MergeResult`
  - `export function movePhotoToFront(files: File[], index: number): File[]`

- [ ] **Step 1: Write failing tests** in `describe("mergePhotos")`:
  - appends: `mergePhotos(0, [a], [b]).files` equals `[a, b]`, `added` 1.
  - duplicate (same name, size, lastModified) is ignored silently: `notices` empty, `added` 0.
  - non-image type is skipped with notice `“doc.pdf” không phải JPG, PNG hoặc WebP.`
  - 6.4 MB file skipped with notice `“lon.jpg” nặng 6,4 MB, vượt 5 MB nên đã bị bỏ qua.`; the other valid files in the same pick are kept.
  - `mergePhotos(3, [], four files)` keeps 2 and has notice `Chỉ còn chỗ cho 2 ảnh, đã bỏ 2 ảnh cuối.`
  - `mergePhotos(5, [], [a])` keeps 0 with notice `Tin đăng đã đủ 5 ảnh.`
  - `movePhotoToFront([a,b,c], 2)` equals `[c,a,b]`; index 0 or out of range returns the same order.
- [ ] **Step 2: Run** `npx vitest run src/features/landlord/lib/listingFormModel.test.ts`. Expected: FAIL (not exported).
- [ ] **Step 3: Implement** the four exports. Order of checks per incoming file: duplicate, type, size, then room (`MAX_PHOTOS - existingCount - current.length`). Size is formatted with one decimal and a comma. Delete `photoLimitError`.
- [ ] **Step 4: Run** the same command. Expected: PASS.
- [ ] **Step 5: Commit** `feat(web): gộp ảnh nhiều lần chọn, giới hạn 5 MB`.

---

### Task 3: Photo actions in `useListingForm`

**Files:**
- Modify: `apps/web/src/features/landlord/hooks/useListingForm.ts:166-180,182-205`
- Test: `apps/web/src/features/landlord/hooks/useListingForm.test.tsx` (the `photos` describe and the upload test)

**Interfaces:**
- Consumes: `mergePhotos`, `movePhotoToFront` (Task 2).
- Produces on the hook's return value:
  - `pickFiles(files: File[]): boolean` (true when at least one file was added; appends, never replaces)
  - `removeNewFile(index: number): void`, `makeCover(index: number): void`
  - `photoNotices: string[]`
  - `handleFilePick(e)`: always resets `e.target.value = ""` after reading the files
  - `setErrors: Dispatch<SetStateAction<Record<string, string[]>>>`

- [ ] **Step 1: Write failing tests** (replace the old rejection tests): two successive `pickFiles` calls give `newFiles` of length 2 in order; picking the same file twice keeps 1; with 3 existing images in edit mode and 3 picked, `newFiles` has 2 and `photoNotices` contains the "Chỉ còn chỗ cho 2 ảnh" text; an oversize file yields a notice and the valid ones are still added; `removeNewFile(0)` drops the first; `makeCover(2)` moves it to index 0; `handleFilePick` with an event whose `target.files` has one file leaves `target.value === ""`; a pick with 0 accepted returns false. Keep the "uploads the chosen photos" test passing.
- [ ] **Step 2: Run** `npx vitest run src/features/landlord/hooks/useListingForm.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement** the actions with `mergePhotos(images.length when isEdit else 0, newFiles, files)`; store `notices` in `photoNotices` (reset on each pick); stop using `notice` for photos; expose `setErrors`.
- [ ] **Step 4: Run** the same command. Expected: PASS. Run `npm run typecheck`; it will flag `PhotoSections.tsx` usage, fixed in Task 4.
- [ ] **Step 5: Commit** `feat(web): thêm bớt ảnh, đổi ảnh bìa trong form tin đăng`.

---

### Task 4: `PhotosStep` component and thumbnails

**Files:**
- Create: `apps/web/src/features/landlord/hooks/useObjectUrls.ts`, `components/landlord-form/PhotosStep.tsx`
- Delete: `components/landlord-form/PhotoSections.tsx`
- Test: `hooks/useObjectUrls.test.ts`, `components/landlord-form/PhotosStep.test.tsx`

**Interfaces:**
- Consumes: hook API from Task 3 via `ListingFormApi`.
- Produces: `export function useObjectUrls(files: File[]): string[]` (one URL per file, same order; revokes URLs for removed files and all on unmount); `export function PhotosStep({ form }: { form: ListingFormApi }): JSX.Element`.

- [ ] **Step 1: Write failing tests.** `useObjectUrls`: with `URL.createObjectURL/revokeObjectURL` stubbed, rerendering with one file removed revokes exactly that file's URL; unmount revokes the rest. `PhotosStep` (mock a `ListingFormApi` object): renders one thumbnail per `newFiles`, the text `3/5` for 3 files, the required limits copy, the `Ảnh bìa` tag on the first, a remove button `Xóa ảnh 2` calling `removeNewFile(1)`, `Đặt làm ảnh bìa` on non-first photos calling `makeCover`, each `photoNotices` item rendered in an alert, hidden `Đặt làm ảnh bìa` when `images.length > 0` (cover is the oldest existing image), existing images in edit mode with delete buttons calling `handleDeleteImage`, and an add tile that opens the file input.
- [ ] **Step 2: Run** `npx vitest run src/features/landlord/hooks/useObjectUrls.test.ts src/features/landlord/components/landlord-form/PhotosStep.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement** both. Layout per the approved mockup: section card (`SECTION` from `styles.ts`), `h2` "Ảnh" with `n/5`, dashed dropzone (keep drag/drop and keyboard behavior from the old `PhotoDropzone`, `accept="image/jpeg,image/png,image/webp"`, `multiple`), 3-column thumbnail grid with `Tag` and circular × button, red notice box (`bg-danger-tint`). Existing images (edit mode) render in the same grid before the new ones and are not counted twice.
- [ ] **Step 4: Run** the same command plus `npm run typecheck` (page still imports the deleted file; temporarily point `LandlordForm.tsx` at `PhotosStep` so the build is green until Task 9).
- [ ] **Step 5: Commit** `feat(web): bước Ảnh với ảnh xem trước, xóa từng ảnh, ảnh bìa`.

---

### Task 5: Photon client and address matching

**Files:**
- Create: `apps/web/src/features/landlord/api/geocodeApi.ts`, `lib/addressMatch.ts`
- Test: `api/geocodeApi.test.ts`, `lib/addressMatch.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface GeoSuggestion {
    id: string; label: string; detail: string;
    latitude: number; longitude: number;
    street: string; cityName: string | null; wardCandidates: string[];
  }
  export function searchAddress(query: string, signal?: AbortSignal): Promise<GeoSuggestion[]>;
  export function reverseGeocode(latitude: number, longitude: number, signal?: AbortSignal): Promise<GeoSuggestion | null>;
  // lib/addressMatch.ts
  export function normalizeName(name: string): string;
  export interface AddressMatch { city_id: number | null; ward_id: number | null }
  export function matchAddress(s: GeoSuggestion, cities: City[], wards: Ward[]): AddressMatch;
  ```

- [ ] **Step 1: Write failing tests.** `geocodeApi` (stub global `fetch`): `searchAddress("12 Đại Cồ Việt")` requests `https://photon.komoot.io/api/` with `q`, `limit=5` and a Vietnam `bbox=102.1,8.4,109.5,23.4`, sends no `Authorization` header; maps a GeoJSON feature (`geometry.coordinates` is `[lon, lat]`, `properties` has `name`, `street`, `housenumber`, `district`, `locality`, `city`, `state`, `countrycode`) to a `GeoSuggestion` (`street` is `"12 Ngõ 35 Đại Cồ Việt"` style: housenumber + street when both exist, else name); drops features whose `countrycode` is not `VN`; a non-OK response rejects with an Error; an aborted request rejects with `AbortError`. `reverseGeocode` hits `/reverse?lon=&lat=` and returns `null` when no feature. `addressMatch`: `normalizeName("Phường Bách Khoa")` and `"bach khoa"` normalize equal; `đ` becomes `d`; prefixes `thanh pho`, `tinh`, `quan`, `huyen`, `phuong`, `xa`, `tp.` are stripped; `"TP.HCM"`, `"Thành phố Hồ Chí Minh"` and `"Ho Chi Minh City"` all normalize to `"ho chi minh"`. `matchAddress`: city and ward both found; city found but ward not gives `{city_id, ward_id: null}`; nothing found gives both null; ward only matches inside the matched city; numeric wards `"Phường 5"` vs `"5"` match.
- [ ] **Step 2: Run** `npx vitest run src/features/landlord/api/geocodeApi.test.ts src/features/landlord/lib/addressMatch.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** both modules with the signatures above. `wardCandidates` collects `district`, `locality`, `suburb`, `county` from the feature, de-duplicated.
- [ ] **Step 4: Run** the same command. Expected: PASS.
- [ ] **Step 5: Commit** `feat(web): client Photon và khớp địa chỉ với tỉnh/phường của hệ thống`.

---

### Task 6: Location behavior (search hook, autofill, current location)

**Files:**
- Create: `hooks/useAddressSearch.ts`, `hooks/useLocationFill.ts`
- Modify: `hooks/useListingForm.ts` (compose and return `useLocationFill`)
- Test: `hooks/useAddressSearch.test.ts`, `hooks/useLocationFill.test.ts`

**Interfaces:**
- Consumes: `searchAddress`, `reverseGeocode`, `matchAddress`, `GeoSuggestion` (Task 5).
- Produces:
  ```ts
  export type SearchStatus = "idle" | "loading" | "empty" | "error";
  export function useAddressSearch(query: string): { suggestions: GeoSuggestion[]; status: SearchStatus };
  export function useLocationFill(args: {
    cities: City[]; wards: Ward[];
    setForm: Dispatch<SetStateAction<ListingFormState>>;
  }): {
    applySuggestion(s: GeoSuggestion): void;
    locateMe(): Promise<void>;
    autofilled: boolean;
    locateError: string;
  };
  ```
  `useListingForm` returns these four values too.

- [ ] **Step 1: Write failing tests** (fake timers). `useAddressSearch`: queries shorter than 3 characters (trimmed) never call `searchAddress` and stay `idle`; typing fast calls it once, 300 ms after the last keystroke; a second query aborts the first signal; a response that resolves after a newer query (or after unmount) is ignored; empty array gives `empty`; rejection gives `error` (not for `AbortError`). `useLocationFill`: `applySuggestion` sets latitude, longitude, `address` to `s.street`, and `city_id`/`ward_id` from the match, and sets `autofilled` true; when the ward does not match it sets only `city_id` and clears `ward_id`; when nothing matches it leaves existing city and ward untouched. `locateMe` with a stubbed `navigator.geolocation.getCurrentPosition` success sets coordinates and then fills via `reverseGeocode`; permission denied sets `locateError` to `Không lấy được vị trí. Hãy bật quyền vị trí hoặc chọn trên bản đồ.` and changes no form value; a failing `reverseGeocode` still keeps the coordinates.
- [ ] **Step 2: Run** `npx vitest run src/features/landlord/hooks/useAddressSearch.test.ts src/features/landlord/hooks/useLocationFill.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** both hooks; compose `useLocationFill({ cities, wards, setForm })` inside `useListingForm`. Manual edits to city, ward or address clear `autofilled`.
- [ ] **Step 4: Run** the same command plus `npx vitest run src/features/landlord/hooks/useListingForm.test.tsx`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(web): tìm địa chỉ Photon, tự điền tỉnh/phường, dùng vị trí hiện tại`.

---

### Task 7: Location step UI and map

**Files:**
- Create: `components/landlord-form/AddressSearch.tsx`, `components/landlord-form/LocationStep.tsx`
- Modify: `components/landlord-form/CoordinatePicker.tsx`
- Delete: `components/landlord-form/LocationSection.tsx`
- Test: `components/landlord-form/AddressSearch.test.tsx`, `components/landlord-form/LocationStep.test.tsx`

**Interfaces:**
- Consumes: `useAddressSearch`, form API from Task 6.
- Produces: `AddressSearch({ onPick }: { onPick: (s: GeoSuggestion) => void })`; `LocationStep({ form })`; `CoordinatePicker` keeps props `{ lat, lng, onPick }` but now: marker is draggable (`dragend` calls `onPick`), a click still calls `onPick`, and when `lat`/`lng` change from outside to valid numbers the marker moves and the map calls `flyTo` at zoom 17. The coordinate overlay label is removed.

- [ ] **Step 1: Write failing tests.** `AddressSearch` (mock `useAddressSearch`): typing shows up to 5 suggestions with bold `label` and muted `detail`; clicking one calls `onPick` and closes the list; arrow keys and Enter select; `status: "empty"` shows `Không tìm thấy địa chỉ`; `status: "error"` shows `Không tìm thấy địa chỉ. Bạn có thể bấm vào bản đồ để chọn.`; list has `role="listbox"` with `role="option"` items. `LocationStep` (mock form API and `CoordinatePicker`): shows the search box, `Dùng vị trí hiện tại` (calls `locateMe`), the three fields Tỉnh/TP, Phường, Địa chỉ, `Đã tự điền từ địa chỉ bạn chọn. Bạn vẫn sửa được.` when `autofilled`, the `locateError` text, a muted coordinates line, and the latitude/longitude inputs only after clicking `Nhập tọa độ thủ công`.
- [ ] **Step 2: Run** `npx vitest run src/features/landlord/components/landlord-form/AddressSearch.test.tsx src/features/landlord/components/landlord-form/LocationStep.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement** per the approved mockup (search box with listbox under it, map 230 px tall inside a 12 px rounded border, city/ward/address fields from the old `BasicsSection`, moved here). Leaflet effect keeps its "create once" rule (callback read through a ref).
- [ ] **Step 4: Run** the same command and `npm run typecheck`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(web): bước Vị trí với ô tìm địa chỉ và bản đồ kéo ghim`.

---

### Task 8: Wizard model, stepper and step state

**Files:**
- Create: `lib/wizardModel.ts`, `hooks/useWizardSteps.ts`, `components/landlord-form/WizardStepper.tsx`
- Modify: `components/landlord-form/BasicsSection.tsx` (keep only Tiêu đề, Loại tin, Giá, Diện tích; city/ward/address moved to `LocationStep`)
- Test: `lib/wizardModel.test.ts`, `hooks/useWizardSteps.test.ts`, `components/landlord-form/WizardStepper.test.tsx`

**Interfaces:**
- Produces:
  ```ts
  export const WIZARD_STEPS: readonly ["Vị trí", "Thông tin", "Ảnh", "Mô tả"];
  export type WizardStep = 0 | 1 | 2 | 3;
  export function validateStep(step: WizardStep, form: ListingFormState): Record<string, string[]>;
  export function stepOfField(field: string): WizardStep | null;
  export function useWizardSteps(args: {
    form: ListingFormState; isEdit: boolean;
    setErrors: Dispatch<SetStateAction<Record<string, string[]>>>;
  }): { step: WizardStep; isLast: boolean; next(): boolean; back(): void; goTo(i: WizardStep): void; jumpTo(i: WizardStep): void };
  export function WizardStepper(props: { current: WizardStep; onJump?: (i: WizardStep) => void }): JSX.Element;
  ```

- [ ] **Step 1: Write failing tests.** `validateStep(0, EMPTY_FORM)` returns messages for `latitude` (`Hãy chọn vị trí trên bản đồ.`), `ward_id` (`Vui lòng chọn phường.`), `address` (`Vui lòng nhập địa chỉ.`) and is `{}` for a filled step; `validateStep(1, ...)` checks title 5-200 characters, type present, price 100000-100000000, area 5-1000; steps 2 and 3 always `{}`. `stepOfField`: `ward_id`→0, `address`→0, `latitude`→0, `title`→1, `price`→1, `area_m2`→1, `images`→2, `description`→3, `amenity_ids`→3, unknown→null. `useWizardSteps`: `next()` on an invalid step returns false, stays, and calls `setErrors` with the messages; on a valid step it advances and clears errors; `back()` never validates and never goes below 0; `goTo(i)` only allows `i <= step` when creating, any `i` when `isEdit`; `jumpTo(i)` always moves; `isLast` true on step 3. `WizardStepper`: shows 4 labels, ✓ on completed steps, current step has `aria-current="step"`, completed steps are buttons that call `onJump`.
- [ ] **Step 2: Run** `npx vitest run src/features/landlord/lib/wizardModel.test.ts src/features/landlord/hooks/useWizardSteps.test.ts src/features/landlord/components/landlord-form/WizardStepper.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement** the three files and trim `BasicsSection`. Stepper uses plate blue for done/current, per mockup.
- [ ] **Step 4: Run** the same command and `npm run typecheck`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(web): mô hình wizard, kiểm tra từng bước và thanh bước`.

---

### Task 9: Assemble the wizard page, review step, e2e

**Files:**
- Create: `components/landlord-form/ReviewSummary.tsx`
- Modify: `pages/LandlordForm.tsx`, `apps/web/e2e/design/landlord-form.spec.ts`
- Test: `pages/LandlordForm.test.tsx` (new), `components/landlord-form/ReviewSummary.test.tsx`

**Interfaces:**
- Consumes: everything above. `ReviewSummary({ form }: { form: ListingFormApi })` shows the cover (first new file thumbnail, else first existing image), title, price formatted like the dashboard cards (find the shared formatter via `grep -rn "/tháng" apps/web/src`), area, ward name and photo count.

- [ ] **Step 1: Write failing tests** for `LandlordForm` (mock `useListingForm` pieces or the API layer, following the existing landlord page tests): renders the stepper and only the current step; `Tiếp tục` on an empty step 1 stays and shows the errors; pressing Enter in the title input on step 2 moves to step 3 and does **not** call `createListing`; step 4 shows `ReviewSummary` and the `Đăng tin` button (`Lưu thay đổi` in edit mode), and submitting calls `handleSubmit` once; when `errors` gains `{ ward_id: [...] }` while on step 4, the page jumps to step 1 and the message is visible; `Quay lại` keeps entered values; the title has no `<mark>`. `ReviewSummary`: shows title, formatted price, `3 ảnh`.
- [ ] **Step 2: Run** `npx vitest run src/features/landlord/pages/LandlordForm.test.tsx src/features/landlord/components/landlord-form/ReviewSummary.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement** the page. Form `onSubmit`: if not `isLast`, `preventDefault()` then `next()`; else `handleSubmit`. A `useEffect` on `form.errors` picks the smallest step from `stepOfField` of its keys and calls `jumpTo` when the current step is not among them. Footer: step 1 `Hủy`, others `Quay lại`; non-last `Tiếp tục →` (`type="button"` calling `next`), last `type="submit"`. Step order: `LocationStep`, `BasicsSection`, `PhotosStep`, `DescriptionSection` + `ReviewSummary`. Delete the unused code (old `LocationSection`, `ExistingPhotos`, `PhotoDropzone`) if any import remains.
- [ ] **Step 4: Update the e2e spec** `landlord-form.spec.ts` to the wizard flow (city/ward live on step 1 now; photo picking uses two successive `setInputFiles`-style picks and expects `2/5`; never press `Đăng tin`). Run `npx playwright test e2e/design/landlord-form.spec.ts` when the demo stack is up; if it is not available, say so in the report instead of claiming it passed.
- [ ] **Step 5: Run** `npm run typecheck && npm run lint && npx vitest run`. Expected: all PASS, no `knip` regressions (`npm run knip`).
- [ ] **Step 6: Commit** `feat(web): trang đăng tin mới dạng wizard 4 bước`.

---

### Task 10: Repo hygiene and final check

**Files:**
- Modify: `.gitignore` (add `.superpowers/`)
- Modify: `docs/superpowers/specs/2026-11-13-landlord-new-listing-wizard-design.md` (5.1: "make cover" applies to new photos only, because the API's cover is the oldest image and there is no endpoint to change it)

- [ ] **Step 1: Make both edits.**
- [ ] **Step 2: Run the full checks** from `apps/web`: `npm run typecheck && npm run lint && npm run format:check && npx vitest run`; from `apps/api`: `php artisan test`. Expected: all PASS.
- [ ] **Step 3: Manual smoke** (headless is fine, use Playwright with mocked API like the session's screenshot script, or the demo stack): create flow with two photo picks, address search against live Photon, then one edit flow. Report what was actually run.
- [ ] **Step 4: Commit** `chore: bỏ .superpowers khỏi git, chỉnh spec ảnh bìa`.
