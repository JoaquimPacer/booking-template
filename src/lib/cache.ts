// Single source of truth for ISR (Incremental Static Regeneration) cache
// durations. Edit these constants once to retune the whole site.
//
// Tradeoff: lower = fresher content on the public site, but more Sanity API
// calls (free tier has generous limits, so this rarely bites). For instant
// updates after publishing, prefer on-demand revalidation via a Sanity
// webhook hitting /api/revalidate. That requires extra setup; left as a
// Phase 2+ polish item.

/**
 * How often marketing pages re-fetch Sanity content.
 * 10 seconds = comfortable for testing edits in Studio without long waits.
 * Bump to 60+ once content stabilizes and you don't need fast iteration.
 */
export const REVALIDATE_SECONDS = 10;

/**
 * Sitemap rebuild cadence. Sitemaps change much less frequently than
 * marketing pages, so this can be longer.
 */
export const SITEMAP_REVALIDATE_SECONDS = 3600;
