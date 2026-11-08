import { expect, test } from "@playwright/test";
import { LANDLORD, loginAs } from "./helpers";

// Read-only: the delete dialog is opened and cancelled, never confirmed.

test.describe("landlord dashboard", () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test.beforeEach(async ({ page }) => {
    await loginAs(page, LANDLORD);
    await page.goto("/landlord");
    await expect(page.getByRole("heading", { level: 1, name: "Quản lý tin đăng" })).toBeVisible();
    // Rows load after the header: wait for them so the counts below start from the real list.
    await expect(page.getByTestId("listing-row").first()).toBeVisible();
  });

  test("lists the landlord's rooms with a status pill, price and actions", async ({ page }) => {
    const row = page.getByTestId("listing-row").first();
    await expect(row.getByRole("link", { name: "Xem tin" })).toBeVisible();
    await expect(row.getByRole("button", { name: "Sửa" })).toBeVisible();
    await expect(row.getByTestId("delete-listing")).toBeVisible();
    await expect(row).toContainText(/đ\/tháng/);
    await expect(row).toContainText(/Còn trống|Đã thuê|Ẩn|Mới/);
  });

  test("the count in the header matches the rows shown", async ({ page }) => {
    const count = await page.getByTestId("listing-row").count();
    await expect(page.getByText(`${String(count)} tin`)).toBeVisible();
  });

  test("a status chip filters the list", async ({ page }) => {
    const all = await page.getByTestId("listing-row").count();
    await page.getByRole("button", { name: "Ẩn", exact: true }).click();
    await expect.poll(async () => page.getByTestId("listing-row").count()).toBeLessThanOrEqual(all);
    await page.getByRole("button", { name: "Tất cả" }).click();
    await expect.poll(async () => page.getByTestId("listing-row").count()).toBe(all);
  });

  test("delete asks first, and cancelling keeps the room", async ({ page }) => {
    const before = await page.getByTestId("listing-row").count();
    await page.getByTestId("delete-listing").first().click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toContainText("Xóa tin đăng?");
    await dialog.getByRole("button", { name: "Giữ lại" }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByTestId("listing-row")).toHaveCount(before);
  });

  test("Sửa opens the edit form for that room", async ({ page }) => {
    await page.getByRole("button", { name: "Sửa" }).first().click();
    await expect(page).toHaveURL(/\/landlord\/edit\/\d+/);
  });
});
