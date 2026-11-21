# TROSV overview

> **Living document.** Whenever you change structure, routes, endpoints, models,
> env vars, scripts, design tokens or conventions, update the matching section
> **in the same commit**. The API contract (`docs/contracts/API_CONTRACT.md`)
> stays the source of truth for request and response shapes.
>
> Last updated: 2026-11-07

TROSV helps students find rooms near their school. Students browse listings on
a map, save favourites, message landlords in real time and get AI suggestions.
Landlords post and manage listings and reply to students.

## 1. Big picture

```
Browser (React SPA)  ──JSON + Bearer token──▶  Laravel API  ──▶  PostgreSQL
        │                                          │
        └──── WebSocket (Reverb) ◀── events ───────┤
                                                   └──JSON──▶  AI service (FastAPI)
```

- The browser only talks to the API (and to Reverb for live chat). The API calls
  the AI service on the browser's behalf and answers 503 politely if it is down
  (ADR 0002).
- Login uses a Sanctum bearer token kept in `localStorage` (ADR 0001).
- Two roles: `student` and `landlord`. Routes are guarded by `role:` middleware.

## 2. Running it

| What | Where |
|---|---|
| Web (Vite dev, hot reload) | http://localhost:3001 (`cd apps/web && npm run dev`) |
| Web (Docker, production build, serves `/storage`) | http://localhost:3000 |
| API | http://localhost:8000/api |
| AI service (loopback only, not exposed to the network) | http://localhost:8001 |
| Reverb websocket | `:8080` |

`make up` starts the Docker stack (db, backend, frontend, reverb, queue,
scheduler). The AI service is behind a profile: `docker compose --profile ai up -d`.
It runs in `FAKE_MODE` by default (rule-based, no API key). The root `.env` needs
`APP_KEY` and the `REVERB_*` values (see `.env.example`); `SEED_ON_BOOT=1` loads
demo data.

Demo accounts, password `password`: `student1`…`student10@email.com` and
`landlord1`…`landlord3@email.com`. Useful make targets: `test-api`, `lint-api`,
`lint-web`, `build-web`, `check`, `smoke`, `backup`.

## 3. Backend (`apps/api`)

Laravel 12, PHP 8.3, PostgreSQL, Sanctum, Reverb. Tests with Pest/PHPUnit
(`make test-api`); style with Pint. `composer audit` runs in CI, so a newly
published advisory can turn CI red without any code change.

| Area | Endpoints (all under `/api`) |
|---|---|
| Auth, profile | `POST /register`, `/login`, `/logout`; `GET /me`; `PUT /profile` |
| Reference data | `GET /cities`, `/wards`, `/schools`, `/amenities` |
| Listings (public) | `GET /listings`, `/listings/{id}`; reviews `GET/POST /listings/{id}/reviews` |
| Landlord | `GET /my/listings`; `POST/PUT/DELETE /listings`; image upload and delete |
| Student | favorites `GET/PUT/DELETE /favorites…`; `GET /users/{id}` (public profile) |
| Messaging | conversations, messages, read, delete, reactions (see below) |
| AI (proxied) | `POST /ai/roommates`, `/price-advice`, `/area-suggestions`, `/chat`, `/description` |

Messaging rules worth knowing:

- **One conversation per student–landlord pair**, enforced by the unique index
  `conversations_user_pair_unique`. Asking about a second room reuses the thread
  and points it at the latest room (`listing_id`). The API sends a room-link
  message, skipped if the same room was sent in the last 15 minutes.
- `GET /conversations` returns `listing` (latest room), `other_user`,
  `last_message` (`sender_id`, `body`, `created_at`) and `unread_count`.
- Realtime: events `MessageSent`, `MessageSeen`, `MessageReacted`,
  `MessageDeleted` on the private channel `conversation.{id}`. Broadcast failures
  are swallowed so a chat message never fails because of the socket.
- Code is organised by domain module under `app/Modules/<Module>` (see
  "Backend layout" below).

