import { expect, test, type Page } from "@playwright/test";
import { LANDLORD, STUDENT, loginAs } from "./helpers";

/*
  The seed data has a single conversation, so the messaging API is mocked here:
  one stubbed GET /conversations drives both the list and the thread header.
  Nothing is written to the demo database.
*/
const API = "http://localhost:8000/api/conversations";
const iso = (minutesAgo: number) => new Date(Date.now() - minutesAgo * 60_000).toISOString();

interface Listing {
  id: number;
  title: string;
  cover_image: string | null;
}
const GAC_LUNG: Listing = {
  id: 48,
  title: "Phòng trọ cao cấp gác lửng – Gần ĐH Greenwich",
  cover_image: null,
};
const STUDIO: Listing = { id: 45, title: "Studio full nội thất gần trường", cover_image: null };
const BAN_CONG: Listing = {
  id: 44,
  title: "Phòng khép kín ban công thoáng mát",
  cover_image: null,
};

/** Conversations as the logged-in viewer sees them. */
function conversations(viewerId: number, otherIsStudent = false) {
  const make = (
    id: number,
    name: string,
    role: string,
    last: string,
    mine: boolean,
    unread: number,
    minutesAgo: number,
    listing: Listing | null,
  ) => ({
    id,
    student_id: viewerId,
    landlord_id: 100 + id,
    listing,
    other_user: { id: 100 + id, name, role: otherIsStudent ? "student" : role },
    last_message: {
      body: last,
      sender_id: mine ? viewerId : 100 + id,
      created_at: iso(minutesAgo),
    },
    unread_count: unread,
  });
  return [
    make(
      1,
      "Trần Văn Thành",
      "landlord",
      "Giá 2,9tr đã gồm điện nước, em qua xem trực tiếp được không?",
      false,
      2,
      780,
      GAC_LUNG,
    ),
    make(
      2,
      "Phạm Minh Đức",
      "landlord",
      "Cảm ơn anh, chiều mai em ghé xem phòng ạ.",
      true,
      0,
      1500,
      STUDIO,
    ),
    make(
      3,
      "Vũ Minh Giang",
      "student",
      "Mình cũng thích gym, mai gặp bàn chuyện ở ghép nhé!",
      false,
      0,
      3000,
      null,
    ),
    make(
      4,
      "Lê Thị Hoa",
      "landlord",
      "Phòng đã có người đặt cọc rồi em nhé, xin lỗi em.",
      false,
      1,
      4300,
      BAN_CONG,
    ),
  ];
}

type Msg = { id: number; sender_id: number; body: string; mine: boolean; minutesAgo: number };
const message = (convId: number, m: Msg) => ({
  id: m.id,
  conversation_id: convId,
  sender_id: m.sender_id,
  body: m.body,
  is_mine: m.mine,
  created_at: iso(m.minutesAgo),
});

async function mockMessaging(
  page: Page,
  viewerId: number,
  opts: { list?: unknown[]; threads?: Record<number, Msg[]>; otherIsStudent?: boolean } = {},
) {
  const list = opts.list ?? conversations(viewerId, opts.otherIsStudent ?? false);
  const threads = opts.threads ?? {};
  await page.route(`${API}**`, async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace(/^\/api\/conversations/, "");
    const json = (data: unknown) =>
      route.fulfill({ contentType: "application/json", body: JSON.stringify({ data }) });
    if (route.request().method() !== "GET") return json(null);
    if (path === "" || path === "/") return json(list);
    const m = path.match(/^\/(\d+)\/messages$/);
    if (m) return json((threads[Number(m[1])] ?? []).map((x) => message(Number(m[1]), x)));
    return json(null);
  });
}

