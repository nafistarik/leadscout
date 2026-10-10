import { DEMO_COUNTRIES, MAX_RESULTS_OPTIONS } from "@/data/demo-leads";
import { LIVE_CATEGORIES } from "@/data/search-options";
import { EMPTY_FILTERS } from "@/lib/filter-leads";
import type { LeadSearchFilters, SortOrder } from "@/lib/filter-leads";

export type SearchMode = "live" | "demo";

const SORT_ORDERS: readonly SortOrder[] = ["provider", "relevance", "name", "info", "score"];
const MIN_SCORES = [0, 40, 70] as const;

function parseFlag(value: string | null): boolean {
  if (value === null) return false;
  return value === "1" || value.toLowerCase() === "true";
}

function parseMaxResults(value: string | null): number {
  const num = Number(value);
  const allowed: readonly number[] = MAX_RESULTS_OPTIONS;
  return allowed.includes(num) ? num : EMPTY_FILTERS.maxResults;
}

function parseSort(value: string | null): SortOrder {
  return (SORT_ORDERS as readonly string[]).includes(value ?? "")
    ? (value as SortOrder)
    : "provider";
}

function parseMinScore(value: string | null): number {
  const num = Number(value);
  return (MIN_SCORES as readonly number[]).includes(num) ? num : 0;
}

function cleanText(value: string | null, maxLength: number): string {
  return (value ?? "").trim().slice(0, maxLength);
}

export interface RestoredSearch {
  mode: SearchMode;
  filters: LeadSearchFilters;
}

/**
 * Restores and normalizes search settings from URL parameters. Invalid or
 * unknown values fall back to defaults — never throws, never trusts input.
 * Only non-sensitive search criteria are ever represented here.
 */
export function searchParamsToFilters(params: URLSearchParams): RestoredSearch {
  const mode: SearchMode = params.get("mode") === "demo" ? "demo" : "live";
  const rawCountry = cleanText(params.get("country"), 80);
  const country =
    mode === "demo"
      ? DEMO_COUNTRIES.includes(rawCountry)
        ? rawCountry
        : "all"
      : rawCountry;
  const category = cleanText(params.get("category"), 60);
  return {
    mode,
    filters: {
      country,
      city: cleanText(params.get("city"), 80),
      category: category === "all" || LIVE_CATEGORIES.includes(category) ? category || "all" : "all",
      keyword: cleanText(params.get("keyword"), 80),
      maxResults: parseMaxResults(params.get("max")),
      hasWebsite: parseFlag(params.get("web")),
      hasPhone: parseFlag(params.get("phone")),
      hasEmail: parseFlag(params.get("email")),
      hasOpeningHours: parseFlag(params.get("hours")),
      minScore: parseMinScore(params.get("minScore")),
      sort: parseSort(params.get("sort")),
    },
  };
}

/**
 * Serializes search settings to shareable URL parameters. Defaults are
 * omitted to keep URLs short; nothing personal or private is included.
 */
export function filtersToSearchParams(mode: SearchMode, filters: LeadSearchFilters): URLSearchParams {
  const params = new URLSearchParams();
  params.set("mode", mode);
  if (mode === "demo" ? filters.country !== "all" : filters.country.trim() !== "") {
    params.set("country", filters.country.trim());
  }
  if (filters.city.trim()) params.set("city", filters.city.trim());
  if (filters.category !== "all") params.set("category", filters.category);
  if (filters.keyword.trim()) params.set("keyword", filters.keyword.trim());
  if (filters.maxResults !== EMPTY_FILTERS.maxResults) {
    params.set("max", String(filters.maxResults));
  }
  if (filters.hasWebsite) params.set("web", "1");
  if (filters.hasPhone) params.set("phone", "1");
  if (filters.hasEmail) params.set("email", "1");
  if (filters.hasOpeningHours) params.set("hours", "1");
  if (filters.minScore > 0) params.set("minScore", String(filters.minScore));
  if (filters.sort !== "provider") params.set("sort", filters.sort);
  return params;
}

/** Stable key for loop-safe URL/form synchronization. */
export function restoredSearchKey(restored: RestoredSearch): string {
  return JSON.stringify(restored);
}

/**
 * Key for a URL the app itself just wrote (submit/reset/preset). Computed
 * from the serialized parameters — exactly what the landing navigation will
 * parse — so the sync logic can recognize its own writes and must never
 * treat them as external state to adopt (which would clobber keystrokes
 * typed after submitting).
 */
export function writtenUrlKey(params: URLSearchParams): string {
  return restoredSearchKey(searchParamsToFilters(params));
}
