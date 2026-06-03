// Jane booking-link verifier.
//
// Jane's per-treatment links are client-side hash routes (#/.../treatment/ID),
// so a server fetch can't tell where they land. This drives a real headless
// browser, lets Jane's JS resolve the treatment, and reads back the treatment
// that ends up SELECTED (the checked radio) so we can map URL -> treatment with
// confidence instead of trusting hand-typed labels.
//
// Uses Playwright locators only (no page.evaluate) because tsx's transpiler
// injects helpers that break evaluate callbacks in the browser context.
//
// Run from the repo root:
//   npx playwright install chromium   (one time)
//   npx tsx scripts/check-jane-links.ts

import { chromium } from "@playwright/test";
import { mkdirSync } from "fs";
import { join } from "path";

const BASE =
  "https://cancerrehab.janeapp.com/locations/theresa-s-home-office/book#/staff_member/5/treatment/";

const IDS = ["12", "21", "13", "54", "14", "35", "18", "19", "15", "16", "17"];

const outDir = join(process.cwd(), "scripts", "jane-check-output");
mkdirSync(outDir, { recursive: true });

(async () => {
  const browser = await chromium.launch();

  for (const id of IDS) {
    const url = BASE + id;
    const out: Record<string, unknown> = { id };
    const ctx = await browser.newContext({ viewport: { width: 1200, height: 1400 } });
    const page = await ctx.newPage();
    const t0 = Date.now();
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 });
      await page.waitForSelector('input[type="radio"]', { timeout: 20_000 }).catch(() => {});
      await page.waitForTimeout(2_500); // let the deep-link selection settle

      const radios = page.locator('input[type="radio"]');
      const n = await radios.count();
      let selected: string | null = null;
      for (let i = 0; i < n; i++) {
        const r = radios.nth(i);
        if (!(await r.isChecked().catch(() => false))) continue;
        const rid = await r.getAttribute("id").catch(() => null);
        let txt = "";
        if (rid)
          txt = await page.locator(`label[for="${rid}"]`).first().innerText().catch(() => "");
        if (!txt)
          txt = await r.locator("xpath=ancestor::label[1]").first().innerText().catch(() => "");
        if (!txt)
          txt = await r.locator("xpath=ancestor::li[1]").first().innerText().catch(() => "");
        if (!txt) txt = await r.locator("xpath=..").first().innerText().catch(() => "");
        selected = txt.replace(/\s+/g, " ").trim().slice(0, 160);
        break;
      }

      out.ms = Date.now() - t0;
      out.radios = n;
      out.selected = selected;
      await page
        .screenshot({ path: join(outDir, `sel-${id}.png`), fullPage: true })
        .catch(() => {});
    } catch (e) {
      out.error = (e as Error).message;
    }
    await ctx.close();
    console.log(JSON.stringify(out));
  }

  await browser.close();
  console.log("DONE");
})();