/** WCAG contrast of an element's text colour on its own background, from real pixels. */
function contrastOfClosest(el: Element, selector: string): number {
  const node = (el.closest(selector) ?? el) as HTMLElement;
  const px = (css: string): [number, number, number] => {
    const c = document.createElement("canvas").getContext("2d")!;
    c.fillStyle = css;
    c.fillRect(0, 0, 1, 1);
    const [r = 0, g = 0, b = 0] = c.getImageData(0, 0, 1, 1).data;
    return [r, g, b];
  };
  const lum = ([r, g, b]: [number, number, number]) => {
    const f = (v: number) => {
      const c = v / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const s = getComputedStyle(node);
  const [hi, lo] = [lum(px(s.color)), lum(px(s.backgroundColor))].sort((a, b) => b - a) as [
    number,
    number,
  ];
  return (hi + 0.05) / (lo + 0.05);
}

const row = (page: Page, id: number) => page.getByTestId(`conversation-${id}`);

test.describe("messages list", () => {
  test.use({ viewport: { width: 1360, height: 900 } });

  test("header shows how many are unread and unread rows stand out", async ({ page }) => {
    const { user } = (await loginAs(page, STUDENT)) as { user: { id: number } };
    await mockMessaging(page, user.id);
    await page.goto("/messages");
    await expect(page.getByTestId("unread-pill")).toHaveText("3 chưa đọc");
    await expect(row(page, 1).getByTestId("unread-badge")).toHaveText("2");
    await expect(row(page, 4).getByTestId("unread-badge")).toHaveText("1");
    await expect(row(page, 2).getByTestId("unread-badge")).toHaveCount(0);
    const weight = (id: number) =>
      row(page, id)
        .getByTestId("conversation-name")
        .evaluate((el) => Number(getComputedStyle(el).fontWeight));
    expect(await weight(1)).toBeGreaterThan(await weight(2));
  });

  test("your own last message is prefixed with 'Bạn:'", async ({ page }) => {
    const { user } = (await loginAs(page, STUDENT)) as { user: { id: number } };
    await mockMessaging(page, user.id);
    await page.goto("/messages");
    await expect(row(page, 2)).toContainText("Bạn: Cảm ơn anh");
    await expect(row(page, 1)).not.toContainText("Bạn:");
  });

  test("rows show which room the chat is about, when there is one", async ({ page }) => {
    const { user } = (await loginAs(page, STUDENT)) as { user: { id: number } };
    await mockMessaging(page, user.id);
    await page.goto("/messages");
    await expect(row(page, 1).getByTestId("conversation-room")).toContainText("Greenwich");
    await expect(row(page, 3).getByTestId("conversation-room")).toHaveCount(0);
  });

  test("the filter box narrows the list and explains an empty result", async ({ page }) => {
    const { user } = (await loginAs(page, STUDENT)) as { user: { id: number } };
    await mockMessaging(page, user.id);
    await page.goto("/messages");
    const filter = page.getByLabel("Tìm cuộc trò chuyện");
    await filter.fill("hoa");
    await expect(page.locator('a[data-testid^="conversation-"]')).toHaveCount(1);
    await expect(row(page, 4)).toBeVisible();
    await filter.fill("greenwich");
    await expect(row(page, 1)).toBeVisible();
    await filter.fill("zzzz");
    await expect(page.getByText("Không tìm thấy cuộc trò chuyện nào")).toBeVisible();
    await filter.fill("");
    await expect(row(page, 3)).toBeVisible();
  });

  test("with no conversations it invites the student to find a room", async ({ page }) => {
    const { user } = (await loginAs(page, STUDENT)) as { user: { id: number } };
    await mockMessaging(page, user.id, { list: [] });
    await page.goto("/messages");
    await expect(page.getByText("Chưa có cuộc trò chuyện nào")).toBeVisible();
    await expect(page.getByRole("link", { name: "Tìm phòng ngay" }).first()).toBeVisible();
  });

  test("the empty pane has art, a short explanation and a way forward", async ({ page }) => {
    const { user } = (await loginAs(page, STUDENT)) as { user: { id: number } };
    await mockMessaging(page, user.id);
    await page.goto("/messages");
    const pane = page.getByTestId("messages-empty-pane");
    await expect(pane).toBeVisible();
    await expect(pane.getByRole("heading", { name: "Chọn một cuộc trò chuyện" })).toBeVisible();
    await expect(pane.locator("img")).toBeVisible();
    await expect(pane.getByRole("link", { name: "Tìm phòng ngay" })).toBeVisible();
  });
});

test.describe("conversation thread", () => {
  test.use({ viewport: { width: 1360, height: 900 } });

  test("header names the person and their role", async ({ page }) => {
    const { user } = (await loginAs(page, STUDENT)) as { user: { id: number } };
    await mockMessaging(page, user.id);
    await page.goto("/messages/1");
    const header = page.getByTestId("thread-header");
    await expect(header).toContainText("Trần Văn Thành");
    await expect(header.getByTestId("role-chip")).toHaveText("Chủ nhà");
  });

  test("the latest room is pinned at the top and labelled as the latest", async ({ page }) => {
    const { user } = (await loginAs(page, STUDENT)) as { user: { id: number } };
    await mockMessaging(page, user.id);
    await page.goto("/messages/1");
    const card = page.getByTestId("thread-room-card");
    await expect(card).toContainText("Phòng gần nhất");
    await expect(card).toContainText("Greenwich");
    await expect(card.getByRole("link", { name: /Xem phòng/ })).toHaveAttribute(
      "href",
      "/rooms/48",
    );
  });

  test("a chat that is not about a room has no room card", async ({ page }) => {
    const { user } = (await loginAs(page, STUDENT)) as { user: { id: number } };
    await mockMessaging(page, user.id);
    await page.goto("/messages/3");
    await expect(page.getByTestId("thread-header")).toBeVisible();
    await expect(page.getByTestId("thread-room-card")).toHaveCount(0);
  });

  test("their messages are cards and yours stay readable", async ({ page }) => {
    const { user } = (await loginAs(page, STUDENT)) as { user: { id: number } };
    await mockMessaging(page, user.id, {
      threads: {
        2: [
          {
            id: 1,
            sender_id: 102,
            body: "Có em nhé, tầng 3 nên đi lại tiện.",
            mine: false,
            minutesAgo: 60,
          },
          {
            id: 2,
            sender_id: user.id,
            body: "Cảm ơn anh, chiều mai em ghé xem phòng ạ.",
            mine: true,
            minutesAgo: 30,
          },
        ],
      },
    });
    await page.goto("/messages/2");
    const thread = page.getByTestId("thread");
    const mine = thread.getByText("Cảm ơn anh, chiều mai em ghé xem phòng ạ.").first();
    await expect(mine).toBeVisible();
    // WCAG AA for body text on the sent-message bubble.
    const ratio = await mine.evaluate(contrastOfClosest, "[class*='bg-']");
    expect(ratio).toBeGreaterThanOrEqual(4.5);
    // Theirs sits on a card with a visible border, not on the page colour.
    const theirs = thread.getByText("Có em nhé, tầng 3 nên đi lại tiện.").first();
    const border = await theirs.evaluate((el) => {
      const node = el.closest("[class*='border']") as HTMLElement;
      return getComputedStyle(node).borderTopWidth;
    });
    expect(parseFloat(border)).toBeGreaterThan(0);
  });
});

test.describe("quick replies", () => {
  test.use({ viewport: { width: 1360, height: 900 } });

  const chips = (page: Page) => page.getByTestId("quick-replies").getByRole("button");

  test("students see them until the landlord replies", async ({ page }) => {
    const { user } = (await loginAs(page, STUDENT)) as { user: { id: number } };
    await mockMessaging(page, user.id, {
      threads: {
        1: [
          {
            id: 1,
            sender_id: user.id,
            body: "Chào bạn, mình quan tâm đến phòng trọ này:",
            mine: true,
            minutesAgo: 20,
          },
        ],
        2: [
          {
            id: 2,
            sender_id: user.id,
            body: "Chào bạn, mình quan tâm đến phòng trọ này:",
            mine: true,
            minutesAgo: 90,
          },
          { id: 3, sender_id: 102, body: "Có em nhé.", mine: false, minutesAgo: 60 },
        ],
      },
    });
    await page.goto("/messages/1");
    await expect(chips(page)).toHaveCount(3);
    await expect(chips(page).first()).toHaveText("Phòng còn trống không ạ?");
    await page.goto("/messages/2");
    await expect(page.getByTestId("thread")).toContainText("Có em nhé.");
    await expect(page.getByTestId("quick-replies")).toHaveCount(0);
  });

  test("tapping a chip fills the message box without sending", async ({ page }) => {
    const { user } = (await loginAs(page, STUDENT)) as { user: { id: number } };
    await mockMessaging(page, user.id, { threads: { 1: [] } });
    await page.goto("/messages/1");
    const box = page.locator('textarea[aria-label="Tin nhắn"]');
    const send = page.getByRole("button", { name: "Gửi tin nhắn" });
    await expect(send).toBeDisabled();
    await chips(page).nth(1).click();
    await expect(box).toHaveValue("Em xem phòng được lúc nào ạ?");
    await expect(send).toBeEnabled();
  });

  test("landlords never see student quick replies", async ({ page }) => {
    const { user } = (await loginAs(page, LANDLORD)) as { user: { id: number } };
    await mockMessaging(page, user.id, { otherIsStudent: true, threads: { 1: [] } });
    await page.goto("/messages/1");
    await expect(page.getByTestId("thread-header")).toBeVisible();
    await expect(page.getByTestId("quick-replies")).toHaveCount(0);
  });

  test("on a phone they sit on one line and swipe sideways", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    const { user } = (await loginAs(page, STUDENT)) as { user: { id: number } };
    await mockMessaging(page, user.id, { threads: { 1: [] } });
    await page.goto("/messages/1");
    const strip = page.getByTestId("quick-replies");
    await expect(strip).toBeVisible();
    // Measure after the chips finish easing in, not mid-slide.
    await page.evaluate(() =>
      Promise.all(document.getAnimations().map((a) => a.finished.catch(() => undefined))),
    );
    const tops = await strip
      .getByRole("button")
      .evaluateAll((els) => [
        ...new Set(els.map((e) => Math.round(e.getBoundingClientRect().top))),
      ]);
    expect(tops).toHaveLength(1);
    const { scrollW, clientW, overflowX } = await strip.evaluate((el) => ({
      scrollW: el.scrollWidth,
      clientW: el.clientWidth,
      overflowX: getComputedStyle(el).overflowX,
    }));
    expect(scrollW).toBeGreaterThan(clientW);
    expect(["auto", "scroll"]).toContain(overflowX);
    const pageOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(pageOverflow).toBeLessThanOrEqual(0);
  });
});

test.describe("messages on a phone", () => {
  test.use({ viewport: { width: 375, height: 800 } });

  test("list and thread do not overflow sideways", async ({ page }) => {
    const { user } = (await loginAs(page, STUDENT)) as { user: { id: number } };
    await mockMessaging(page, user.id, { threads: { 1: [] } });
    for (const path of ["/messages", "/messages/1"]) {
      await page.goto(path);
      await expect(
        page.getByTestId(path === "/messages" ? "unread-pill" : "thread-header"),
      ).toBeVisible();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, path).toBeLessThanOrEqual(0);
    }
  });
});

