# Design: Fix CI Backend, Process Dependency Bot PRs, and Clean Up Unused Branches

**Date:** 2026-11-02  
**Topic:** Repository Maintenance & CI Reliability  
**Target Base:** `unstable`  

---

## 1. Intent and Why
Restore full CI green health across the monorepo, upgrade dependencies cleanly via Dependabot, and eliminate repository clutter (stale branches and obsolete PRs) following the completed merge of `refactor/pro-layout` (PR #50).

---

## 2. Goals, Non-Goals, and Anti-Goals
- **Goals:**
  - Fix the CI backend failure on `unstable` caused by `CVE-2026-45070` in `symfony/mime`.
  - Close 9 obsolete pre-restructure Dependabot PRs (#39–#42, #45–#49) referencing nonexistent `/backend` or `/frontend` paths.
  - Triage, test, and merge safe modern Dependabot PRs (#60–#73) against a green `unstable` base.
  - Delete local and remote branches for completed stages and obsolete bots.
- **Non-Goals:**
  - Touching PR #51 (`be/fix-conversation-test-flaky`), which is an active human PR.
  - Modifying application architecture or breaking public API contracts.
- **Anti-Goals:**
  - Blindly merging major breaking package upgrades without CI validation.
  - Deleting permanent branches (`unstable`, `stable`, `legacy/pre-restructure`).

---

## 3. Constraints
- Strict conventional commits (Vietnamese without diacritics).
- Every merge to `unstable` must have all 5 CI checks green (`ai-service`, `backend`, `frontend`, `secrets`, `e2e`).
- Docker commands must run cleanly without damaging local volumes.

---

## 4. Approaches Considered
- **Approach A (Selected): Dedicated Hotfix Branch & PR into `unstable`**
  - Fix `symfony/mime` via dedicated branch `fix/composer-audit-mime`, open PR into `unstable`, merge after full CI passes. Once green, rebase and evaluate Dependabot PRs sequentially.
  - *Tradeoff:* Requires one PR lifecycle first, but guarantees an unbroken CI audit trail and isolates the security fix.
- **Approach B: Direct Commit to `unstable`**
  - Push the lockfile update directly to `unstable`.
  - *Tradeoff:* Faster, but bypasses PR branch protection and CI gate verification.
- **Approach C: Fix via Dependabot PR #64**
  - Push the `symfony/mime` bump into Dependabot's branch.
  - *Tradeoff:* Conflates multiple package upgrades with a targeted CVE fix, making rollbacks harder.

---

## 5. Execution Plan (The How)

### Phase 1: Fix CI Backend (`CVE-2026-45070`)
1. Create branch `fix/composer-audit-mime` from `origin/unstable`.
2. Update `symfony/mime` to `^7.4.22` in `apps/api/composer.lock` (`composer update symfony/mime`).
3. Verify locally: `composer audit` clean, `make test-api` (223 passed).
4. Commit: `fix(api): cap nhat symfony/mime de khac phuc CVE-2026-45070`.
5. Open PR to `unstable`, verify CI (5/5 checks green), and merge.

### Phase 2: Bot PR Triage
1. **Close Obsolete PRs (#39–#42, #45–#49):** Close with a note that paths were superseded by the `apps/` restructure.
2. **Evaluate Active Dependabot PRs (#60–#73):**
   - CI Actions bumps (#60, #61, #63): Safe, merge if green.
   - Minor/patch bumps in `apps/ai-service` (#65, #67, #68): Test and merge.
   - Minor/patch bumps in `apps/api` (#64, #66): Test and merge.
   - Web bumps (#62, #69–#73): Review breaking changes (e.g., node 26, lucide major), test locally, merge safe subsets.

### Phase 3: Branch Cleanup
1. **Delete merged stage branches (Local & Remote):**
   - `ai/tests-and-layout`
   - `be/refactor-routes-requests`
   - `be/refactor-services`
   - `chore/leftovers`
   - `chore/smoke-script`
   - `chore/test-api-container`
   - `fe/cleanup-unused-deps`
   - `fe/refactor-structure`
   - `refactor/pro-layout`
2. **Delete remote stale Dependabot branches** associated with closed PRs.
3. Preserve `unstable`, `stable`, `legacy/pre-restructure`, and `be/fix-conversation-test-flaky`.

---

## 6. What's Left to the Builder
- Running local tests (`make test-api`, `make test-ai`, Playwright, smoke script) for each dependency PR batch.
- Handling any merge conflicts or test failures triggered by major package updates.
