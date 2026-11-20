import { expect, test } from "@playwright/test";

/**
 * Filter cascade on /rooms:
 * - "Khu vực" manages city & ward.
 * - "Gần trường" is disabled until city is chosen.
 * - Once city is chosen, schools in that city are listed (not restricted by ward).
 */
test.describe("rooms ward -> school cascade", () => {
  test("school list narrows to the chosen ward and resets on ward change", async ({ page }) => {
    await page.goto("/rooms");

    const nearSchoolBtn = page.getByRole("button", { name: "Gần trường", exact: true });
    await expect(nearSchoolBtn).toBeDisabled();

    // City + ward cascade lives in the "Khu vực" pill popover.
    await page.getByRole("button", { name: "Khu vực", exact: true }).click();
    const citySelect = page.locator("#filter-city");
    const wardSelect = page.locator("#filter-ward");

    // Ward stays disabled until a city is picked.
    await expect(wardSelect).toBeDisabled();
    await citySelect.selectOption({ label: "TP.HCM" });
    await expect(wardSelect).toBeEnabled();
    await page.keyboard.press("Escape");

    // "Gần trường" becomes enabled once city is chosen.
    await expect(nearSchoolBtn).toBeEnabled();
    await nearSchoolBtn.click();
    const schoolSelect = page.locator("#filter-school");
    for (const name of ["HCMIU", "UIT", "HCMUT"]) {
      await expect(schoolSelect.locator(`option:has-text("${name}")`)).toHaveCount(1);
    }
    await expect(schoolSelect).toHaveValue("");
    await expect(schoolSelect).toContainText("Chọn trường đại học");

    const listingsWithWard = page.waitForResponse(
      (r) => r.url().includes("/listings") && r.url().includes("school_id="),
    );
    const uitVal = await schoolSelect.locator('option:has-text("UIT")').getAttribute("value");
    await schoolSelect.selectOption(uitVal);
    const res = await listingsWithWard;
    const url = new URL(res.url());
    expect(url.searchParams.get("school_id")).toBeTruthy();

    await expect(page.locator("#filter-radius")).toBeVisible();
    await page.keyboard.press("Escape");

    // Changing the ward keeps school + radius (decoupled from ward).
    await page.getByRole("button", { name: "Khu vực", exact: true }).click();
    await wardSelect.selectOption({ label: "Phường Chợ Quán" });
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Gần trường", exact: true }).click();
    await expect(schoolSelect).toHaveValue(uitVal ?? "");
    await page.keyboard.press("Escape");

    // Reset returns to the pristine cascade (ward & near school disabled again).
    await page.getByRole("button", { name: "Khu vực", exact: true }).click();
    await page.getByRole("button", { name: "Đặt lại" }).click();
    await expect(wardSelect).toBeDisabled();
    await page.keyboard.press("Escape");
    await expect(nearSchoolBtn).toBeDisabled();
  });
});