/* ---------- Small touches and motion ---------- */
const ms = (v: string) => Math.round(parseFloat(v) * (v.endsWith("ms") ? 1 : 1000));
const delays = async (loc: ReturnType<Page["locator"]>) =>
  loc.evaluateAll((els) => els.map((e) => getComputedStyle(e).animationDelay));
const names = async (loc: ReturnType<Page["locator"]>) =>
  loc.evaluateAll((els) => els.map((e) => getComputedStyle(e).animationName));
const increasing = (xs: number[]) => xs.every((x, i) => i === 0 || x > (xs[i - 1] ?? 0));

test.describe("messages motion and small touches", () => {
  test.use({ viewport: { width: 1360, height: 900 } });

  test("conversation rows ease in one after another", async ({ page }) => {
    const { user } = (await loginAs(page, STUDENT)) as { user: { id: number } };
    await mockMessaging(page, user.id);
    await page.goto("/messages");
    const rows = page
      .locator("ul > li")
      .filter({ has: page.locator('a[data-testid^="conversation-"]') });
    await expect(rows).toHaveCount(4);
    expect(await names(rows)).toEqual(["fade-up", "fade-up", "fade-up", "fade-up"]);
    expect(increasing((await delays(rows)).map(ms))).toBe(true);
  });

  test("an unread badge pops in", async ({ page }) => {
    const { user } = (await loginAs(page, STUDENT)) as { user: { id: number } };
    await mockMessaging(page, user.id);
    await page.goto("/messages");
    await expect(row(page, 1).getByTestId("unread-badge")).toHaveCSS("animation-name", "pop-in");
  });

  test("messages ease in one after another when a thread opens", async ({ page }) => {
    const { user } = (await loginAs(page, STUDENT)) as { user: { id: number } };
    await mockMessaging(page, user.id, {
      threads: {
        2: [
          { id: 1, sender_id: 102, body: "Có em nhé.", mine: false, minutesAgo: 90 },
          {
            id: 2,
            sender_id: user.id,
            body: "Dạ có thang máy không anh?",
            mine: true,
            minutesAgo: 80,
          },
          {
            id: 3,
            sender_id: 102,
            body: "Có em nhé, tầng 3 nên đi lại tiện.",
            mine: false,
            minutesAgo: 70,
          },
          { id: 4, sender_id: user.id, body: "Cảm ơn anh.", mine: true, minutesAgo: 60 },
        ],
      },
    });
    await page.goto("/messages/2");
    const rows = page.getByTestId("message-row");
    await expect(rows).toHaveCount(4);
    expect(await names(rows)).toEqual(["fade-up", "fade-up", "fade-up", "fade-up"]);
    expect(increasing((await delays(rows)).map(ms))).toBe(true);
  });

  test("the day separator is a small pill, like the time separators", async ({ page }) => {
    const { user } = (await loginAs(page, STUDENT)) as { user: { id: number } };
    await mockMessaging(page, user.id, {
      threads: { 2: [{ id: 1, sender_id: 102, body: "Có em nhé.", mine: false, minutesAgo: 90 }] },
    });
    await page.goto("/messages/2");
    const pill = page.getByTestId("day-separator").first();
    await expect(pill).toBeVisible();
    const style = await pill.evaluate((el) => {
      const s = getComputedStyle(el);
      return { radius: parseFloat(s.borderTopLeftRadius), bg: s.backgroundColor };
    });
    expect(style.radius).toBeGreaterThanOrEqual(100);
    expect(style.bg).not.toBe("rgba(0, 0, 0, 0)");
  });

  test("typing dots bounce", async ({ page }) => {
    const { user } = (await loginAs(page, STUDENT)) as { user: { id: number } };
    await mockMessaging(page, user.id, { threads: { 1: [] } });
    await page.goto("/messages/1");
    await expect(page.getByTestId("thread-header")).toBeVisible();
    // The indicator only renders on a live "typing" event, so check the class it uses.
    const name = await page.evaluate(() => {
      const dot = document.createElement("i");
      dot.className = "typing-dot";
      document.body.appendChild(dot);
      const n = getComputedStyle(dot).animationName;
      dot.remove();
      return n;
    });
    expect(name).toBe("dot-bounce");
  });

  test("the room card lifts when hovered", async ({ page }) => {
    const { user } = (await loginAs(page, STUDENT)) as { user: { id: number } };
    await mockMessaging(page, user.id, { threads: { 1: [] } });
    await page.goto("/messages/1");
    const card = page.getByTestId("thread-room-card");
    await expect(card).toBeVisible();
    await page.waitForTimeout(400);
    await card.hover();
    await page.waitForTimeout(400);
    expect(await card.evaluate((el) => getComputedStyle(el).transform)).toBe(
      "matrix(1, 0, 0, 1, 0, -2)",
    );
  });

  test("quick replies fade in one by one", async ({ page }) => {
    const { user } = (await loginAs(page, STUDENT)) as { user: { id: number } };
    await mockMessaging(page, user.id, { threads: { 1: [] } });
    await page.goto("/messages/1");
    const chips = page.getByTestId("quick-replies").getByRole("button");
    await expect(chips).toHaveCount(3);
    expect(await names(chips)).toEqual(["fade-up", "fade-up", "fade-up"]);
    expect(increasing((await delays(chips)).map(ms))).toBe(true);
  });

  test("the empty pane art stays still", async ({ page }) => {
    const { user } = (await loginAs(page, STUDENT)) as { user: { id: number } };
    await mockMessaging(page, user.id);
    await page.goto("/messages");
    await expect(page.getByTestId("messages-empty-pane").locator("img")).toHaveCSS(
      "animation-name",
      "none",
    );
  });

  test("with reduced motion nothing waits for a delay", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    const { user } = (await loginAs(page, STUDENT)) as { user: { id: number } };
    await mockMessaging(page, user.id, { threads: { 1: [] } });
    await page.goto("/messages/1");
    const chips = page.getByTestId("quick-replies").getByRole("button");
    await expect(chips).toHaveCount(3);
    for (const d of await delays(chips)) expect(ms(d)).toBe(0);
    await expect(chips.nth(2)).toHaveCSS("opacity", "1");
  });
});

