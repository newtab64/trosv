import { expect, test } from "@playwright/test";

test.describe("searching by school", () => {
  test.use({ viewport: { width: 1366, height: 900 } });

  test("picking a school on the home page shows only rooms near it, nearest first", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("searchbox", { name: "Tìm phòng" }).fill("DUT");
    await page
      .getByRole("link", { name: /\(DUT\)/ })
      .first()
      .click();

    await expect(page).toHaveURL(/school_id=\d+/);
    await expect(page).toHaveURL(/max_km=3/);
    await expect(page).toHaveURL(/sort=distance/);
    await expect(page.getByRole("button", { name: "Gần trường nhất" })).toBeVisible();

    const cards = page.locator('[data-testid^="listing-card-"]');
    await expect(cards.first()).toBeVisible();
    const total = Number(
      (
        await page
          .getByText(/\d+ kết quả/)
          .first()
          .textContent()
      )?.match(/(\d+) kết quả/)?.[1],
    );
    expect(total).toBeGreaterThan(0);
    expect(total).toBeLessThan(22);

    // Every card shows its distance to the school, and none is farther than 3 km.
    const kms = await cards.evaluateAll((els) =>
      els.map((el) => {
        const m = el.textContent.match(/([\d,]+) km/);
        return m ? Number(m[1]!.replace(",", ".")) : NaN;
      }),
    );
    expect(kms.every((km) => km <= 3)).toBe(true);
  });
});
