import { expect, test, type Page } from "@playwright/test";
import { LANDLORD, loginAs } from "./helpers";

// Read-only: these specs never press "Đăng tin", so they never write to the demo database.

/** Chooses `count` tiny images in the file input, the way the browser would. */
async function pickPhotos(page: Page, count: number, prefix = "photo"): Promise<void> {
  await page.locator('input[type="file"]').evaluate(
    (input: HTMLInputElement, [n, p]: [number, string]) => {
      const files = new DataTransfer();
      for (let i = 0; i < n; i++) {
        files.items.add(new File(["x"], `${p}-${String(i)}.png`, { type: "image/png" }));
      }
      input.files = files.files;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    },
    [count, prefix] as [number, string],
  );
}

const next = (page: Page) => page.getByRole("button", { name: /Tiếp tục/ }).click();

/** Step 1: pin on the map, city, ward and address, then on to step 2. */
async function fillLocation(page: Page): Promise<void> {
  await page
    .getByTestId("coordinate-picker")
    .locator(".leaflet-container")
    .click({
      position: { x: 120, y: 90 },
    });
  await page.locator("#lf-city").selectOption({ index: 1 });
  await page.locator("#lf-ward").selectOption({ index: 1 });
  await page.locator("#lf-address").fill("12 Đường số 5");
  await next(page);
}

/** Step 2: the main facts, then on to step 3. */
async function fillInfo(page: Page): Promise<void> {
  await page.locator("#lf-title").fill("Phòng thử nghiệm");
  await page.locator("#lf-price").fill("2500000");
  await page.locator("#lf-area").fill("20");
  await next(page);
}

test.describe("landlord listing form (wizard)", () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test.beforeEach(async ({ page }) => {
    await loginAs(page, LANDLORD);
    await page.goto("/landlord/new");
    await expect(page.getByRole("heading", { level: 1, name: "Đăng tin mới" })).toBeVisible();
  });

  test("the ward list waits for a city, follows it, and resets when it changes", async ({
    page,
  }) => {
    const ward = page.locator("#lf-ward");
    await expect(ward).toBeDisabled();

    const city = page.locator("#lf-city");
    await city.selectOption({ label: "TP.HCM" });
    await expect(ward).toBeEnabled();
    const hcmWards = await ward.locator("option").count();
    expect(hcmWards).toBeGreaterThan(1);

    await ward.selectOption({ index: 1 });
    await expect(ward).not.toHaveValue("");

    await city.selectOption({ index: 2 });
    await expect(ward).toHaveValue("");
  });

  test("'Tiếp tục' stays on the step and explains what is missing", async ({ page }) => {
    await next(page);
    await expect(page.getByRole("heading", { level: 2, name: "Phòng ở đâu?" })).toBeVisible();
    await expect(page.getByText("Vui lòng chọn phường.")).toBeVisible();
  });

  test("an amenity chip toggles on and off", async ({ page }) => {
    await fillLocation(page);
    await fillInfo(page);
    await next(page);
    const chip = page
      .locator("fieldset")
      .filter({ hasText: "Tiện ích" })
      .getByRole("button")
      .first();
    await expect(chip).toHaveAttribute("aria-pressed", "false");
    await chip.click();
    await expect(chip).toHaveAttribute("aria-pressed", "true");
    await chip.click();
    await expect(chip).toHaveAttribute("aria-pressed", "false");
  });

  test("clicking the map drops a pin and shows its coordinates", async ({ page }) => {
    const picker = page.getByTestId("coordinate-picker");
    await picker.scrollIntoViewIfNeeded();
    await expect(picker.locator(".leaflet-container")).toBeVisible();
    await expect(page.getByText("Chưa chọn vị trí")).toBeVisible();
    await picker.locator(".leaflet-container").click({ position: { x: 120, y: 90 } });

    await expect(page.getByText("Chưa chọn vị trí")).toHaveCount(0);
    await expect(picker.locator(".leaflet-marker-icon")).toHaveCount(1);
  });

  test("typing in other fields does not reset the map you already picked on", async ({ page }) => {
    const picker = page.getByTestId("coordinate-picker");
    await picker.scrollIntoViewIfNeeded();
    await picker.locator(".leaflet-container").click({ position: { x: 120, y: 90 } });
    await expect(picker.locator(".leaflet-marker-icon")).toHaveCount(1);

    await page.locator("#lf-address").fill("12 Đường số 5");

    await expect(picker.locator(".leaflet-marker-icon")).toHaveCount(1);
    await expect(page.getByText("Chưa chọn vị trí")).toHaveCount(0);
  });

  test("the coordinate fields stay hidden until asked for", async ({ page }) => {
    await expect(page.locator("#lf-lat")).toHaveCount(0);
    await page.getByRole("button", { name: "Nhập tọa độ thủ công" }).click();
    await expect(page.locator("#lf-lat")).toBeVisible();
    await expect(page.locator("#lf-lng")).toBeVisible();
  });

  test("photos picked in several rounds add up, and the limit trims the rest", async ({ page }) => {
    await fillLocation(page);
    await fillInfo(page);
    await expect(page.getByRole("heading", { level: 2, name: "Ảnh" })).toBeVisible();

    await pickPhotos(page, 2, "first");
    await expect(page.getByText("2/5 ảnh")).toBeVisible();
    await pickPhotos(page, 2, "second");
    await expect(page.getByText("4/5 ảnh")).toBeVisible();

    await pickPhotos(page, 3, "third");
    await expect(page.getByText("5/5 ảnh")).toBeVisible();
    await expect(page.getByRole("alert")).toContainText("Chỉ còn chỗ cho 1 ảnh");

    await page.getByRole("button", { name: "Xóa ảnh 1" }).click();
    await expect(page.getByText("4/5 ảnh")).toBeVisible();
  });

  test("reaching the last step does not save the listing", async ({ page }) => {
    let saved = false;
    await page.route("**/api/listings", (route) => {
      if (route.request().method() === "POST") saved = true;
      return route.continue();
    });
    await fillLocation(page);
    await fillInfo(page);
    await next(page);
    await expect(page.getByRole("button", { name: "Đăng tin" })).toBeVisible();
    await page.waitForTimeout(500);
    expect(saved).toBe(false);
  });

  test("editing shows the status select and the existing photos", async ({ page, request }) => {
    const { token } = (await loginAs(page, LANDLORD)) as { token: string };
    const res = await request.get("http://localhost:8000/api/my/listings", {
      headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
    });
    const first = ((await res.json()) as { data: { id: number; title: string }[] }).data[0];
    test.skip(first === undefined, "the seeded landlord has no listing");

    await page.goto(`/landlord/edit/${String(first?.id)}`);
    await expect(page.getByRole("heading", { level: 1, name: "Sửa tin đăng" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Phòng ở đâu?" })).toBeVisible();

    await page.getByRole("button", { name: /Thông tin/ }).click();
    await expect(page.locator("#lf-title")).toHaveValue(first?.title ?? "");

    await page.getByRole("button", { name: /Ảnh/ }).click();
    await expect(page.getByRole("heading", { level: 2, name: "Ảnh" })).toBeVisible();

    await page.getByRole("button", { name: /Mô tả/ }).click();
    await expect(page.locator("#lf-status")).toBeVisible();
    await expect(page.getByRole("button", { name: "Lưu thay đổi" })).toBeVisible();
  });
});
