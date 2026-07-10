// IndexNow submission, runs as npm postbuild on Vercel production deploys.
//
// Tells IndexNow-participating search engines (Bing, and through it DuckDuckGo,
// plus Yandex/Seznam/Naver) "these URLs exist, come crawl them." Google does not
// participate in IndexNow; Google discovery stays sitemap + Search Console.
//
// No-op unless ALL of these hold (so previews, local builds, and projects
// without a key are never affected, and a failure never breaks a build):
//   VERCEL_ENV === "production", INDEXNOW_KEY set, NEXT_PUBLIC_SITE_URL set.
//
// The URL list comes from the LIVE production sitemap (the previous deployment).
// Content pages come from Sanity via ISR, not from deploys, so the live sitemap
// is current in practice; a brand-new domain's first deploy simply skips (no live
// sitemap yet) and the next deploy covers it.
//
// The key must also be served at <site>/indexnow.txt (see src/app/indexnow.txt/
// route.ts); engines fetch it once to verify we own the host.

const env = process.env.VERCEL_ENV;
const key = process.env.INDEXNOW_KEY;
const site = process.env.NEXT_PUBLIC_SITE_URL;

function log(msg) {
  console.log(`[indexnow] ${msg}`);
}

if (env !== "production") {
  log(`skip: VERCEL_ENV is "${env ?? "unset"}", only production submits`);
  process.exit(0);
}
if (!key || !site) {
  log(`skip: ${!key ? "INDEXNOW_KEY" : "NEXT_PUBLIC_SITE_URL"} not set`);
  process.exit(0);
}

try {
  const sitemapUrl = new URL("/sitemap.xml", site).href;
  const res = await fetch(sitemapUrl, { signal: AbortSignal.timeout(20000) });
  if (!res.ok) {
    log(`skip: live sitemap not reachable yet (${res.status} from ${sitemapUrl})`);
    process.exit(0);
  }
  const xml = await res.text();
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
  if (urls.length === 0) {
    log("skip: sitemap contained no URLs");
    process.exit(0);
  }

  const host = new URL(site).host;
  const submit = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      host,
      key,
      keyLocation: new URL("/indexnow.txt", site).href,
      urlList: urls,
    }),
    signal: AbortSignal.timeout(20000),
  });
  // 200/202 = accepted. 403 = key file mismatch. 422 = URLs don't match host.
  log(`submitted ${urls.length} URLs for ${host}: HTTP ${submit.status}`);
} catch (err) {
  // Never fail a deploy over a ping.
  log(`skip: ${err?.message ?? err}`);
}
process.exit(0);
