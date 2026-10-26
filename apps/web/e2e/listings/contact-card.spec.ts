import { expect, test } from "@playwright/test";

/**
 * Regression guard: the landlord contact card (`[data-testid="contact-card"]`)
 * must always stay BELOW the sticky header while scrolling.
 *
 * Bug (old markup): both elements were Bootstrap `.sticky-top` (z-index
 * 1020); the card slid over the 57px navbar. The redesign keeps the same
 * invariant: the card is `position: sticky` below the fixed-height header,
 * so its top edge must never overlap the header's bottom edge.
 *
 * The invariant is checked in REAL rendered geometry: the card's top edge
 * must always be >= the header's bottom edge, at every scroll depth.
 */
test.describe("room detail sticky contact card", () => {
    test("card stays below the header at every scroll depth", async ({ page }) => {
        await page.goto("/rooms");

        await page.locator('[data-testid^="listing-card-"]').first().click();
        const card = page.locator('[data-testid="contact-card"]');
        const header = page.locator("header").first();
        await expect(card).toBeVisible();
        await expect(header).toBeVisible();

        // Multiple depths: top, several middle positions, page bottom.
        for (const y of [0, 400, 1200, 3000, 99999]) {
            await page.evaluate((v) => window.scrollTo(0, v), y);
            // Sticky offset resolves within the same frame; a rAF wait keeps
            // the measurement deterministic.
            await page.evaluate(() => requestAnimationFrame(() => undefined));

            const nav = await header.boundingBox();
            const box = await card.boundingBox();
            if (!nav || !box) {
                // The card scrolls out of the viewport at extreme depths on
                // short pages - only fail if it should still be pinned.
                if (y < 3000) {
                    throw new Error(`header/card off-viewport at scrollY=${y}`);
                }
                continue;
            }
            const navBottom = nav.y + nav.height;
            expect(box.y, `card must not overlap header at scrollY=${y}`).toBeGreaterThanOrEqual(
                navBottom - 1, // 1px tolerance for subpixel rounding
            );
        }
    });
});
