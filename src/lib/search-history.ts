/**
 * Recent search history: submitted search criteria plus lightweight result
 * statistics. Full result sets are never stored — each entry keeps the
 * criteria, a timestamp, the number of businesses returned, and the ids of
 * returned businesses that list a website (for unique-website counts).
 * Only non-sensitive criteria (the same fields shareable URLs carry) are
 * kept. There is no backend; history lives in localStorage.
 */

export interface SearchHistoryEntry {
  id: string;
  country: string;
  city: string;
  category: string;
  keyword: string;
  maxResults: number;
  searchedAt: string;
  /** Businesses returned by this search (0 for entries recorded before stats). */
  resultCount: number;
  /** Ids of returned businesses that list a website (capped, see below). */
  websiteIds: string[];
}

export type HistoryInput = Omit<SearchHistoryEntry, "id" | "searchedAt">;

export const MAX_HISTORY_ENTRIES = 10;

/** Bounds per-entry website-id storage; maxResults never exceeds this. */
const MAX_WEBSITE_IDS = 50;

function toResultCount(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : 0;
}

function toWebsiteIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const id of value) {
    if (typeof id !== "string" || !id || seen.has(id)) continue;
    seen.add(id);
    result.push(id.slice(0, 200));
    if (result.length >= MAX_WEBSITE_IDS) break;
  }
  return result;
}

function isHistoryEntryShape(value: unknown): value is SearchHistoryEntry {
  if (typeof value !== "object" || value === null) return false;
  const e = value as Record<string, unknown>;
  return (
    typeof e.id === "string" &&
    e.id.length > 0 &&
    typeof e.country === "string" &&
    typeof e.city === "string" &&
    typeof e.category === "string" &&
    typeof e.keyword === "string" &&
    typeof e.maxResults === "number" &&
    Number.isFinite(e.maxResults) &&
    typeof e.searchedAt === "string"
  );
}

export function sanitizeHistory(value: unknown): SearchHistoryEntry[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const result: SearchHistoryEntry[] = [];
  for (const entry of value) {
    if (!isHistoryEntryShape(entry) || seen.has(entry.id)) continue;
    seen.add(entry.id);
    const raw = entry as unknown as Record<string, unknown>;
    result.push({
      id: entry.id,
      country: entry.country.slice(0, 80),
      city: entry.city.slice(0, 80),
      category: entry.category.slice(0, 60),
      keyword: entry.keyword.slice(0, 80),
      maxResults: Math.floor(entry.maxResults),
      searchedAt: entry.searchedAt,
      // Older entries predate statistics: they load as zero, never invented.
      resultCount: toResultCount(raw.resultCount),
      websiteIds: toWebsiteIds(raw.websiteIds),
    });
  }
  return result.slice(0, MAX_HISTORY_ENTRIES);
}

function sameQuery(a: HistoryInput, b: SearchHistoryEntry): boolean {
  return (
    a.country === b.country &&
    a.city === b.city &&
    a.category === b.category &&
    a.keyword === b.keyword &&
    a.maxResults === b.maxResults
  );
}

/**
 * Prepends a search unless it duplicates the most recent entry (avoids
 * consecutive duplicates from double submits/retries), then caps length.
 */
export function addHistoryEntry(
  entries: SearchHistoryEntry[],
  input: HistoryInput,
  id: string,
  nowIso: string,
): SearchHistoryEntry[] {
  if (entries.length > 0 && sameQuery(input, entries[0])) return entries;
  return [{ ...input, id, searchedAt: nowIso }, ...entries].slice(0, MAX_HISTORY_ENTRIES);
}

export function removeHistoryEntry(entries: SearchHistoryEntry[], id: string): SearchHistoryEntry[] {
  return entries.filter((entry) => entry.id !== id);
}

/** Short human label, e.g. "Dental Clinic · Berlin". */
export function describeHistoryEntry(entry: SearchHistoryEntry): string {
  const what = entry.category === "all" ? (entry.keyword.trim() || "All businesses") : entry.category;
  const where = [entry.city.trim(), entry.country.trim()].filter(Boolean).join(", ");
  return where ? `${what} · ${where}` : what;
}

export interface SearchStats {
  /** Successfully recorded searches. */
  totalSearches: number;
  /** Cumulative businesses returned across recorded searches. */
  totalResults: number;
  /** Unique businesses with a listed website across recorded searches. */
  uniqueWebsites: number;
}

/**
 * Single source of truth for the Dashboard statistics, derived from the
 * same history the Recent Searches section shows.
 */
export function summarizeSearchStats(entries: SearchHistoryEntry[]): SearchStats {
  const websites = new Set<string>();
  let totalResults = 0;
  for (const entry of entries) {
    totalResults += entry.resultCount;
    for (const id of entry.websiteIds) websites.add(id);
  }
  return {
    totalSearches: entries.length,
    totalResults,
    uniqueWebsites: websites.size,
  };
}
