import type { Page } from "@playwright/test";

const API = "http://localhost:8000/api";

export const STUDENT = "student1@email.com";
export const LANDLORD = "landlord1@email.com";

interface LoginData {
  token: string;
  user: unknown;
}

/** Logs in through the API and seeds the SPA's localStorage session. */
export async function loginAs(page: Page, email: string): Promise<LoginData> {
  const res = await page.request.post(`${API}/login`, {
    data: { email, password: "password" },
    headers: { Accept: "application/json" },
  });
  const data = ((await res.json()) as { data: LoginData }).data;
  await page.addInitScript(
    ([t, u]) => {
      localStorage.setItem("token", t);
      localStorage.setItem("user", JSON.stringify(u));
    },
    [data.token, data.user] as const,
  );
  return data;
}

/** First conversation id of the logged-in user, or null. */
export async function firstConversationId(page: Page, token: string): Promise<number | null> {
  const res = await page.request.get(`${API}/conversations`, {
    headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
  });
  const body = (await res.json()) as { data?: { id: number }[] };
  return body.data?.[0]?.id ?? null;
}

/**
 * Wait until every finite CSS/Web animation on the page has finished. Layout measurements
 * (boundingBox, getBoundingClientRect) taken while the page is still easing in, like the
 * `motion-stagger` fade-up with its per-child delay, are off by the slide distance and make
 * tests flaky. Infinite animations (a pulsing badge) are skipped: they never finish.
 */
export async function settleAnimations(page: Page): Promise<void> {
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((a) => Number.isFinite(a.effect?.getComputedTiming().endTime ?? Infinity))
        .map((a) => a.finished.catch(() => undefined)),
    ),
  );
}
