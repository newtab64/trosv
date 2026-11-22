import { expect, test } from "@playwright/test";

/**
 * "Gần trường" is a type-to-search school picker: no city or ward first.
 * The ward filter in "Bộ lọc" stays independent: changing it keeps the
 * school and radius (asserted on the /listings request, not card text).
 */
test.describe("near-school picker", () => {
  test("type a school without picking a city or ward first", async ({ page }) => {
    await page.goto("/rooms");
    await page.getByRole("button", { name: "Gần trường", exact: true }).click();

    // No city / ward selects in this pill any more.
    await expect(page.locator("#near-school-city")).toHaveCount(0);
    await expect(page.locator("#near-school-ward")).toHaveCount(0);

    // Accent-free typing narrows the list to the Bách Khoa schools only.
    await page.getByRole("button", { name: /Tìm theo tên trường/ }).click();
    await page.getByPlaceholder(/Gõ tên trường/).fill("bach khoa");
    const options = page.getByRole("button", { name: /Bách [Kk]hoa/ });
    await expect(options.first()).toBeVisible();
    await expect(page.getByRole("button", { name: /\(UEH\)/ })).toHaveCount(0);

    const picked = page.waitForResponse(
      (r) => r.url().includes("/listings") && r.url().includes("school_id="),
    );
    await page.getByRole("button", { name: /\(DUT\)/ }).click();
    const url = new URL((await picked).url());
    expect(url.searchParams.get("max_km")).toBe("3");
    expect(url.searchParams.get("sort")).toBe("distance");

    // Radius is a row of buttons; 3 km is on by default.
    const radius = page.getByRole("group", { name: "Bán kính" });
    await expect(radius.getByRole("button", { name: "3 km" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    const wider = page.waitForResponse(
      (r) => r.url().includes("/listings") && r.url().includes("max_km=5"),
    );
    await radius.getByRole("button", { name: "5 km" }).click();
    await wider;
    await expect(radius.getByRole("button", { name: "5 km" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  test("changing the ward keeps the school and radius", async ({ page }) => {
    // City already chosen (Đà Nẵng = 3); changing the city would reset the school by design.
    await page.goto("/rooms?city_id=3&school_id=41&max_km=2&sort=distance");
    await page.getByRole("button", { name: "Bộ lọc", exact: true }).click();
    const withWard = page.waitForResponse(
      (r) => r.url().includes("/listings") && r.url().includes("ward_id="),
    );
    await page.locator("#filter-ward").selectOption({ index: 1 });
    const url = new URL((await withWard).url());
    expect(url.searchParams.get("school_id")).toBe("41");
    expect(url.searchParams.get("max_km")).toBe("2");
  });
});
