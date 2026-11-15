import { expect, test, type Page } from "@playwright/test";

const WORDS = ["Gần trường.", "Giá rẻ.", "Tiện lợi."];
const typed = (page: Page) => page.getByTestId("typed-word");
const hero = (page: Page) => page.locator('[data-testid="plate-band"][data-size="hero"]');

test.describe("home hero", () => {
  test.use({ viewport: { width: 1360, height: 900 } });

  test("hero is a navy plate band with the headline and a typed keyword", async ({ page }) => {
    await page.goto("/");
    await expect(hero(page)).toBeVisible();
    await expect(hero(page).locator("h1")).toContainText("Phòng trọ. Căn hộ.");
    await expect(typed(page)).toBeVisible();
    await expect(page.getByTestId("typed-caret")).toBeVisible();
  });

  test("the keyword types out, deletes, and moves on to the next phrase", async ({ page }) => {
    await page.clock.install();
    await page.goto("/");
    const seen = new Set<string>();
    for (let i = 0; i < 120; i++) {
      await page.clock.runFor(250);
      const now = ((await typed(page).textContent()) ?? "").trim();
      if (WORDS.includes(now)) seen.add(now);
      if (seen.size === WORDS.length) break;
    }
    expect([...seen].sort()).toEqual([...WORDS].sort());
  });

  test("screen readers get the whole phrase list, not single letters", async ({ page }) => {
    await page.goto("/");
    const h1 = hero(page).locator("h1");
    await expect(h1.locator(".sr-only")).toHaveText(/Gần trường.*giá rẻ.*tiện lợi/i);
    await expect(typed(page)).toHaveAttribute("aria-hidden", "true");
  });

  test("reduced motion shows the first phrase and never types", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.clock.install();
    await page.goto("/");
    await expect(typed(page)).toHaveText("Gần trường.");
    await page.clock.runFor(8000);
    await expect(typed(page)).toHaveText("Gần trường.");
    await expect(page.getByTestId("typed-caret")).toBeHidden();
  });

  test("the hero has a quiet doodle pattern, not the old big artwork", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("hero-doodles")).toBeVisible();
    await expect(page.locator('img[src*="hero-art"]')).toHaveCount(0);
  });

  test("three drawn room cards float at the right of the hero on wide screens", async ({
    page,
  }) => {
    await page.goto("/");
    const deck = page.getByTestId("hero-deck");
    await expect(deck).toBeVisible();
    await expect(deck.getByTestId("hero-deck-card")).toHaveCount(3);
    await expect(deck.locator("a, img")).toHaveCount(0);
    const box = await deck.boundingBox();
    expect(box!.x).toBeGreaterThan(560);
  });
});

