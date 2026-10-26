import { expect, test } from "@playwright/test";

/**
 * Regression guard: the user dropdown in the header (Hồ sơ / Phòng yêu
 * thích / Đăng xuất) must paint ABOVE the sticky landlord contact card
 * on RoomDetail.
 *
 * Old bug: the navbar and the card both carried Bootstrap z-index 1020;
 * the later-in-DOM card painted over the open menu. The redesign keeps
 * the same contract: the header is `z-30` and the Radix dropdown renders
 * in a portal at `z-50`, so the open menu must be topmost everywhere its
 * rectangle overlaps the card.
 *
 * The menu's rectangle intentionally OVERLAPS the card's rectangle - what
 * matters is paint order, probed with document.elementFromPoint: at every
 * sampled point inside the open menu, the topmost element must belong to
 * the menu (that is what a user's click would hit).
 */
test.describe("header user dropdown", () => {
    test("open menu paints above the sticky contact card", async ({ page }) => {
        // Login as the seeded student (the user button only renders when
        // logged in).
        await page.goto("/login");
        await page.locator("#login-email").fill("student1@example.com");
        await page.locator("#login-password").fill("password");
        await page.getByRole("button", { name: "Đăng nhập" }).click();
        await expect(page.getByRole("button", { name: "Menu tài khoản" })).toBeVisible();

        // RoomDetail is where the sticky contact card lives.
        await page.goto("/rooms");
        await page.locator('[data-testid^="listing-card-"]').first().click();
        const card = page.locator('[data-testid="contact-card"]');
        await expect(card).toBeVisible();

        // Open the user menu.
        const trigger = page.getByRole("button", { name: "Menu tài khoản" });
        await trigger.click();
        const menu = page.getByRole("menu");
        await expect(menu).toBeVisible();
        await expect(menu).toContainText("Đăng xuất");

        // Behavioral probe: at sampled points inside the open menu
        // (inset past the rounded corners), the topmost paintable element
        // must be the menu or one of its children. Before the fix this
        // returned the contact card in the overlap region.
        const box = await menu.boundingBox();
        if (!box) {
            throw new Error("menu off-viewport");
        }
        const menuBottom = box.y + box.height;
        const covered = await page.evaluate(
            (pts) => {
                const menuEl = document.querySelector('[role="menu"]');
                if (!menuEl) return ["menu not in DOM"];
                const hits: string[] = [];
                for (const p of pts) {
                    if (p.x < 0 || p.y < 0) continue;
                    if (p.x > window.innerWidth || p.y > window.innerHeight) continue;
                    const el = document.elementFromPoint(p.x, p.y);
                    if (!el) {
                        hits.push(`nothing at ${p.x},${p.y}`);
                    } else if (el !== menuEl && !menuEl.contains(el)) {
                        hits.push(`${el.tagName}.${el.className} at ${p.x},${p.y}`);
                    }
                }
                return hits;
            },
            [
                { x: box.x + box.width / 2, y: box.y + box.height / 2 },
                { x: box.x + 8, y: box.y + 8 },
                { x: box.x + box.width - 8, y: box.y + 8 },
                { x: box.x + 8, y: menuBottom - 8 },
                { x: box.x + box.width - 8, y: menuBottom - 8 },
            ],
        );
        expect(
            covered,
            `menu must be topmost at every sampled point (covered by: ${covered.join("; ")})`,
        ).toEqual([]);
    });
});
