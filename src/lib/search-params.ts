import { MAX_RESULTS_OPTIONS } from "@/data/search-options";
import { LIVE_CATEGORIES } from "@/data/search-options";
import { EMPTY_FILTERS } from "@/lib/filter-leads";
import type { LeadSearchFilters } from "@/lib/filter-leads";
import type { SearchHistoryEntry } from "@/lib/search-history";

/** Query parameter that triggers exactly one automatic search on arrival. */
export const AUTO_RUN_PARAM = "run";

function parseMaxResults(value: string | null): number {
  const num = Number(value);
  const allowed: readonly number[] = MAX_RESULTS_OPTIONS;
  return allowed.includes(num) ? num : EMPTY_FILTERS.maxResults;
}

function cleanText(value: string | null, maxLength: number): string {
  return (value ?? "").trim().slice(0, maxLength);
}

/**
 * Restores and normalizes live-search settings from URL parameters. Invalid
 * or unknown values fall back to defaults — never throws, never trusts
 * input. Only non-sensitive search criteria are ever represented here.
 */
export function searchParamsToFilters(params: URLSearchParams): LeadSearchFilters {
  const category = cleanText(params.get("category"), 60);
  return {
    country: cleanText(params.get("country"), 80),
    city: cleanText(params.get("city"), 80),
    category: category === "all" || LIVE_CATEGORIES.includes(category) ? category || "all" : "all",
    keyword: cleanText(params.get("keyword"), 80),
    maxResults: parseMaxResults(params.get("max")),
  };
}

/**
 * Serializes live-search settings to shareable URL parameters. Defaults are
 * omitted to keep URLs short; nothing personal or private is included.
 */
export function filtersToSearchParams(filters: LeadSearchFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.country.trim() !== "") {
    params.set("country", filters.country.trim());
  }
  if (filters.city.trim()) params.set("city", filters.city.trim());
  if (filters.category !== "all") params.set("category", filters.category);
  if (filters.keyword.trim()) params.set("keyword", filters.keyword.trim());
  if (filters.maxResults !== EMPTY_FILTERS.maxResults) {
    params.set("max", String(filters.maxResults));
  }
  return params;
}

/**
 * Converts a stored history entry back into validated search filters.
 * Stale categories or limits fall back to defaults — never throws.
 */
export function historyEntryToFilters(entry: SearchHistoryEntry): LeadSearchFilters {
  return {
    country: entry.country,
    city: entry.city,
    category: LIVE_CATEGORIES.includes(entry.category) ? entry.category : "all",
    keyword: entry.keyword,
    maxResults: (MAX_RESULTS_OPTIONS as readonly number[]).includes(entry.maxResults)
      ? entry.maxResults
      : EMPTY_FILTERS.maxResults,
  };
}
