// Small formatting helpers used across pages.
// Keeping them in one file makes it easy to swap formats later
// (e.g., switch currency, localize, change duration unit).

/**
 * Format cents as a dollar string. 8000 -> "$80". 8500 -> "$85" (no decimals
 * shown for whole-dollar amounts; we add .50 etc when relevant).
 */
export function formatPriceCents(cents: number | undefined | null): string | null {
  if (typeof cents !== "number" || cents < 0) return null;
  const dollars = cents / 100;
  if (Number.isInteger(dollars)) return `$${dollars}`;
  return `$${dollars.toFixed(2)}`;
}

/**
 * Format minutes as a human-readable duration.
 * 60 -> "60 min". 90 -> "1h 30min". 120 -> "2h". 30 -> "30 min".
 */
export function formatDurationMinutes(minutes: number | undefined | null): string | null {
  if (typeof minutes !== "number" || minutes <= 0) return null;
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (remaining === 0) return `${hours}h`;
  return `${hours}h ${remaining}min`;
}
