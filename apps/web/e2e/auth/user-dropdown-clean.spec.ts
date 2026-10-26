import { test, expect } from '@playwright/test';

test('user dropdown panel only contains profile and logout', async ({ page }) => {
  // Login as student
  await page.goto('/login');
  await page.fill('input[type="email"]', 'student1@example.com');
  await page.fill('input[type="password"]', 'password');
  await page.click('button[type="submit"]');

  await page.waitForURL(/\/($|\?)/);

  // Click profile picture / account menu trigger
  const menuTrigger = page.getByRole('button', { name: 'Menu tài khoản' });
  await expect(menuTrigger).toBeVisible();
  await menuTrigger.click();

  const menu = page.getByRole('menu');
  await expect(menu).toBeVisible();

  // Verify "Hồ sơ" and "Đăng xuất" are present
  await expect(menu.getByText('Hồ sơ')).toBeVisible();
  await expect(menu.getByText('Đăng xuất')).toBeVisible();

  // Verify "Yêu thích", "Tin nhắn", and theme mode items are NOT present
  await expect(menu.getByText('Yêu thích')).toHaveCount(0);
  await expect(menu.getByText('Tin nhắn')).toHaveCount(0);
  await expect(menu.getByText('Chế độ')).toHaveCount(0);
  await expect(menu.getByText('Quản lý tin đăng')).toHaveCount(0);

  // Toggle dark mode via the header ThemeToggle
  await page.keyboard.press('Escape'); // close menu
  const themeToggle = page.locator('header button[aria-label*="Chuyển sang chế độ"]').first();
  await themeToggle.click();
  await page.waitForTimeout(300);

  // Re-open user menu in dark mode
  await menuTrigger.click();
  await expect(menu).toBeVisible();

  // Verify only 2 menu items exist in the menu
  const items = menu.locator('[role="menuitem"]');
  expect(await items.count()).toBe(2);
});
