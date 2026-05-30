// Generates orderRank values compatible with @sanity/orderable-document-list.
//
// IMPORTANT: that plugin stores order in a string field `orderRank` whose format
// is LexoRank (e.g. "0|0i0000:"), and it calls LexoRank.parse() on every value.
// A value that isn't valid LexoRank logs "Failed to parse orderRank value" and is
// ignored, so the list falls back to unordered. We therefore MUST produce real
// LexoRank strings, using the same `lexorank` library the plugin uses internally.
//
// This mirrors the plugin's own "Reset Order" action: start at LexoRank.min() and
// genNext().genNext() for each item, which spaces ranks two steps apart so there
// is room to drag items between any two.

import { LexoRank } from "lexorank";

/**
 * Ascending LexoRank strings for `count` items. ranks[i] is the rank for the
 * item at display position i (0-based). Lexicographically sortable in order.
 */
export function generateOrderRanks(count: number): string[] {
  const ranks: string[] = [];
  let rank = LexoRank.min();
  for (let i = 0; i < count; i++) {
    rank = rank.genNext().genNext();
    ranks.push(rank.toString());
  }
  return ranks;
}