Infrastructure: the `backend` container serves the API with FrankenPHP (Caddy +
PHP, config in `apps/api/docker/`), not `php artisan serve`; the same image runs
`reverb`, `queue` and `scheduler`, all as `www-data`. `queue` and `scheduler` wait for
a healthy `backend` (migrations done). A `queue` container runs `queue:work`. A
`scheduler` container runs `schedule:run` every minute, but **no tasks are scheduled yet**.
`php artisan serve` is for local development only.

### Backend layout

`app/` holds domain modules plus a small shared kernel. A module owns its
models, controllers, requests, resources, policies, events, services and its own
route file; nothing is split by file type across the whole app.

| Module | Owns |
|---|---|
| `Modules/Auth` | `User`, register/login/profile, public student profile |
| `Modules/Reference` | `City`, `Ward`, `School`, `Amenity` and their read endpoints |
| `Modules/Listing` | `Listing`, `ListingImage`, `Review`, browse/detail, landlord CRUD, `ListingPolicy`, filter and image services |
| `Modules/Favorite` | student favorites endpoints |
| `Modules/Messaging` | `Conversation`, `Message`, policies, realtime events, attachments, `ConversationService` |
| `Modules/Ai` | AI proxy endpoints, `AiClient`, recommenders, `AiUnavailableException` |
| `Shared` | base `Controller`, `AuthorizesResources`, middleware (`role`, `throttle.api`, security headers, request id, production guard), `Support` (`Geo`, `GeoQuery`, `StoragePath`), `HealthController` |

Conventions:

- Routes: `routes/api.php` only holds `/health` and loads every
  `app/Modules/*/routes.php`; a module's web routes live in `web.php` beside it.
- Models point at their factory and policy with `#[UseFactory]` / `#[UsePolicy]`
  because Laravel's name-based discovery only works for `App\Models`.
- Tests mirror the modules: `tests/Feature/<Module>/`. Cross-cutting tests
  (authorization matrix, security headers, config guard) are in `tests/Feature/Shared`.
- Migrations, factories and seeders stay in `database/` (one global history).

## 4. AI service (`apps/ai-service`)

FastAPI with `POST /roommates`, `/areas`, `/price-advice`, `/description`,
`/chat` and `GET /health`. No database. `FAKE_MODE=true` returns rule-based
answers in the contract's shape; `false` needs `GEMINI_API_KEY` or `LLM_API_KEY`.
Contract: `docs/contracts/AI_CONTRACT.md`.

Layout (same feature idea as the other apps): `app/features/<name>/` for
`roommates`, `price_advice`, `areas`, `chat`, `description` and `health`. Each
feature has `router.py` (endpoint), `schemas.py` (request model),
`heuristics.py` (rule-based answer used in `FAKE_MODE`) and `gemini.py` (LLM
call). `app/shared/` holds the Gemini client, the `guard_fake` 503 guard,
`BaseReq` and `int_or`. `app/main.py` mounts the routers and owns `FAKE_MODE`
(tests flip it there).

## 5. Frontend (`apps/web`)

React 18, TypeScript (strict), Vite, Tailwind CSS v4, Radix UI, Leaflet, lucide
icons, react-router 7. UI copy is Vietnamese. `npm run build` runs `tsc` first.

Code is organised by feature (domain module), not by file type. Each folder in
`src/features` owns everything for one domain: `pages/` (routed screens),
`components/`, `hooks/`, `api/` (typed calls), `lib/` (pure logic and its tests)
and, where needed, `context/`. Layering is `app` > `features` > `shared`, enforced by ESLint `no-restricted-imports` (`shared/` cannot import `features/` or `app/`; `features/` cannot import `app/`). Importing
another feature is allowed (for example `room` uses `messaging`, `favorites` and
`ai`; most features use `auth` and `listings`) but keep it one-directional: do not
add a feature that imports back into one that already imports it.

