function rank(entry: { countHint?: number }): number {
  if (entry.countHint === undefined) return 1;
  return entry.countHint > 0 ? 0 : 2;
}

/**
 * Orders listing entries so the ones with items come first and the empty ones last.
 *
 * - Entries with a positive `countHint` first, then entries without one, then a `countHint` of 0.
 * - The server's order is kept within each group, so a larger count does not move an entry up.
 */
export function orderByCountHint<T extends { countHint?: number }>(entries: readonly T[]): T[] {
  return entries.toSorted((a, b) => rank(a) - rank(b));
}
