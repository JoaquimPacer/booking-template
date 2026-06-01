// Resolves where a "Book" button should go.
//
// Two booking modes per client deploy:
//  - External scheduler (e.g. JaneApp): siteSettings.externalBookingUrl is set.
//    Every Book button links out to it (handles payments + privacy on their side).
//  - Built-in scheduler: no external URL -> our own /book/[slug] flow.
//
// One helper so every Book button across the site behaves consistently; the
// whole site flips by setting one Sanity field.

/** Sentinel used in the CTA "where the button goes" dropdown for "the booking link". */
export const BOOKING_HREF = "__booking__";

/**
 * Where a service-level "Book" button should point. Priority:
 *   1. the service's own booking link (per-service Jane deep link), if set
 *   2. the site-wide external booking link, if set
 *   3. the built-in /book/[slug] page
 */
export function bookingHref(
  externalBookingUrl: string | undefined | null,
  slug?: string,
  serviceBookingUrl?: string | null,
): string {
  if (serviceBookingUrl) return serviceBookingUrl;
  if (externalBookingUrl) return externalBookingUrl;
  return slug ? `/book/${slug}` : "/services";
}

/**
 * Resolve a CTA href: the BOOKING_HREF sentinel becomes the real booking
 * destination; everything else passes through unchanged.
 */
export function resolveCtaHref(
  href: string | undefined,
  externalBookingUrl: string | undefined | null,
): string {
  if (href === BOOKING_HREF) return bookingHref(externalBookingUrl);
  return href ?? "/services";
}

/** True for an off-site link (so we can open it in a new tab). */
export function isExternalHref(href: string): boolean {
  return /^https?:\/\//i.test(href);
}