| Folder | What is in it |
|---|---|
| `src/app` | router (lazy routes), providers, error boundary, route fallbacks, `NotFound`, `shell` (header, rail, chat widget; composes features) |
| `src/features/auth` | login, register, `AuthContext`, `authApi` |
| `src/features/home` | landing page and its sections |
| `src/features/listings` | shared listing domain: `ListingCard`, `ListingMap`, `listingApi`, `favoritesApi`, reference data (cities, wards, schools, amenities) |
| `src/features/search` | search page, filter bar, filter/URL logic |
| `src/features/room` | room detail page, gallery, reviews, contact card |
| `src/features/favorites` | favorites page (the add/remove calls live in `listings/api/favoritesApi`) |
| `src/features/landlord` | dashboard, listing form, `landlordApi` |
| `src/features/messaging` | inbox, thread, bubbles, realtime hooks, `messagingApi`, `echo.ts` (websocket client) |
| `src/features/profile` | profile, public student page, `HobbySelector`, `SchoolCombobox`, hobby catalogue |
| `src/features/ai` | AI area suggestions, roommate matching, chat widget, `aiApi` |
| `src/shared/ui` | design-system pieces: `button`, `input`, `dialog`, `switch`, `avatar`, `page-header`, `plate-band`… |
| `src/shared/layout` | `Footer` and signed-out `gates` |
| `src/shared/api` | axios client; `envelope.ts` unwraps `{ data, meta }` |
| `src/shared/{hooks,lib,constants,config,types}` | cross-feature hooks, helpers, route/storage constants, env, API types |
| `src/styles.css` | design tokens, motion utilities |

### Design system

- **Tokens** live in `src/styles.css`: a warm cream palette with plate blue
  (`--color-plate`) and flyer yellow (`--color-flyer`) as the accents, olive for
  "good", `--color-bubble` for sent chat messages. The site is light only (no dark mode; `color-scheme: light`). Use token classes (`bg-card`, `text-muted`), not raw hex.
- **Navy band** (`PlateBand`) is reserved for three places: the Home hero, the
  Search filter strip, and the Login/Register art panel. Every other page uses
  `PageHeader`: a plain title on cream.
- **Reference data** (cities, wards, schools, amenities) comes from `hooks/useReferenceData.ts`:
  one shared fetch per kind, with `error` and `reload` instead of silently empty lists.
  Fire-and-forget calls use `ignoreError("name")` from `lib/async.ts`, which logs; never
  `.catch(() => {})`.
- **Price ranges** are one bar with two dots (`ui/price-range.tsx`, two native range
  inputs on one track): 0–10.000.000đ in 100.000đ steps, dots stay a step apart,
  a dot at its end means no limit. Used by the Search filter, AI area
  suggestions and the Profile budget. Values are shown exactly (`2.400.000đ`),
  never rounded to "tr". Landlord form price stays a single number box.
- **Radius scale** is only `xs…xl` (no `2xl`).
- **Motion**: shared utilities in `styles.css` (`motion-stagger`, `motion-enter`,
  `motion-press`, `typing-dot`…). Rules: no endless decorative loops (floating art,
  swaying, pinging halos); loops are only for status (typing dots, the typed-keyword
  caret, skeletons, spinners). Stagger animations use
  `backwards` fill so hover transforms still work; reduced motion removes
  durations and delays globally; nothing may stay hidden if an animation or an
  IntersectionObserver never runs.
- **Illustrations** in `public/art` are SVGs with flat earthy fills and a
  `#17171C` outline. The login/register art (`book-and-fern.svg`,
  `house-and-tree.svg`) is hand-drawn (thick outline, slight displacement
  wobble). The hero doodles are plain white line icons at 10% opacity. The
  signed-out gate arts (`favorites-gate.svg`,
  `inbox-gate.svg`) and the hero drawing (`hero-town.svg`) are the clean variant:
  thin outline, no wobble filter, no paper-grain overlay (it shows as a box on
  the page).

### Behaviour notes

