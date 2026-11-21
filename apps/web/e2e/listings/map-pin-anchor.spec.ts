import { expect, test, type Page } from "@playwright/test";

/*
 * Leaflet positions each marker element at (point - iconAnchor). A pin is accurate when the
 * visible tip lands exactly on that point; if not, it seems to slide while zooming.
 */
async function tipOffsets(page: Page): Promise<number[]> {
  return page.evaluate(() => {
    const out: number[] = [];
    for (const wrap of document.querySelectorAll<HTMLElement>(
      ".trosv-pin-wrap, .trosv-cluster-wrap",
    )) {
      const box = wrap.getBoundingClientRect();
      // Leaflet sets margin-left/top to -iconAnchor, so the geographic point is box - margin.
      const style = getComputedStyle(wrap);
      const point = {
        x: box.left - parseFloat(style.marginLeft),
        y: box.top - parseFloat(style.marginTop),
      };
      const tipEl = wrap.querySelector<HTMLElement | SVGElement>("[data-tip]");
      if (!tipEl) {
        out.push(999);
        continue;
      }
      const t = tipEl.getBoundingClientRect();
      const tip = { x: t.left + t.width / 2, y: t.bottom };
      out.push(Math.hypot(tip.x - point.x, tip.y - point.y));
    }
    return out;
  });
}

test.describe("map pins", () => {
  test.use({ viewport: { width: 1366, height: 900 } });

  test("price pins and cluster pins point exactly at their location at every zoom", async ({
    page,
  }) => {
    await page.goto("/rooms?city_id=1");
    const map = page.getByTestId("map").first();
    await expect(map.locator(".trosv-pin, .trosv-cluster-wrap").first()).toBeVisible();

    for (let zoomIn = 0; zoomIn < 3; zoomIn++) {
      if (zoomIn > 0) {
        await page.locator(".leaflet-control-zoom-in").first().click();
        await page.waitForTimeout(600);
      }
      const offsets = await tipOffsets(page);
      expect(offsets.length).toBeGreaterThan(0);
      expect(Math.max(...offsets)).toBeLessThanOrEqual(1.5);
    }
  });

  test("clusters are red location pins showing the count", async ({ page }) => {
    await page.goto("/rooms");
    const cluster = page.locator(".trosv-cluster").first();
    await expect(cluster).toBeVisible();
    await expect(cluster).toHaveText(/^\d+$/);
    const fill = await page.locator(".trosv-cluster-wrap svg path").first().getAttribute("fill");
    expect(fill?.toUpperCase()).toBe("#EA4335");
    // The count must be painted on top of the pin, not hidden behind it.
    const onTop = await cluster.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
    });
    expect(onTop).toBe(true);
  });
});
