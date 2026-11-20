import { expect, test } from "@playwright/test";

test.describe("search strip", () => {
  test.use({ viewport: { width: 1360, height: 900 } });

  test("filters live in a slim navy strip above the map and list", async ({ page }) => {
    await page.goto("/rooms");
    const strip = page.locator('[data-testid="plate-band"][data-size="strip"]');
    await expect(strip).toBeVisible();
    await expect(strip.getByLabel("Tìm theo khu vực")).toBeVisible();
    await expect(strip.getByRole("button", { name: "Khu vực" })).toBeVisible();

    const s = await strip.boundingBox();
    expect(s!.height).toBeLessThanOrEqual(80);

    const map = page.locator(".leaflet-container").first();
    await expect(map).toBeVisible();
    const m = await map.boundingBox();
    // Result-count row sits between the strip and the map; the map must stay close.
    expect(m!.y - (s!.y + s!.height)).toBeLessThanOrEqual(80);
  });

  test("the strip stays reachable while scrolling the list", async ({ page }) => {
    await page.goto("/rooms");
    const strip = page.locator('[data-testid="plate-band"][data-size="strip"]');
    await expect(strip).toBeVisible();
    const position = await strip.evaluate((el) => getComputedStyle(el).position);
    expect(position).toBe("sticky");
  });
});
