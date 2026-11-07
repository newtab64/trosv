# Tech debt audit and elimination plan (2026-11-07)

Scope: `apps/web`, `apps/api`, `apps/ai-service`, CI, docs, repo hygiene.
Method: static analysis run for real, not estimated (knip, jscpd, ESLint complexity / size
rules, PHPStan level max baseline breakdown, vulture, radon, `npm/composer outdated`, grep
sweeps, repo inspection). Numbers below are measured on `unstable` at `5ba2c63` + PR #76.

This replaces the numbers in `docs/reports/TECH-DEBT.md`, whose "0 High / health 60" figures
come from a pattern scanner that counted import blocks as 1,490 "duplicates" and depends on a
gitignored tool. Treat that file as superseded (see item R1).

## Summary

| Area | Verdict | Biggest problem |
|---|---|---|
| Frontend structure | **High debt** | God components: `RoomDetail` is 397 lines at cyclomatic complexity 64 |
| Frontend data layer | **High debt** | No data layer: 29 files fetch in `useEffect`, 16 swallowed errors |
| Frontend types | Medium | 32 `as` casts, 10 of them `as unknown as` |
| Frontend dead code | Low | 16 unused exports, 1 unused dev dependency, 2 unused assets |
| Backend typing | **High debt** | 382 PHPStan findings frozen in a baseline |
| Backend structure | Medium | Queries in 5 controllers, raw SQL inside the `Listing` model |
| AI service | Low | `gemini.py` is 477 lines; 3 functions at complexity 12-13 |
| Tests | Medium | E2E only, depends on seeded data; no unit tests for logic |
| Dependencies | Medium | React 18, Vite 6, Laravel 12, PHPUnit 11 are all one major behind |
| Docs / repo hygiene | Low-Medium | Stale register and reports, stale remote branches |

Nothing found is a release blocker or a security emergency. The debt is mostly
"too big to change safely", which is what will slow the next features.

---

## Findings

Severity = how much it slows or endangers future work. Effort: S under 1 day, M 1-3 days,
L about a week.

### Frontend (`apps/web`)

**F1. God components and hooks. Severity: High. Effort: L.**
25 functions exceed 120 lines and 18 exceed complexity 12 (limits used by the scan). Worst:

| File | Function | Lines | Complexity |
|---|---|---|---|
| `pages/RoomDetail.tsx` | `RoomDetail` | 397 | 64 |
| `pages/messages/MessageBubble.tsx` | `MessageBubble` | 305 | 47 |
| `pages/ConversationDetail.tsx` | `Thread` | 410 | 35 |
| `pages/Profile.tsx` | `Profile` | 260 | 32 |
| `pages/messages/RoomPreviewCard.tsx` | `RoomPreviewCard` | 216 | 31 |
| `pages/Search.tsx` | `Search` | 358 | 23 |
| `pages/LandlordForm.tsx` | `LandlordForm` | 370 | 14 |
| `components/SchoolCombobox.tsx` | `SchoolCombobox` | 285 | 15 |
| `hooks/useListingForm.ts` | `useListingForm` | 190 | 17 |
| `hooks/useListingSearch.ts` | `useListingSearch` | 176 | n/a |

Why it matters: every change here risks regressions the e2e suite catches late, and two of
the bugs fixed this week (search URL not updating, scroll restore race) lived in exactly these
files. `RoomDetail` and `Search` were already split partly (`pages/room/*`, `pages/search/*`);
the split stopped halfway.

**F2. No data-fetching layer. Severity: High. Effort: L.**
29 files use `useEffect`, many to fetch. Each re-implements loading/error/cancel
(`let live = true` pattern). 16 places swallow errors with `.catch(() => {})`, for example
`useListingForm.ts:71-77` (cities/wards/amenities silently empty on failure),
`useConversationRealtime.ts:62`, `Home.tsx`. A failed request shows an empty UI, not an error.

**F3. Type escapes. Severity: Medium. Effort: M.**
32 `as` casts; 10 are `as unknown as`: Echo channels (`useConversationRealtime.ts:42`,
`ConversationDetail.tsx:142`), Leaflet internals (`ListingMap.tsx:62,183,187`,
`LandlordForm.tsx:448-453` reaching into `el._map`), and a fake `ChangeEvent`
(`LandlordForm.tsx:54`). Strict mode is on, but these bypass it exactly where bugs hide.

