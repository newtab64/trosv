import { test, expect } from '@playwright/test';

test('reaction badge and preview card reaction', async ({ page }) => {
  // 1. Go to login
  await page.goto('/login');
  await page.fill('input[type="email"]', 'student1@example.com');
  await page.fill('input[type="password"]', 'password');
  await page.click('button[type="submit"]');

  await page.waitForURL(/\/($|\?)/);

  // 2. Go to conversation 1
  await page.goto('/messages/1');
  await page.waitForSelector('[data-testid="thread"]');
  await page.waitForTimeout(1000);

  // 3. React to preview card
  const cardReactionBtn = page.locator('button[aria-label="Thả cảm xúc phòng này"]').first();
  await cardReactionBtn.scrollIntoViewIfNeeded();
  await expect(cardReactionBtn).toBeVisible();
  await cardReactionBtn.click();

  // Pick 👍 or ❤️ (choose 👍 which hasn't been picked by student yet)
  const thumbsUpEmoji = page.locator('button[aria-label="Biểu cảm 👍"]').first();
  await expect(thumbsUpEmoji).toBeVisible();
  await thumbsUpEmoji.click({ force: true });

  // Wait for the reaction popover to disappear
  await expect(page.locator('[role="dialog"]')).toHaveCount(0);

  // The reaction badge on the card should be visible
  await expect(page.locator('button[aria-label="Xem biểu cảm"]').first()).toBeVisible();

  // 4. Send consecutive messages
  const uid = Date.now();
  const msg1Text = `Tin nhắn test reaction 1 - ${uid}`;
  const msg2Text = `Tin nhắn test reaction 2 - ${uid}`;

  const thread = page.locator('[data-testid="thread"]');
  const textarea = page.locator('textarea[aria-label="Tin nhắn"]');
  const sendBtn = page.locator('button[aria-label="Gửi tin nhắn"]');

  await textarea.fill(msg1Text);
  await expect(sendBtn).toBeEnabled();
  await sendBtn.click();
  try {
    await expect(thread.getByText(msg1Text)).toBeVisible({ timeout: 5_000 });
  } catch {
    await textarea.press('Enter');
    await expect(thread.getByText(msg1Text)).toBeVisible({ timeout: 10_000 });
  }

  await textarea.fill(msg2Text);
  await expect(sendBtn).toBeEnabled();
  await sendBtn.click();
  try {
    await expect(thread.getByText(msg2Text)).toBeVisible({ timeout: 5_000 });
  } catch {
    await textarea.press('Enter');
    await expect(thread.getByText(msg2Text)).toBeVisible({ timeout: 10_000 });
  }

  // Find msg1 inside thread and react to it via its 3-dots menu
  const msg1El = thread.getByText(msg1Text);
  await msg1El.scrollIntoViewIfNeeded();
  const msg1Group = msg1El.locator('xpath=ancestor::div[contains(@class, "group/msg")]');
  await msg1Group.hover();

  const msg1More = msg1Group.locator('button[aria-label="Tùy chọn tin nhắn"]');
  await msg1More.click();

  // Pick ❤️
  const heartPicker = page.locator('button[aria-label="Biểu cảm ❤️"]').last();
  await expect(heartPicker).toBeVisible();
  await heartPicker.click({ force: true });

  // Verify that msg1 has a reaction badge and msg2 is below it
  const msg1Container = msg1El.locator('xpath=ancestor::div[contains(@class, "group/msg")]');
  const msg1Badge = msg1Container.locator('button[aria-label="Xem biểu cảm"]');
  await expect(msg1Badge).toBeVisible();

  // Verify msg2 is visible below it
  await expect(thread.getByText(msg2Text)).toBeVisible();
});
