"""Smoke kiem tra frontend 'song': load trang, bat console error, kiem tra
React render that (co noi dung that trong #root, khong trang trang).

Usage: python3 scripts/smoke-ts.py [base_url]
Mặc định http://localhost:5174 (dev compose stack).
"""
import sys

from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:5174"

console_errors: list[str] = []
page_errors: list[str] = []
request_failures: list[str] = []

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    page.on("console", lambda m: console_errors.append(m.text) if m.type == "error" else None)
    page.on("pageerror", lambda e: page_errors.append(str(e)))
    page.on("requestfailed", lambda r: request_failures.append(f"{r.url} {r.failure}"))

    page.goto(BASE, wait_until="networkidle", timeout=30000)
    page.wait_for_timeout(1500)

    # 1. Root co noi dung render that (khong trang trang)
    root_html_len = page.evaluate("document.getElementById('root')?.innerHTML.length || 0")
    title = page.title()

    # 2. Nav bar hien dien (app khong crash truoc khi mount)
    navbar_visible = page.locator("nav, .navbar").count()

    # 3. Tim input tim kiem o Home (component chinh render thanh cong)
    search_input = page.locator("input[type='search']").count()

    # 4. Truy cap route con - /rooms (fetch API that)
    page.goto(f"{BASE}/rooms", wait_until="networkidle", timeout=30000)
    page.wait_for_timeout(2000)
    rooms_cards = page.locator(".listing-card").count()

    page.screenshot(path="/tmp/ts-smoke-home.png", full_page=True)
    browser.close()

print(f"title={title!r}")
print(f"root_html_len={root_html_len}")
print(f"navbar_count={navbar_visible}")
print(f"search_input_count={search_input}")
print(f"rooms_listing_cards={rooms_cards}")
print(f"console_errors={len(console_errors)}")
for e in console_errors[:10]:
    print(f"  CE: {e[:200]}")
print(f"page_errors={len(page_errors)}")
for e in page_errors[:10]:
    print(f"  PE: {e[:200]}")
print(f"request_failures={len(request_failures)}")
for r in request_failures[:10]:
    print(f"  RF: {r[:160]}")

ok = root_html_len > 500 and navbar_visible > 0 and not page_errors
print("SMOKE:", "PASS" if ok else "FAIL")
sys.exit(0 if ok else 1)