- **Messages**: list with unread pill, filter and "Bạn:" prefix; thread with a
  pinned "latest room" card, card-style incoming bubbles, and students get
  suggested first questions until the landlord replies. `useStickToBottom` keeps
  the thread at the newest message while late content (room previews) loads, but
  never pulls a reader back down.
- **Profile**: one column of collapsible sections (basic, study and budget,
  roommate matching). Hobbies open in a dialog. The save bar appears only when
  something changed.
- **Home** (`/`): a short navy hero with a quiet doodle pattern
  (`public/art/hero-doodles.svg`), the headline "Phòng trọ. Căn hộ." and a
  typed keyword that cycles "Gần trường." → "Giá rẻ." → "Tiện lợi." with a caret
  (`pages/home/TypedWord.tsx`; screen readers get the list once, reduced motion
  shows the first phrase). A small drawing of a colourful town at night
  (`HeroArt`) sits at the right on wide screens (1180px and up); the search bar
  is fully rounded. On phones the description is hidden and the quick-filter
  chips sit in one row that scrolls sideways. Right under the hero, "Mới đăng" is
  one swipeable row of the 8 newest rooms (`NewestRooms`); desktop arrows hide at
  either end. Below it, one
  slim card (`HomeQuickStrip`) holds school chips and four shortcuts, then the
  landlord banner. Rooms must stay reachable without scrolling past tiles, so
  keep new Home sections below that row.
- **Search** (`/rooms`): the list, with the map beside it on wide screens.
  "Ẩn bản đồ" hides the map (it is not mounted, so it loads no tiles) and widens
  the grid; a filter never hides it. On phones the floating button switches
  between list and map. The sort menu closes when the page scrolls: it is
  portalled above the sticky header and filter bar, and handing focus back to its
  button would scroll the page back up.
- **Room page** (`/rooms/:id`): a bento grid. Row 1 is the gallery (big photo,
  arrows, thumbnails) beside the contact card and the AI price tile; then
  colored quick-fact tiles (only facts the API has: area, distance, type, age),
  description + amenities, a map + reviews pair, and "Phòng tương tự gần đó"
  (same ward, 4:3 thumbnails, a swipeable row on phones, from `GET /listings?ward_id=`).
  The contact card scrolls with the page; it must never paint over the header.
- **Avatars**: 12 hand-drawn critters (`cat`, `plant`, `house`, `book`, `coffee`,
  `moon`, `robot`, `cloud`, `sun`, `backpack`, `headphones`, `mushroom`). The key
  lives in `users.avatar`; registration picks one at random, `PUT /profile`
  changes it, and older accounts get a stable fallback from their id
  (`User::avatarKey()`), so the API always sends one. The key is returned on
  `/me`, public profiles, `other_user`, review `student` and listing `landlord`.
  The art is in `src/shared/ui/avatar-art.ts`; `Avatar` falls back to initials when no
  key is given (the AI roommate list has none). The profile header avatar opens
  a picker dialog with a "Ngẫu nhiên" button. To add one, add the key to
  `User::AVATARS` and `AVATAR_KEYS`, and draw it in `avatar-art.ts`.
- **Scroll**: the shell resets scroll on new pages and restores it on Back/Forward.

## 6. Testing and CI

- Frontend: `npm run typecheck`, `npm run lint` (typed `strictTypeChecked`,
  `--max-warnings 0`, covers `src` and `e2e`), `npm run format:check`
  (Prettier, 2 spaces), Vitest unit tests (`npm test`, jsdom, `*.test.ts(x)` next to
  the code: pure logic and hooks) and Playwright e2e (`npm run test:e2e`, needs the API on
  `:8000` and the web app on `:3001`; no retries, a flaky test is a bug). Specs
  in `e2e/design/` mock the messaging API so they never write to the demo
  database; `e2e/design/helpers.ts` has `loginAs`.
- Backend: Pint, PHPStan/Larastan at level `max` (`apps/api/phpstan.neon`; the
  remaining debt (87 findings, down from 382) is frozen in `phpstan-baseline.neon`, so any NEW finding fails;
  shrink the baseline, never grow it), and PHPUnit configured to fail on
  warnings, notices, deprecations, risky tests and stray output.
