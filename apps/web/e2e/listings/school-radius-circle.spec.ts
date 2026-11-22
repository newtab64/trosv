import { expect, test, type Page } from "@playwright/test";

const map = (page: Page) => page.getByTestId("map").first();

/** Circle and school-centre pixel geometry, measured in the map. */
async function geometry(page: Page) {
  return map(page).evaluate((el) => {
    const circle = el.querySelector(".trosv-school-radius");
    const centre = el.querySelector(".trosv-school-center");
    if (!circle || !centre) return null;
    const c = circle.getBoundingClientRect();
    const s = centre.getBoundingClientRect();
    return {
      radiusKm: Number(el.getAttribute("data-school-radius-km")),
      width: c.width,
      height: c.height,
      dx: Math.abs(c.left + c.width / 2 - (s.left + s.width / 2)),
      dy: Math.abs(c.top + c.height / 2 - (s.top + s.height / 2)),
    };
  });
}

test.describe("school radius on the map", () => {
  test.use({ viewport: { width: 1366, height: 900 } });

  test("a blue circle around the school follows the chosen radius", async ({ page }) => {
    await page.goto("/rooms?school_id=41&max_km=3&sort=distance");
    await expect(map(page).locator(".trosv-school-radius")).toBeVisible();

    const three = await geometry(page);
    expect(three).not.toBeNull();
    expect(three!.radiusKm).toBe(3);
    // Centred on the school and round.
    expect(three!.dx).toBeLessThanOrEqual(2);
    expect(three!.dy).toBeLessThanOrEqual(2);
    expect(Math.abs(three!.width - three!.height)).toBeLessThanOrEqual(2);
    const fill = await map(page)
      .locator(".trosv-school-radius")
      .evaluate((p) => getComputedStyle(p).fillOpacity);
    expect(Number(fill)).toBeGreaterThan(0);
    expect(Number(fill)).toBeLessThan(0.4);

    // Change the radius in the "Gần trường" filter: the circle follows.
    await page.getByRole("button", { name: /^Gần trường$/ }).click();
    await page
      .getByRole("group", { name: "Bán kính" })
      .getByRole("button", { name: "1 km" })
      .click();
    await expect(map(page)).toHaveAttribute("data-school-radius-km", "1");
    const one = await geometry(page);
    expect(one!.radiusKm).toBe(1);
    expect(one!.dx).toBeLessThanOrEqual(2);
  });

  test("no circle without a school", async ({ page }) => {
    await page.goto("/rooms");
    await expect(map(page).locator(".trosv-pin, .trosv-cluster-wrap").first()).toBeVisible();
    await expect(map(page).locator(".trosv-school-radius")).toHaveCount(0);
  });
});
