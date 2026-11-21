import { expect, test, type Page } from "@playwright/test";

/** Resolves any CSS colour syntax (oklab, color-mix...) to sRGB inside the page. */
async function contrastAgainstNavy(page: Page, selectorFn: () => Promise<string>): Promise<number> {
  return page.evaluate(
    (indicator) => {
      const px = (css: string): [number, number, number] => {
        const c = document.createElement("canvas").getContext("2d")!;
        c.fillStyle = css;
        c.fillRect(0, 0, 1, 1);
        const [r = 0, g = 0, b = 0] = c.getImageData(0, 0, 1, 1).data;
        return [r, g, b];
      };
      const lum = ([r, g, b]: [number, number, number]) => {
        const f = (v: number) => {
          const c = v / 255;
          return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
        };
        return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
      };
      const ratio = (a: [number, number, number], b: [number, number, number]) => {
        const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x) as [number, number];
        return (hi + 0.05) / (lo + 0.05);
      };
      const ind = px(indicator);
      return Math.min(ratio(ind, px("#17479e")), ratio(ind, px("#123b86")));
    },
    await selectorFn(),
  );
}

/** Colour of the visible focus indicator (outline, else the first box-shadow colour). */
async function focusIndicatorColor(target: ReturnType<Page["locator"]>): Promise<string> {
  await target.focus();
  // Let colour transitions settle: measure what a user actually sees.
  await target.evaluate(() => new Promise((resolve) => setTimeout(resolve, 400)));
  return target.evaluate((el) => {
    const s = getComputedStyle(el);
    if (s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0) return s.outlineColor;
    const m = s.boxShadow.match(/(rgba?|oklab|oklch|color)\([^)]*\)/);
    return m ? m[0] : "rgba(0,0,0,0)";
  });
}

test.describe("review fixes", () => {
  test("room lightbox covers the site header", async ({ page }) => {
    await page.setViewportSize({ width: 1360, height: 900 });
    await page.goto("/rooms/1"); // exists in every seed (old 48 rooms, new 22)
    await page.getByRole("button", { name: "Xem ảnh lớn" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    const covered = await page.evaluate(() => {
      const top = document.elementFromPoint(300, 20);
      return top?.closest('[role="dialog"]') !== null;
    });
    expect(covered).toBe(true);
  });

  test("focus is visible on navy surfaces (contrast of at least 3:1)", async ({ page }) => {
    await page.setViewportSize({ width: 1360, height: 900 });
    const check = async (target: ReturnType<Page["locator"]>, label: string) => {
      const ratio = await contrastAgainstNavy(page, () => focusIndicatorColor(target));
      expect(ratio, label).toBeGreaterThanOrEqual(3);
    };

    await page.goto("/rooms");
    await check(page.getByLabel("Tìm theo khu vực"), "strip input");
    await check(page.getByRole("button", { name: "Bộ lọc", exact: true }), "filter pill");
  });

  test("browser Back returns to the previous scroll position", async ({ page }) => {
    await page.setViewportSize({ width: 1360, height: 900 });
    await page.goto("/rooms");
    const cards = page.locator('[data-testid^="listing-card-"]');
    await expect(cards.nth(5)).toBeVisible();
    await page.evaluate(() => {
      window.scrollTo(0, 700);
    });
    // Playwright scrolls the target into view before clicking; measure after that.
    await cards.nth(4).scrollIntoViewIfNeeded();
    const before = await page.evaluate(() => window.scrollY);
    expect(before).toBeGreaterThan(150);
    await cards.nth(4).click();
    await expect(page).toHaveURL(/\/rooms\/\d+/);
    await page.goBack();
    await expect(page).toHaveURL(/\/rooms$/);
    await expect(cards.nth(5)).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => window.scrollY), { timeout: 5000 })
      .toBeGreaterThan(before - 150);
  });

  test("Back still restores the position when the list loads slowly", async ({ page }) => {
    await page.setViewportSize({ width: 1360, height: 900 });
    let requests = 0;
    await page.route("http://localhost:8000/api/listings**", async (route) => {
      requests += 1;
      // First load is instant; the return trip is slow.
      if (requests > 2) await new Promise((r) => setTimeout(r, 3000));
      await route.continue();
    });
    await page.goto("/rooms");
    const cards = page.locator('[data-testid^="listing-card-"]');
    await expect(cards.nth(5)).toBeVisible();
    await page.evaluate(() => {
      window.scrollTo(0, 700);
    });
    await cards.nth(4).scrollIntoViewIfNeeded();
    const before = await page.evaluate(() => window.scrollY);
    expect(before).toBeGreaterThan(150);
    await cards.nth(4).click();
    await expect(page).toHaveURL(/\/rooms\/\d+/);
    await page.goBack();
    await expect(cards.nth(5)).toBeVisible({ timeout: 10_000 });
    await expect
      .poll(() => page.evaluate(() => window.scrollY), { timeout: 8000 })
      .toBeGreaterThan(before - 150);
  });

  test("scrolling by hand cancels a pending restore", async ({ page }) => {
    await page.setViewportSize({ width: 1360, height: 900 });
    let requests = 0;
    await page.route("http://localhost:8000/api/listings**", async (route) => {
      requests += 1;
      if (requests > 2) await new Promise((r) => setTimeout(r, 2500));
      await route.continue();
    });
    await page.goto("/rooms");
    const cards = page.locator('[data-testid^="listing-card-"]');
    await expect(cards.nth(5)).toBeVisible();
    await page.evaluate(() => {
      window.scrollTo(0, 700);
    });
    await cards.nth(4).click();
    await expect(page).toHaveURL(/\/rooms\/\d+/);
    await page.goBack();
    await expect(page).toHaveURL(/\/rooms$/);
    // Let the restore start listening for input before the user "takes over"
    // (a wheel fired before that is not seen, which made this test flaky on slow runners).
    await page.waitForTimeout(300);
    // The user takes over immediately: the pending restore must not fight them.
    await page.mouse.move(600, 400);
    await page.mouse.wheel(0, 1);
    await page.waitForTimeout(100);
    const atTakeover = await page.evaluate(() => window.scrollY);
    await expect(cards.nth(5)).toBeVisible({ timeout: 10_000 });
    await page.waitForTimeout(500);
    const afterLoad = await page.evaluate(() => window.scrollY);
    // The invariant: once the user has taken over, the late restore never moves the page again.
    expect(Math.abs(afterLoad - atTakeover)).toBeLessThanOrEqual(5);
  });
});