**F4. Dead code and unused API surface. Severity: Low. Effort: S.**
knip results:
- Unused exports (16): `createReview`, `AuthArt`, `DistanceBadge`, `makePinIcon`,
  `MapController`, `route`, `formatDateTime`, `HERO_WORDS`, `EMOJIS`, `getBubbleRadius`,
  `resolveAttachmentUrl`, `isImageAttachment`, `RADIUS_OPTIONS`, `FilterPill`,
  `buttonVariants`, `DialogPortal`, `DialogOverlay`, `Label`, `PopoverAnchor`, `PRICE_STEP`.
  `MessagesEmptyIllustration` is exported from both `ui/icons.tsx` and `ui/illustrations.tsx`.
- Unused exported types (34), almost all `*Props` interfaces. Harmless; decide a policy.
- Unused dev dependency: `@types/geojson`.
- Unreferenced assets: `public/trosv-logo-cream.svg`, `public/trosv-mark.svg`.

**F5. `ui/illustrations.tsx`: 757 lines, 10 internal clones. Severity: Low-Medium. Effort: M.**
Hand-copied SVG fragments inside one file (jscpd: lines 134-144, 170-190, 284-330 repeated
at 458-504, 560-594). Large inline SVG in a JS bundle also costs bytes.

**F6. Config and platform smells. Severity: Low. Effort: S.**
- `vite.config.ts`: `minify` and `terserOptions` sit at the top level, so Vite ignores them.
  The intended `drop_console` / `drop_debugger` is not applied (dead config, false sense of safety).
- `cacheDir: "/tmp/trosv-vite-cache"` is a sandbox workaround baked into shared config.
- 3 `eslint-disable` (two `exhaustive-deps`, one jsx-a11y in `MessageBubble`).
- Auth token and user in `localStorage` (14 uses). This is accepted in
  `docs/architecture/0001-bearer-token-in-localstorage.md`, but it stays the largest XSS
  blast radius. `dangerouslySetInnerHTML` appears once (`ui/avatar.tsx`), fed by trusted
  constants, so it is fine today but worth a comment-level guard.
- Sidebars/pages still contain 11 inline `style={{}}` uses (some legitimate, e.g. dynamic widths).

**F7. Test gaps. Severity: Medium. Effort: M.**
- 126 Playwright tests, **zero unit tests**. Pure logic (`lib/format`, price-range clamping,
  filter/URL mapping in `useListingSearch`, `isFormDirty`, avatar mapping) is only covered
  through the browser, which is slow and was the source of this week's flakes.
- E2E is not hermetic: it needs a seeded dev database and asserts on seed data
  (7 `test.skip` guards for missing data, 13 `waitForTimeout` in 7 files).
- No visual regression, no accessibility test run (axe) despite `jsx-a11y` lint.

**F8. Outdated dependencies. Severity: Medium. Effort: M-L.**
React 18.3 (19.3 available), Vite 6 (8 available), `@vitejs/plugin-react` 4 (6), TypeScript 5.6
(5.9 within range, 7.0 latest), `@types/react` 18 (19). Patch lag: Tailwind 4.3.3→4.3.5,
Playwright 1.64→1.65, lucide 1.65→1.70. `npm audit` is clean for production dependencies.

### Backend (`apps/api`)

**B1. 382 PHPStan findings frozen in `phpstan-baseline.neon`. Severity: High. Effort: L.**
Top files: `ListingFilterService` 17, `ListingDetailResource` 17, `ConversationResource` 17,
`ListingController` 15, `ListingSummaryResource` 14, `AreaRecommender` 13, `Listing` model 13.
Root causes, in order of count:
1. Resources return `array` with no shape (`toArray()` return types, `broadcastWith()`),
   and read relations as `mixed`/`Model`.
2. Models have no `@property` / relation generics (`Cannot access property $id on mixed`,
   `undefined property $name`, generic traits not parameterised).
3. `mixed` from request input flows into typed services (`Cannot cast mixed to int/float`).
4. Middleware `handle()` closures untyped; `Eloquent\Builder` used without generics.
Fixing causes 1-3 removes most of the baseline, so it is far fewer than 382 separate edits.

**B2. Structure: logic in controllers and models. Severity: Medium. Effort: M.**
- Queries inside 5 controllers: `ConversationController` (179 lines, the largest PHP file),
  `FavoriteController`, `MessageDeletionController`, `ReferenceController`, `AuthController`.
