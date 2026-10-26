import { defineConfig, devices } from "@playwright/test";

// CI-grade smoke suite (docs/reports/PLAN.md Phase 1). Feature-grouped specs in
// e2e/ (npm run test:e2e); this is what CI runs.
//
// Requires the demo stack to be up (API :8000 + Vite :5173), e.g.:
//   bash infra/deploy/deploy.sh --quick
// Overridable in CI: E2E_BASE_URL / E2E_API_URL.

const baseURL = process.env.E2E_BASE_URL || "http://localhost:5173";

export default defineConfig({
    testDir: "./e2e",
    timeout: 30_000,
    expect: { timeout: 10_000 },
    // One shared dev stack - parallel workers would fight over the same data.
    fullyParallel: false,
    workers: 1,
    retries: process.env.CI ? 1 : 0,
    reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
    use: {
        baseURL,
        trace: "retain-on-failure",
        locale: "vi-VN",
    },
    projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