- Debt ratchets: `eslint.config.js` caps complexity (12) and function length (120)
  for new code and freezes the files that already exceed them at today's worst value
  (lower the number when you refactor, never raise it); a PR may not grow
  `phpstan-baseline.neon`. The plan is in `docs/reports/TECH-DEBT-AUDIT-2026-11.md`.
- AI service: Ruff (lint + format), mypy `--strict`, pytest with every warning
  turned into an error, `pip-audit`.
- CI is zero-tolerance and split by area. `ci.yml` only decides what runs (path
  filters on PRs; pushes and the merge queue run everything) and gates the
  result; the work lives in reusable workflows `_api.yml` (Pint, PHPStan max,
  PHPUnit with a pcov coverage floor, composer audit), `_web.yml` (ESLint, Prettier, tsc, Vitest unit tests with a coverage floor, knip dead-code check, a build that
  fails on warnings, `npm audit`), `_ai.yml` (Ruff, mypy, pytest, pip-audit),
  `_infra.yml` (actionlint, hadolint, shellcheck, `compose config`, image
  builds), `_e2e.yml` (Playwright against the bundle `_web` built, shared as
  an artifact) and `_stack.yml` (starts the real docker compose stack, the thing
  that ships, and runs `scripts/stack-smoke.py` against it: uploads through nginx,
  `/storage`, signed attachments, size limits, and a chat message delivered over
  Reverb; then checks queue/scheduler started without errors; run it locally with
  `make smoke-stack`). Setup is shared through local composite actions in
  `.github/actions/` (PHP, Node, Python; Composer, npm, pip and Playwright
  caches). `ci-ok` is the one check to require in branch protection (skipped
  areas are fine, failed or cancelled ones are not). Also `secrets` (gitleaks),
  `codeql.yml` (SAST, weekly too) and `dependency-review.yml` (PRs; enforced once
  the dependency graph is on and the repo variable `DEPENDENCY_GRAPH=true` is
  set). Workflows run with read-only permissions, pinned action SHAs, job
  timeouts and cancel-on-new-push (never on `stable`). `deploy.yml` deploys only
  a CI-green tip of `stable`, smoke-tests it, and rolls back to the previous
  commit if the smoke test fails.
- Coverage floors are ratchets, set just under the measured value: web unit tests
  (`vite.config.ts`, `npm run test:coverage`: lines 33%) and API (`_api.yml`,
  `php artisan test --coverage --min=96`: measured 97.1%). Raise them when coverage
  rises; never lower them. Web unit coverage excludes the Playwright suite, which
  covers the UI separately.
- Regenerate `apps/api/composer.lock` with the same Composer CI uses (latest 2.x), not an
  older system one. `composer.json` has a `config.policy` section that only newer Composers
  hash, so a lock written by e.g. 2.8 fails CI's `composer validate --strict`. Without a local
  PHP 8.3 + current Composer: `docker run --rm -u $(id -u):$(id -g) -e COMPOSER_HOME=/tmp
  -v "$PWD/apps/api:/app" -w /app composer:2 update` (or `update --lock` to refresh the hash only).
- Known gotchas: seed photos are served from the Docker web container on `:3000`
  (`e2e/listings/images.spec.ts` fails without it).

## 7. Working agreements

- Feature branches come from `unstable` and merge back after green CI. `stable`
  (production) only takes a pull request from `unstable` (see `CONTRIBUTING.md`).
- Commits are authored as the person making them, with **no AI attribution lines**.
- Change the API → update `docs/contracts/API_CONTRACT.md` and this file.

## 8. Where to read more

`README.md` (setup), `docs/ONBOARDING.md`, `docs/contracts/` (API, AI, ERD),
`docs/architecture/` (ADRs), `docs/runbooks/` (deploy, demo, rollback),
`apps/web/README.md`, `apps/ai-service/README.md`.