test.describe("recent rooms on a clothesline", () => {
  test.use({ viewport: { width: 1360, height: 900 } });

  test("the clothesline starts above the fold, right under the hero", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("hang-card").first()).toBeVisible();
    const heading = await page.getByRole("heading", { name: "Mới đăng" }).boundingBox();
    expect(heading!.y).toBeLessThan(700);
    const card = await page.getByTestId("hang-card").first().boundingBox();
    expect(card!.y).toBeLessThan(900);
  });

  test("every room has a peg and the first card lines up with the heading", async ({ page }) => {
    await page.goto("/");
    const cards = page.getByTestId("hang-card");
    await expect(cards.first()).toBeVisible();
    expect(await page.getByTestId("hang-peg").count()).toBe(await cards.count());
    const h = await page.getByRole("heading", { name: "Mới đăng" }).boundingBox();
    const c = await cards.first().boundingBox();
    expect(Math.abs(h!.x - c!.x)).toBeLessThanOrEqual(1);
  });

  test("a card opens its room", async ({ page }) => {
    // The cards sway forever; reduced motion keeps them still so the click can land.
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await page.getByTestId("hang-card").first().click();
    await expect(page).toHaveURL(/\/rooms\/\d+/);
  });

  test("arrows hide at either end of the line", async ({ page }) => {
    await page.goto("/");
    const row = page.getByTestId("hang-row");
    await expect(page.getByTestId("hang-card").first()).toBeVisible();
    const scrollable = await row.evaluate((el) => el.scrollWidth > el.clientWidth + 4);
    test.skip(!scrollable, "not enough rooms to scroll");
    // A hidden arrow is also hidden from the accessibility tree, so look them up by test id.
    const prev = page.getByTestId("hang-prev");
    const next = page.getByTestId("hang-next");
    await expect(prev).toHaveAttribute("data-visible", "false");
    await expect(prev).toHaveCSS("opacity", "0");
    await expect(next).toHaveAttribute("data-visible", "true");
    await row.evaluate((el) => {
      el.scrollLeft = el.scrollWidth;
    });
    await expect(next).toHaveAttribute("data-visible", "false");
    await expect(prev).toHaveAttribute("data-visible", "true");
    await row.evaluate((el) => {
      el.scrollLeft = el.scrollWidth / 3;
    });
    await expect(prev).toHaveAttribute("data-visible", "true");
    await expect(next).toHaveAttribute("data-visible", "true");
  });

  test("the arrow scrolls the line", async ({ page }) => {
    await page.goto("/");
    const row = page.getByTestId("hang-row");
    await expect(page.getByTestId("hang-card").first()).toBeVisible();
    test.skip(
      !(await row.evaluate((el) => el.scrollWidth > el.clientWidth + 4)),
      "not enough rooms to scroll",
    );
    await page.getByRole("button", { name: "Cuộn sang phải" }).click();
    await expect.poll(() => row.evaluate((el) => el.scrollLeft)).toBeGreaterThan(100);
  });
});

test.describe("quick search strip", () => {
  test.use({ viewport: { width: 1360, height: 900 } });

  test("is one compact card with school chips and four shortcuts", async ({ page }) => {
    await page.goto("/");
    const strip = page.getByTestId("quick-strip");
    await expect(strip).toBeVisible();
    const box = await strip.boundingBox();
    expect(box!.height).toBeLessThan(190);
    const schools = strip.locator('a[href*="school_id="]');
    expect(await schools.count()).toBeGreaterThanOrEqual(1);
    for (const name of [/Bản đồ/, /Gợi ý khu vực/, /Bạn cùng phòng/, /Nhắn chủ nhà/]) {
      await expect(strip.getByRole("link", { name })).toBeVisible();
    }
  });
});

test.describe("home on a phone", () => {
  test.use({ viewport: { width: 390, height: 800 } });

  test("no floating deck or arrows, and the line swipes", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("hang-card").first()).toBeVisible();
    await expect(page.getByTestId("hero-deck")).toBeHidden();
    await expect(page.getByRole("button", { name: "Cuộn sang phải" })).toBeHidden();
    const overflow = await page
      .getByTestId("hang-row")
      .evaluate((el) => getComputedStyle(el).overflowX);
    expect(overflow).toBe("auto");
    const noXScroll = await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    );
    expect(noXScroll).toBe(true);
  });

  test("the first room is visible without scrolling past a wall of tiles", async ({ page }) => {
    await page.goto("/");
    const card = await page.getByTestId("hang-card").first().boundingBox();
    expect(card!.y).toBeLessThan(900);
  });
});

test.describe("header menu", () => {
  test("the header menu is centered and Tìm phòng opens the room types", async ({ page }) => {
    await page.setViewportSize({ width: 1360, height: 900 });
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "Điều hướng chính" });
    const box = await nav.boundingBox();
    expect(Math.abs(box!.x + box!.width / 2 - 1360 / 2)).toBeLessThanOrEqual(40);
    await nav.getByRole("button", { name: "Tìm phòng" }).click();
    for (const name of ["Tất cả phòng", "Phòng trọ", "Căn hộ", "Nhà nguyên căn"]) {
      await expect(page.getByRole("link", { name })).toBeVisible();
    }
    await page.getByRole("link", { name: "Căn hộ" }).click();
    await expect(page).toHaveURL(/type=apartment/);
  });
});