test.describe("messages motion on a phone", () => {
  test.use({ viewport: { width: 375, height: 800 } });

  test("the thread slides in from the right and the list fades back", async ({ page }) => {
    const { user } = (await loginAs(page, STUDENT)) as { user: { id: number } };
    await mockMessaging(page, user.id, { threads: { 1: [] } });
    await page.goto("/messages/1");
    await expect(page.getByTestId("thread-pane")).toHaveCSS("animation-name", "slide-in-right");
    await page.goto("/messages");
    await expect(page.getByTestId("conversation-list")).toHaveCSS("animation-name", "fade-in");
  });
});

test.describe("thread scrolling", () => {
  test.use({ viewport: { width: 1360, height: 560 } });

  test("stays at the latest message when a room preview finishes loading late", async ({
    page,
  }) => {
    const { user } = (await loginAs(page, STUDENT)) as { user: { id: number } };
    const filler: Msg[] = Array.from({ length: 8 }, (_, i) => ({
      id: 10 + i,
      sender_id: i % 2 ? user.id : 101,
      body: `Tin nhắn số ${i + 1} để thread đủ dài và có thể cuộn.`,
      mine: i % 2 === 1,
      minutesAgo: 120 - i,
    }));
    await mockMessaging(page, user.id, {
      threads: {
        1: [
          ...filler,
          {
            id: 30,
            sender_id: user.id,
            body: "Chào bạn, mình quan tâm đến phòng trọ này:",
            mine: true,
            minutesAgo: 30,
          },
          { id: 31, sender_id: user.id, body: "/rooms/1", mine: true, minutesAgo: 30 },
          { id: 32, sender_id: 101, body: "Phòng vẫn còn nhé em.", mine: false, minutesAgo: 5 },
        ],
      },
    });
    // The room card grows the thread once its data arrives, after the first scroll.
    // A real seeded room (ids 1-22 exist in every seed); its preview card is the late content.
    await page.route("http://localhost:8000/api/listings/1", async (route) => {
      await new Promise((r) => setTimeout(r, 700));
      await route.continue();
    });
    await page.goto("/messages/1");
    const thread = page.getByTestId("thread");
    await expect(thread.getByText("Phòng vẫn còn nhé em.")).toBeVisible();
    await expect(thread.getByText("Xem chi tiết")).toBeVisible({ timeout: 8000 });
    await page.waitForTimeout(600);
    const distance = await thread.evaluate(
      (el) => el.scrollHeight - el.scrollTop - el.clientHeight,
    );
    expect(distance).toBeLessThanOrEqual(5);
  });

  test("does not yank you back down while you are reading older messages", async ({ page }) => {
    const { user } = (await loginAs(page, STUDENT)) as { user: { id: number } };
    const filler: Msg[] = Array.from({ length: 14 }, (_, i) => ({
      id: 10 + i,
      sender_id: i % 2 ? user.id : 101,
      body: `Tin nhắn số ${i + 1} để thread đủ dài và có thể cuộn.`,
      mine: i % 2 === 1,
      minutesAgo: 200 - i,
    }));
    await mockMessaging(page, user.id, {
      threads: {
        1: [
          ...filler,
          { id: 40, sender_id: user.id, body: "/rooms/1", mine: true, minutesAgo: 10 },
        ],
      },
    });
    await page.route("http://localhost:8000/api/listings/1", async (route) => {
      await new Promise((r) => setTimeout(r, 900));
      await route.continue();
    });
    await page.goto("/messages/1");
    const thread = page.getByTestId("thread");
    await expect(thread.getByText("Tin nhắn số 14")).toBeVisible();
    // The reader scrolls up before the room card arrives.
    await thread.evaluate((el) => {
      el.scrollTop = 40;
    });
    await expect(thread.getByText("Xem chi tiết")).toBeVisible({ timeout: 8000 });
    await page.waitForTimeout(500);
    const top = await thread.evaluate((el) => el.scrollTop);
    expect(top).toBeLessThan(200);
  });
});
