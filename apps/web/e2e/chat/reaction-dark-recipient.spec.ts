import { test, expect } from '@playwright/test';

test('reaction badge and preview card in dark mode and recipient view', async ({ page }) => {
  console.log('Step 1: logging in');
  await page.goto('/login');
  await page.fill('input[type="email"]', 'landlord1@example.com');
  await page.fill('input[type="password"]', 'password');
  await page.click('button[type="submit"]');

  await page.waitForURL(/\/($|\?)/);
  console.log('Step 2: logged in, navigating to messages/1');

  await page.goto('/messages/1');
  await page.waitForSelector('[data-testid="thread"]');
  await page.waitForTimeout(1000);
  console.log('Step 3: thread visible');

  const themeToggle = page.locator('header button[aria-label*="Chuyển sang chế độ"]').first();
  const label = await themeToggle.getAttribute('aria-label');
  if (label?.includes('tối')) {
    await themeToggle.click();
    await page.waitForTimeout(300);
  }
  console.log('Step 4: theme toggled');

  const cardReactionBtn = page.locator('button[aria-label="Thả cảm xúc phòng này"]').first();
  await cardReactionBtn.scrollIntoViewIfNeeded();
  console.log('Step 5: cardReactionBtn scrolled into view');
  await cardReactionBtn.click();
  console.log('Step 6: cardReactionBtn clicked');

  const btnBox = await cardReactionBtn.boundingBox();
  const popover = page.locator('[role="dialog"]');
  await expect(popover).toBeVisible();
  const popBox = await popover.boundingBox();
  console.log('Step 7: popover visible. btnBox=', btnBox, 'popBox=', popBox);
  const laughingEmoji = popover.locator('button[aria-label="Biểu cảm 😂"]');
  await laughingEmoji.click({ force: true });
  console.log('Step 8: emoji clicked');
  await page.waitForTimeout(500);
});
