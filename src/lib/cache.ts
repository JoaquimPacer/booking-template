// Cache duration constants used INSIDE GROQ fetch options at runtime
// (src/lib/sanity-queries.ts). These work because they're imported as
// runtime values.
//
// IMPORTANT: Next.js App Router will NOT accept imported values for
// page-level segment config exports (`export const revalidate = ...`).
// Those must be statically-analyzable LITERAL numbers in each page file.
// Look for the comment "keep in sync with REVALIDATE_SECONDS" in each
// page.tsx and update both places when retuning.
//
// For instant updates after publishing in Sanity, prefer on-demand
// revalidation via a Sanity webhook hitting /api/revalidate. That removes
// the need to retune these constants. See docs/HOW_CONTENT_FLOWS.md.

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
