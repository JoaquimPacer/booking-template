import { test, expect } from "@playwright/test";

// Cross-browser smoke test: every key page must load and render its main
// heading on Chromium, WebKit, and mobile Safari. This is the check that would
// have caught a Safari-only breakage. Content is pulled from Sanity at dev time.
const PAGES = ["/", "/services", "/about", "/faq", "/contact"];

for (const path of PAGES) {
  test(`loads ${path}`, async ({ page }) => {
    const res = await page.goto(path);
    expect(res?.status(), `HTTP status for ${path}`).toBeLessThan(400);
    await expect(page.locator("h1").first()).toBeVisible();
  });
}
