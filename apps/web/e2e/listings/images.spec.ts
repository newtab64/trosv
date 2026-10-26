import { expect, test } from "@playwright/test";

/**
 * Regression guard: cover_image must load through the SAME ORIGIN the page
 * is served from.
 *
 * Bug that motivates this (fixed in the nginx template): in same-origin mode
 * (VITE_API_URL=/api) the backend builds image URLs from its APP_URL, so the
 * browser requested /storage/*.jpg on the page's origin - but nginx only
 * proxied /api/ and the .jpg fell into the static-asset location -> 404,
 * while API smoke and TLS-mode (Caddy) stayed green. This spec fails fast on
 * that signature: image requests returning 404/HTML, or images that never
 * decode.
 *
 * In cross-origin setups (CI: backend :8000 + preview :4173) the same checks
 * still catch URL-generation drift (dead host/path) and undecodable payloads.
 */
test.describe("listing images", () => {
    test("cover_image returns 200 image/* through the page origin", async ({ page }) => {
        await page.goto("/");

        // Seeded data guarantees every listing has one generated image.
        const imgs = page.locator("img[src*='/storage/']");
        await expect(imgs.first()).toBeVisible({ timeout: 10_000 });

        const sources = await imgs.evaluateAll((els) =>
            els.map((e) => (e as HTMLImageElement).src),
        );
        expect(sources.length, "expected at least one /storage/ image").toBeGreaterThan(0);

        // Probe a sample through HTTP: must not 404 (the regression signature)
        // and must really be an image, not the SPA shell or an error page.
        for (const src of sources.slice(0, 5)) {
            const res = await page.request.get(src);
            expect(res.status(), `GET ${src}`).toBeLessThan(400);
            expect(res.headers()["content-type"] ?? "", `content-type of ${src}`).toMatch(
                /^image\//,
            );
        }

        // Browser-real check: at least one image actually decoded pixels
        // (a 200 HTML response would pass the probes above but fail here).
        await expect
            .poll(
                () =>
                    imgs.evaluateAll((els) =>
                        (els as HTMLImageElement[]).some((e) => e.naturalWidth > 0),
                    ),
                { timeout: 10_000 },
            )
            .toBe(true);
    });
});
