import { expect, test } from "@playwright/test";

/**
 * Regression guard: stale credentials (token wiped server-side by a reseed,
 * or any 401) must never trap the SPA in a reload loop on /login.
 *
 * Bug: the 401 interceptor removed only `token` from localStorage and then
 * hard-navigated to /login - which reloads the page even when /login is
 * already open. The stale `user` object survived in localStorage, Navbar
 * fired an authenticated call without a token, got 401, redirected to
 * /login again... infinite reload loop exactly as reported.
 *
 * Repro: plant a token + user (user WITHOUT a real token - as after
 * clearToken), open /login, count page loads.
 */
test.describe("stale credentials on /login", () => {
    test("no reload loop when a stale user sits in localStorage", async ({ page }) => {
        await page.addInitScript(() => {
            localStorage.setItem(
                "user",
                JSON.stringify({
                    id: 999,
                    name: "Stale User",
                    email: "stale@example.com",
                    role: "student",
                }),
            );
            // No `token` key - exactly the state clearToken() leaves behind.
        });

        let loads = 0;
        page.on("load", () => {
            loads += 1;
        });

        await page.goto("/login", { waitUntil: "load" });
        // Give any pathological redirect chain 2.5s to spin.
        await page.waitForTimeout(2500);

        // A reload loop would reload continuously; healthy page loads once.
        expect(loads, "page must not reload in a loop").toBeLessThanOrEqual(2);

        // The login form must actually be usable.
        await expect(page.locator("#login-email")).toBeVisible();
        await expect(page.locator("#login-password")).toBeVisible();
    });

    test("login succeeds and lands on the app despite stale storage", async ({ page }) => {
        await page.addInitScript(() => {
            localStorage.setItem(
                "user",
                JSON.stringify({
                    id: 999,
                    name: "Stale User",
                    email: "stale@example.com",
                    role: "student",
                }),
            );
        });

        await page.goto("/login");
        await page.locator("#login-email").fill("student1@example.com");
        await page.locator("#login-password").fill("password");
        await page.getByRole("button", { name: "Đăng nhập" }).click();

        // Successful login replaces the stale user and shows the app chrome.
        await expect(
            page.getByRole("button", { name: "Menu tài khoản" }),
        ).toBeVisible({ timeout: 10_000 });
        const stored = await page.evaluate(() => localStorage.getItem("user"));
        expect(stored && JSON.parse(stored).email).toBe("student1@example.com");
    });
});