- Raw SQL for distance lives in the model (`Listing::DISTANCE_SQL`, `DB::raw`, `whereRaw`)
  next to filter code in `ListingFilterService::orderByRaw`: the geo logic is split in two places.
- `Services/Ai/*` mix HTTP calls, heuristics and DB reads.

**B3. Tests. Severity: Low-Medium. Effort: S.**
- Two untouched Laravel boilerplate tests: `tests/Unit/ExampleTest.php` (asserts `true`) and
  `tests/Feature/ExampleTest.php`. Dead.
- Several 450-600 line feature test files (`AiProxyTest`, `ConversationTest`,
  `LandlordListingTest`) with repeated setup; no shared builders beyond factories.
- No coverage measurement, so "tested" is unknown.

**B4. Outdated: Laravel 12 → 13, PHPUnit 11 → 12, intervention/image patch. Severity: Medium. Effort: M.**

**B5. Policies.** `MessagePolicy` looked unreferenced to a text search, but it is used through
`$user->can('unsend', ...)`. Not dead; no action. Recorded so nobody deletes it.

### AI service (`apps/ai-service`)

**A1. `gemini.py` is 477 lines with three functions at complexity 12-13
(`recommend_areas_with_gemini`, `rank_roommates_with_gemini`, `chat_with_gemini`). Severity: Low-Medium. Effort: M.**
Same request/parse/fallback plumbing repeated per endpoint. vulture's other findings
(route handlers, pydantic `model_config`) are false positives; `GEMINI_MODEL` at
`gemini.py:31` is assigned but looks unused beyond config (verify, then remove or use).
Tests: one 355-line contract file.

### Repo, docs, process

**R1. Stale reports. Severity: Low-Medium. Effort: S.**
`docs/reports/TECH-DEBT.md` is auto-generated, relies on a gitignored `.agents` tool and
reports misleading numbers; `PLAN.md` and `BACKEND-AUDIT-REPORT.md` predate the current code.
`docs/superpowers/{plans,specs}` keeps growing with no index or retention rule.

**R2. Stale branches. Severity: Low. Effort: S.**
`origin/legacy/pre-restructure` and a leftover `origin/ci/strict` ref remain; one open
Dependabot-style PR (`fix(api): xu ly race condition ...`) is waiting.

**R3. Language mix. Severity: Low. Effort: M, optional.**
Comments, commit messages, docs and UI mix English, Vietnamese with diacritics and Vietnamese
without diacritics. Pick one for code comments (suggest English) and one for docs.

**R4. Bus factor.** 44 of the recent commits come from a single author; reviews are
effectively self-review. Process debt, not code.

---

## Elimination plan

Principle: make debt impossible to grow first (ratchets), then pay it down in order of
"unblocks the most", never as a big-bang rewrite. Every phase ends green CI.

### Phase 0 (about 1 day): stop the bleeding and clear the easy wins

1. Delete dead code (F4): unused exports, `@types/geojson`, 2 unused SVGs, the duplicate
   `MessagesEmptyIllustration`, both Laravel `ExampleTest` files (B3), `GEMINI_MODEL` if unused.
2. Fix `vite.config.ts` placement of `minify`/`terserOptions` (F6) after deciding whether
   `drop_console` is wanted; drop the sandbox `cacheDir` from shared config.
3. Add **knip** to the web CI job (fails on new unused exports/files/deps).
4. Add **ratchets**: ESLint `complexity` (error at 20 → lower each phase), `max-lines-per-function`
   with a per-file allowlist that can only shrink; fail if `phpstan-baseline.neon` grows
   (CI compares line count to `origin/unstable`).
5. Prune stale remote branches (R2); mark `docs/reports/TECH-DEBT.md` superseded by this file (R1).
6. Patch-level dependency bumps (Tailwind, Playwright, lucide, intervention/image).

Exit: knip clean, ratchets in CI, no behaviour change.

### Phase 1 (about 1 week): fix the root causes that multiply

1. **Backend typing (B1)**: add `@property`/relation docblocks (or `larastan` model generics)
   to all models; give API Resources typed array shapes; validate request input into typed
   values at the FormRequest boundary (`->validated()` typed accessors). Target: baseline
   from 382 to under 100, ratchet down. This also makes the OpenAPI-style contract checkable.
