import type { SearchMode } from "@/lib/search-params";

/**
 * Recent search history: provider-side search inputs only. Results are never
 * stored — clicking an entry always executes a fresh search — and only
 * non-sensitive criteria (the same fields shareable URLs carry) are kept.
 */

export interface SearchHistoryEntry {
  id: string;
  mode: SearchMode;
  country: string;
  city: string;
  category: string;
  keyword: string;
  maxResults: number;
  searchedAt: string;
}

export type HistoryInput = Omit<SearchHistoryEntry, "id" | "searchedAt">;

export const MAX_HISTORY_ENTRIES = 10;

function isHistoryEntryShape(value: unknown): value is SearchHistoryEntry {
  if (typeof value !== "object" || value === null) return false;
  const e = value as Record<string, unknown>;
  return (
    typeof e.id === "string" &&
    e.id.length > 0 &&
    (e.mode === "live" || e.mode === "demo") &&
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
    result.push({
      id: entry.id,
      mode: entry.mode,
      country: entry.country.slice(0, 80),
      city: entry.city.slice(0, 80),
      category: entry.category.slice(0, 60),
      keyword: entry.keyword.slice(0, 80),
      maxResults: Math.floor(entry.maxResults),
      searchedAt: entry.searchedAt,
    });
  }
  return result.slice(0, MAX_HISTORY_ENTRIES);
}

function sameQuery(a: HistoryInput, b: SearchHistoryEntry): boolean {
  return (
    a.mode === b.mode &&
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
