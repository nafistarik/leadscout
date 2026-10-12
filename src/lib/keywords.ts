/**
 * Keyword chips: the search form edits keywords as a normalized string
 * array, but every existing consumer (provider request, cache key, shareable
 * URL, search history) keeps receiving the exact single-string format the
 * app has always used — chips joined with ", ".
 *
 * The provider sanitizes that string into one case-insensitive name match,
 * so chips change the entry experience (trim, dedupe, removal, paste),
 * never the query semantics.
 */

/** Splits a serialized keyword string into normalized chips. */
export function parseKeywordChips(value: string): string[] {
  const seen = new Set<string>();
  const chips: string[] = [];
  for (const part of value.split(",")) {
    const chip = part.trim();
    if (!chip) continue;
    const key = chip.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    chips.push(chip);
  }
  return chips;
}

/**
 * Serializes chips into the single-string format the search API boundary
 * expects. Re-normalizes, so raw arrays with whitespace, empties, or
 * comma-containing entries serialize consistently.
 */
export function serializeKeywordChips(chips: string[]): string {
  return parseKeywordChips(chips.join(",")).join(", ");
}
