import { test, expect } from '@playwright/test';

test('chat panel automatically opens at the latest message', async ({ page }) => {
  // 1. Log in
  await page.goto('/login');
  await page.fill('input[type="email"]', 'student1@example.com');
  await page.fill('input[type="password"]', 'password');
  await page.click('button[type="submit"]');

  await page.waitForURL(/\/($|\?)/);

  // 2. Open conversation 1 directly
  await page.goto('/messages/1');
  const thread = page.locator('[data-testid="thread"]');
  await expect(thread).toBeVisible();

  // Wait for initial render to settle
  await page.waitForTimeout(600);

  // 3. Verify that scrollTop is at the bottom
  const scrollInfo = await thread.evaluate((el) => {
    return {
      scrollTop: el.scrollTop,
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
      distanceFromBottom: el.scrollHeight - el.scrollTop - el.clientHeight,
    };
  });

  console.log('Scroll Info:', scrollInfo);
  expect(scrollInfo.distanceFromBottom).toBeLessThanOrEqual(20);

  // 4. Verify the latest message is in the viewport without any scrolling
  const latestMessage = page.locator('[data-testid="thread"] > div').last();
  await expect(latestMessage).toBeInViewport();

  // 5. Verify "Mới nhất" floating button is NOT shown because user is already at the bottom
  const latestBtn = page.getByRole('button', { name: 'Xuống tin nhắn mới nhất' });
  await expect(latestBtn).toHaveCount(0);
});
