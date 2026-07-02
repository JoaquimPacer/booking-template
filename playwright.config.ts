import { defineConfig, devices } from "@playwright/test";

// Cross-browser end-to-end checks for the client site. Runs each spec against
// Chromium, WebKit (Safari's actual engine), and a mobile Safari viewport, so a
// Safari-only regression like the hero video is caught on Windows without a Mac.
// Unit tests stay on vitest (src/**/*.test.ts); these live in e2e/ and run with
// `npm run e2e`. The dev server is started automatically and reused if already up.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3000",
    navigationTimeout: 60_000,
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
    { name: "mobile-safari", use: { ...devices["iPhone 13"] } },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
