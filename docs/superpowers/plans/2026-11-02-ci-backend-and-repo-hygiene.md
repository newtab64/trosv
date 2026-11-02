# CI Backend Fix, Dependency Bot PR Triage, and Branch Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve the backend CI `composer audit` failure (CVE-2026-45070), triage and merge modern Dependabot PRs against `unstable`, close obsolete legacy bot PRs, and delete all merged/unused branches.

**Architecture:** Approach A (Hotfix PR to `unstable` first to fix `symfony/mime`, followed by sequential triage of active bot PRs in safe dependency batches, ending with repository branch hygiene).

**Tech Stack:** PHP 8.3 / Composer 2 (Laravel), Python 3.12 (FastAPI), Node 22 / npm (React / Vite), GitHub Actions CI, GitHub CLI (`gh`), Git.

**Spec:** `docs/superpowers/specs/2026-11-02-ci-backend-and-repo-hygiene-design.md`

## Global Constraints

- Conventional commit messages in Vietnamese without diacritics.
- Every merge to `unstable` must have all 5 CI jobs green (`ai-service`, `backend`, `frontend`, `secrets`, `e2e`).
- Never delete permanent branches (`unstable`, `stable`, `legacy/pre-restructure`).
- Keep human PR #51 (`be/fix-conversation-test-flaky`) untouched.
- Clean working directory and zero uncommitted files at task completion boundaries.

## Review Focus

1. **`composer.lock` regression**: `composer update symfony/mime` must only bump `symfony/mime` and necessary Symfony dependencies to resolve CVE-2026-45070 without unexpected side-effects.
2. **Backend test suite integrity**: `make test-api` must maintain exactly 223 passing tests (1001 assertions).
3. **CI gate verification**: Dependabot PRs must not be merged unless their CI status is explicitly `success` on `headSha`.
4. **Major version breakages**: Major bumps (e.g. Node 26 in Docker, React 19 / Lucide 1.0) must not break build or Playwright tests.
5. **Branch preservation**: Permanent branches and tags (`cleanup-done`, `layout-moves-done`, `legacy/pre-restructure`, `step4b-done`) must never be deleted.

---

### Task 1: Fix CI Backend (`CVE-2026-45070` in `symfony/mime`)

**Files:**
- Modify: `apps/api/composer.lock`

**Interfaces:**
- Consumes: `unstable` commit `70bfb68`
- Produces: Green CI backend job (`composer audit` passes with 0 vulnerabilities)

- [ ] **Step 1: Check out a new branch from `origin/unstable`**

```bash
git checkout -b fix/composer-audit-mime origin/unstable
```

- [ ] **Step 2: Update `symfony/mime` in `apps/api`**

Run composer update inside container:
```bash
docker compose run --rm -T backend-test composer update symfony/mime --no-interaction
```

- [ ] **Step 3: Verify vulnerability is resolved locally**

```bash
docker compose run --rm -T backend-test composer audit --no-interaction
```
Expected: `No security vulnerability advisories found`.

- [ ] **Step 4: Run backend test suite**

```bash
make test-api
```
Expected: `Tests: 223 passed (1001 assertions)`.

- [ ] **Step 5: Commit changes**

```bash
git add apps/api/composer.lock
git commit -m "fix(api): cap nhat symfony/mime de khac phuc CVE-2026-45070"
```

- [ ] **Step 6: Push branch, create PR to `unstable`, verify CI, and merge**

```bash
git push -u origin fix/composer-audit-mime
gh pr create --base unstable --head fix/composer-audit-mime --title "fix(api): cap nhat symfony/mime de khac phuc CVE-2026-45070" --body "Cap nhat symfony/mime de khac phuc CVE-2026-45070 (Email Header Injection) gay loi composer audit tren CI backend."
```
Wait for all 5 CI checks to pass, then merge:
```bash
gh pr merge --squash --delete-branch
```

---

### Task 2: Close Obsolete Legacy Bot PRs (#39–#42, #45–#49)

**Files:**
- None (GitHub PR & remote branch operations only)

**Interfaces:**
- Consumes: Obsolete PR list (#39, #40, #41, #42, #45, #46, #47, #48, #49)
- Produces: Clean PR list with only modern PRs active

- [ ] **Step 1: Close obsolete PRs with explanation**

For each PR in 39 40 41 42 45 46 47 48 49:
```bash
gh pr close <PR> --comment "Dong PR do duong dan da thay doi theo cau truc monorepo apps/. Cac PR moi da duoc mo thay the." --delete-branch
```

- [ ] **Step 2: Verify closed status**

```bash
gh pr list --state open
```
Expected: PRs #39–#42 and #45–#49 no longer appear.

---

### Task 3: Triage and Merge Modern Dependabot PRs (#60–#73)

**Files:**
- Modifies workflows, dependencies across `apps/api`, `apps/ai-service`, `apps/web`

**Interfaces:**
- Consumes: Green `unstable` base from Task 1
- Produces: Updated dependencies with passing CI on `unstable`

- [ ] **Step 1: Batch 1 - GitHub Actions updates (#60, #61, #63)**
  - Rebase if needed: `gh pr comment 60 --body "@dependabot rebase"` (and for 61, 63).
  - Check CI: `gh pr checks 60`, `gh pr checks 61`, `gh pr checks 63`.
  - When green: merge each via `gh pr merge <PR> --squash --delete-branch`.

- [ ] **Step 2: Batch 2 - AI-service updates (#65, #67, #68)**
  - Rebase if needed: PRs #65, #67, #68.
  - Run `make test-ai` locally if needed.
  - When CI passes: merge via `gh pr merge <PR> --squash --delete-branch`.

- [ ] **Step 3: Batch 3 - Backend Composer updates (#64, #66)**
  - Rebase if needed: PRs #64, #66.
  - When CI passes: merge via `gh pr merge <PR> --squash --delete-branch`.

- [ ] **Step 4: Batch 4 - Web updates (#62, #69, #70, #71, #72, #73)**
  - Check minor-and-patch updates (#69, #70, #73): rebase and merge when green.
  - Check major upgrades:
    - #71 (`lucide-react` 0.545 -> 1.65.0): verify no broken icons or export errors.
    - #72 (`react` 18 -> 19): if tests/build break on React 19, keep open or flag for review.
    - #62 (`node` 22 -> 26 in Docker): verify Docker frontend build.

---

### Task 4: Clean Up Merged Stage Branches and Unused Refs

**Files:**
- None (Git branch operations)

**Interfaces:**
- Consumes: Local and remote branch lists
- Produces: Pristine git tree containing only permanent branches and active work

- [ ] **Step 1: Delete local merged stage branches**

```bash
git checkout unstable
git pull origin unstable
git branch -D ai/tests-and-layout be/refactor-routes-requests be/refactor-services chore/leftovers chore/smoke-script chore/test-api-container fe/cleanup-unused-deps fe/refactor-structure refactor/pro-layout 2>/dev/null || true
```

- [ ] **Step 2: Delete remote merged stage branches**

```bash
git push origin --delete ai/tests-and-layout be/refactor-routes-requests be/refactor-services chore/leftovers chore/smoke-script chore/test-api-container fe/cleanup-unused-deps fe/refactor-structure refactor/pro-layout 2>/dev/null || true
```

- [ ] **Step 3: Prune remote tracking branches and verify**

```bash
git remote prune origin
git branch -a
```
Expected: Only `unstable`, `stable`, `legacy/pre-restructure`, and `be/fix-conversation-test-flaky` remain.
