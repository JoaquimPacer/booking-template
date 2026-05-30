// Generates orderRank strings compatible with @sanity/orderable-document-list.
//
// That plugin sorts documents by a STRING field `orderRank` and, when you drag
// an item, computes a new rank halfway between its neighbors (base-36 midpoint).
// It only requires that every doc has a NON-NULL, sortable base-36 string; it
// does not care how the initial values were produced. (The console warning
// "Invalid orderRank value (expected string): null" happens only when a doc has
// no rank yet, e.g. docs seeded before the field existed.)
//
// We assign EVENLY SPACED, fixed-width base-36 values so there is plenty of room
// to drag items between any two. Baking this into the seed means every client's
// services get valid ranks at creation time, so the "documents have no order"
// warning never appears.

const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz";
const WIDTH = 6; // 36^6 ≈ 2.18 billion slots between first and last

function toBase36Padded(n: number): string {
  let v = Math.max(0, Math.floor(n));
  let s = "";
  while (v > 0) {
    s = ALPHABET[v % 36] + s;
    v = Math.floor(v / 36);
  }
  return s.padStart(WIDTH, "0");
}

/**
 * Evenly spaced orderRank for item `index` (0-based) out of `total`, ascending.
 * Fixed-width base-36 strings sort lexicographically in the same order as their
 * numeric value, which is exactly what the plugin compares.
 */
export function orderRankForIndex(index: number, total: number): string {
  const span = Math.pow(36, WIDTH);
  const step = Math.floor(span / (total + 1));
  return toBase36Padded((index + 1) * step);
}
