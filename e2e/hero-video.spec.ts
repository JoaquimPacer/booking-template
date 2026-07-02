import { test, expect, type Page } from "@playwright/test";

// The hero background video must never leave a stuck or paused <video> on
// screen. Browsers that allow muted autoplay show it playing; browsers that
// block autoplay (Safari under Low Power Mode or a "Never Auto-Play" site
// setting) must fall back to the poster image, with no lingering video element
// and therefore no stray play-button overlay. See src/components/hero-video.tsx.

// The mobile hero waits for a first interaction before mounting; nudge it so the
// video mounts on every viewport.
async function wakeHeroVideo(page: Page) {
  await page.waitForTimeout(500);
  await page.evaluate(() => window.dispatchEvent(new Event("scroll")));
}

test("hero video plays, or falls back to the poster with no stuck video", async ({
  page,
}) => {
  await page.goto("/");
  await wakeHeroVideo(page);
  await page.waitForTimeout(4000);

  const video = page.locator("section.hero-section video");
  if ((await video.count()) === 0) {
    // Autoplay was refused: the poster image must be carrying the hero.
    await expect(page.locator("section.hero-section img").first()).toBeVisible();
  } else {
    // Video is on screen: it must actually be playing, not paused/stuck.
    const playing = await video.first().evaluate((el) => {
      const v = el as HTMLVideoElement;
      return !v.paused && v.currentTime > 0;
    });
    expect(playing).toBe(true);
  }
});

test("when autoplay is refused, the video is removed and the poster shows", async ({
  page,
}) => {
  // Simulate Safari refusing autoplay: make every play() reject before load.
  await page.addInitScript(() => {
    window.HTMLMediaElement.prototype.play = function () {
      return Promise.reject(new DOMException("blocked", "NotAllowedError"));
    };
  });

  await page.goto("/");
  await wakeHeroVideo(page);
  await page.waitForTimeout(5000);

  await expect(page.locator("section.hero-section video")).toHaveCount(0);
  await expect(page.locator("section.hero-section img").first()).toBeVisible();
});
