import { afterEach, describe, expect, it, vi } from "vitest";

// Why this test exists: with useCdn on and a read token set, the publish webhook
// regenerates the page by refetching through Sanity's CDN, which can still hold
// the pre-publish content, so the OLD content gets baked in for a full ISR
// window. Proven on perez-hair-design and cesar-perez-realty (2026-08-22,
// publish-to-live fell to about 2 seconds after the fix). Every fork inherits
// this client, so the template must ship with the CDN off. ISR is the caching
// layer; the CDN adds staleness, not speed.
describe("sanity read client", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("never reads through the CDN in production with a token set", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SANITY_API_READ_TOKEN", "test-token-not-a-credential");
    vi.resetModules();
    const { sanity } = await import("./sanity");
    expect(sanity.config().useCdn).toBe(false);
  });

  it("keeps published-only reads so drafts never reach the live site", async () => {
    vi.resetModules();
    const { sanity } = await import("./sanity");
    expect(sanity.config().perspective).toBe("published");
  });
});
