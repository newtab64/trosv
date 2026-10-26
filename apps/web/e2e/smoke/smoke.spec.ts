import { expect, test } from "@playwright/test";

// Seeded demo account (infra/deploy/deploy.sh seed output). Kept in sync with the docs.
const STUDENT = { email: "student1@example.com", password: "password" };

test.describe("smoke", () => {
    test("guests can browse the home feed without logging in", async ({ page }) => {
        await page.goto("/");

        // Guests browse freely; the hero heading is the stable landmark.
        await expect(page.locator("main h1").first()).toBeVisible();

        // The "Mới đăng" row renders real seeded data.
        await expect(page.getByRole("heading", { name: "Mới đăng" })).toBeVisible();
    });

    test("seeded student can log in and see the app", async ({ page }) => {
        await page.goto("/login");

        await page.locator("#login-email").fill(STUDENT.email);
        await page.locator("#login-password").fill(STUDENT.password);
        await page.locator('button[type="submit"]').click();

        // Successful login lands on the home feed.
        await expect(page).toHaveURL(/\/($|\?)/, { timeout: 10_000 });
        await expect(page.locator("header").first()).toBeVisible();
    });

    test("guests hitting a protected route get the sign-in gate", async ({ page }) => {
        // Favorites renders its own signed-out gate (Zillow pattern) instead
        // of a hard redirect - the gate is the bouncing UX now.
        await page.goto("/favorites");
        await expect(page.getByTestId("favorites-gate")).toBeVisible();
    });
});
