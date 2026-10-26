import { expect, test } from "@playwright/test";

/**
 * Regression guard: cascade chiều dương trên /rooms - phuong TRUOC, truong
 * SAU. Danh sách "Gần trường" chỉ hiện trường thuộc phường đã chọn ở
 * "Bộ lọc" (school.ward.id từ API); đổi phường thì reset trường + bán kính.
 *
 * Assert phần lọc ở LỚP API (response /listings) - không assert theo text
 * card vì seeder bóc tên phường vào title, text-assert sẽ pass ảo.
 */
test.describe("rooms ward -> school cascade", () => {
    test("school list narrows to the chosen ward and resets on ward change", async ({
        page,
    }) => {
        await page.goto("/rooms");

        // City + ward cascade lives in the "Bộ lọc" pill popover.
        await page.getByRole("button", { name: "Bộ lọc", exact: true }).click();
        const citySelect = page.locator("#filter-city");
        const wardSelect = page.locator("#filter-ward");

        // Ward stays disabled until a city is picked (existing cascade).
        await expect(wardSelect).toBeDisabled();
        await citySelect.selectOption({ label: "TP.HCM" });
        await expect(wardSelect).toBeEnabled();

        // Pick a ward with MULTIPLE schools: Phường Linh Trung hosts
        // HCMIU, UIT and NLU (3 schools share the campus ward).
        await wardSelect.selectOption({ label: "Phường Linh Trung" });
        await page.keyboard.press("Escape");

        // The "Gần trường" pill narrows schools to exactly that ward.
        await page.getByRole("button", { name: "Gần trường", exact: true }).click();
        const schoolSelect = page.locator("#filter-school");
        await expect(schoolSelect.locator("option")).toHaveCount(4); // placeholder + 3
        for (const name of ["HCMIU", "UIT", "NLU"]) {
            await expect(schoolSelect.locator(`option:has-text("${name}")`)).toHaveCount(1);
        }
        await expect(
            schoolSelect.locator('option:has-text("HCMUT")'),
        ).toHaveCount(0); // khác phường -> biến mất

        // Placeholder mirrors the cascade state (React controlled select:
        // assert qua value + text, khong qua attribute [selected]).
        await expect(schoolSelect).toHaveValue("");
        await expect(schoolSelect).toContainText("Chọn trường trong phường này");

        // Choosing a school in that ward refetches with school_id set (the
        // hook keeps ward_id too); every returned listing belongs to the
        // school's ward.
        const listingsWithWard = page.waitForResponse((r) =>
            r.url().includes("/listings") && r.url().includes("school_id="),
        );
        const uitVal = await schoolSelect.locator('option:has-text("UIT")').getAttribute("value");
        await schoolSelect.selectOption(uitVal!);
        const res = await listingsWithWard;
        const url = new URL(res.url());
        expect(url.searchParams.get("school_id")).toBeTruthy();
        const body = (await res.json()) as {
            data: Array<{ ward: { id: number; name: string } }>;
        };
        const wardId = url.searchParams.get("ward_id");
        for (const listing of body.data) {
            expect(String(listing.ward?.id)).toBe(wardId);
        }

        // Radius select appears only after a school is chosen.
        await expect(page.locator("#filter-radius")).toBeVisible();
        await page.keyboard.press("Escape");

        // Changing the ward resets school + radius (cascade hygiene).
        await page.getByRole("button", { name: "Bộ lọc", exact: true }).click();
        await wardSelect.selectOption({ label: "Phường Chợ Quán" });
        await page.keyboard.press("Escape");
        await page.getByRole("button", { name: "Gần trường", exact: true }).click();
        await expect(schoolSelect).toHaveValue("");
        for (const name of ["HCMUS", "HCMUE", "SGU"]) {
            await expect(schoolSelect.locator(`option:has-text("${name}")`)).toHaveCount(1);
        }
        await expect(schoolSelect.locator('option:has-text("UIT")')).toHaveCount(0);
        await page.keyboard.press("Escape");

        // Reset returns to the pristine cascade (ward disabled again).
        await page.getByRole("button", { name: "Bộ lọc", exact: true }).click();
        await page.getByRole("button", { name: "Đặt lại" }).click();
        await expect(wardSelect).toBeDisabled();
        await expect(wardSelect).toContainText("Chọn Tỉnh/TP trước");
    });
});