2. **Frontend data layer (F2)**: introduce TanStack Query (or a thin typed `useApi` hook
   if you prefer zero new deps) and migrate the 29 effect-fetching sites, starting with
   `useListingForm` reference data and `Home`. Replace every `.catch(() => {})` with a
   deliberate decision: show an error, or log and degrade explicitly. Target: no swallowed catch.
3. **Frontend unit tests (F7)**: add Vitest + Testing Library for pure logic first
   (`format`, `price-range`, filter ⇄ URL mapping, `isFormDirty`, avatar key mapping).
   Run in CI before e2e.

Exit: baseline under 100, no swallowed catches, unit suite in CI.

### Phase 2 (2 weeks): shrink the god components, behind the safety net

Order by risk x pain, one PR each, no behaviour changes, e2e + unit green:

1. `RoomDetail` (cc 64): extract `useRoomContact`, `useRoomAdvice`, `RoomFacts`, `RoomReviews`.
2. `MessageBubble` (cc 47) and `Thread` (cc 35): extract attachment, reaction and unsend
   handling into hooks; make bubble variants a lookup table instead of nested conditionals.
3. `Profile` (cc 32) and `useListingForm` (cc 17): a form reducer + per-section components.
4. `Search` (358) and `SearchFilterBar` (217): move filter state into one typed object
   shared with `useListingSearch`.
5. `LandlordForm`, `SchoolCombobox`, `HobbySelector`: split view from state.

Alongside, resolve F3: typed wrappers for Echo channels and Leaflet (`ListingMap`,
`LandlordForm` map), and replace the fake `ChangeEvent` with a proper value setter.

Exit: no function over 150 lines or complexity 20; the allowlist is empty or near empty.

### Phase 3 (1-2 weeks): backend structure and AI service

1. Controllers become thin: move queries from the 5 controllers into services / query objects
   (start with `ConversationController` 179 lines). Put distance/geo SQL in one `GeoQuery`
   class used by both `Listing` and `ListingFilterService` (B2).
2. Add backend coverage reporting (pcov) with a floor, and split the 600-line test files by
   feature with shared builders (B3).
3. `gemini.py`: extract one `call_model(prompt, schema, fallback)` helper; split the module per
   endpoint under `app/gemini/`; drive complexity under 10 (A1).
4. Illustrations (F5): move large scenes to `.svg` files under `public/art` or split by
   scene; remove the cloned fragments.

### Phase 4 (as capacity allows): upgrades and hygiene

1. Dependency majors, one at a time, each its own PR: TypeScript 5.9, React 19 +
   `@types/react` 19 + plugin-react, Vite 7/8, Laravel 13, PHPUnit 12. Dependabot already
   opens the minor/patch PRs; majors need a human.
2. Make e2e hermetic: a dedicated seed fixture and API isolation so tests stop depending on
   the dev database; replace the 13 `waitForTimeout` with condition waits; add an axe
   accessibility pass over the main pages.
3. Language policy (R3), prune/index `docs/superpowers`, replace `TECH-DEBT.md` with a short
   living register generated from the ratchet numbers in CI (R1).

## Tracking

Make debt visible so it cannot silently return. Suggested CI summary lines (per PR):
PHPStan baseline size, count of functions over the complexity/size limits, knip findings,
outdated majors. All are cheap to compute and already available from the tools above.

| Metric | Today | Phase 0 | Phase 1 | Phase 2 | Phase 3 |
|---|---|---|---|---|---|
| PHPStan baseline entries | 382 | 382 (frozen) | < 100 | < 50 | < 20 |
| Frontend functions > 120 lines | 25 | 25 (frozen) | 22 | < 8 | 0 |
| Functions over complexity 12 | 18 | frozen | 16 | < 6 | 0 |
| knip findings | 51 | 0 | 0 | 0 | 0 |
| Swallowed `.catch(() => {})` | 16 | 16 | 0 | 0 | 0 |
| `as unknown as` casts | 10 | 10 | 8 | 0 | 0 |
| Frontend unit tests | 0 | 0 | 60+ | 100+ | 100+ |

## Not debt (checked, fine)

- TypeScript is strict with `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`; no `any`, `@ts-ignore`, or non-null assertions in `src`.
- No `TODO`/`FIXME`/`console.log`/`dd()`/`dump()` left in source.
- Duplicate code outside `illustrations.tsx` is negligible (jscpd: 0.23% of lines).
- Dependencies: no known vulnerabilities in production (npm, Composer, pip-audit).
- Rate limiting exists on auth and messaging routes.
