import type { DemoLead } from "@/types/lead";
import type { Company } from "@/types/company";

/**
 * Provider-side criteria: sent to the data provider (or applied to the demo
 * dataset) when the user submits a search. Changing these never filters
 * locally — a new search is required.
 */
export interface ProviderCriteria {
  country: string;
  city: string;
  category: string;
  keyword: string;
  maxResults: number;
}

/** Client-side result options: applied locally to fetched results, no network. */
export type SortOrder = "provider" | "relevance" | "name" | "info" | "score" | "opportunity";

export interface LocalResultOptions {
  hasWebsite: boolean;
  hasPhone: boolean;
  hasEmail: boolean;
  hasOpeningHours: boolean;
  /** Minimum heuristic score (0 = off). Live mode only. */
  minScore: number;
  sort: SortOrder;
}

export interface LeadSearchFilters extends ProviderCriteria, LocalResultOptions {}

export const EMPTY_FILTERS: LeadSearchFilters = {
  country: "all",
  city: "",
  category: "all",
  keyword: "",
  maxResults: 10,
  hasWebsite: false,
  hasPhone: false,
  hasEmail: false,
  hasOpeningHours: false,
  minScore: 0,
  sort: "provider",
};

/** Keys that participate in provider requests and cache keys. */
export const PROVIDER_FILTER_KEYS = ["country", "city", "category", "keyword", "maxResults"] as const;

/** True when any client-side narrowing is active. */
export function hasLocalFilters(filters: LocalResultOptions): boolean {
  return (
    filters.hasWebsite ||
    filters.hasPhone ||
    filters.hasEmail ||
    filters.hasOpeningHours ||
    filters.minScore > 0 ||
    filters.sort !== "provider"
  );
}

/** True when any provider-side criterion differs from the empty form. */
export function hasActiveProviderCriteria(filters: ProviderCriteria): boolean {
  const country = filters.country.trim();
  return (
    (country !== "" && country !== "all") ||
    filters.city.trim() !== "" ||
    filters.category !== "all" ||
    filters.keyword.trim() !== "" ||
    filters.maxResults !== EMPTY_FILTERS.maxResults
  );
}

/**
 * Local demo filtering for Part 1.
 *
 * Pure function over the centralized sample dataset — no network calls.
 * Part 2 will replace/augment this with a public-data provider (e.g.
 * OpenStreetMap / Overpass) behind the same filter shape, so the UI
 * does not need a rewrite.
 */
export function filterDemoLeads(leads: DemoLead[], filters: LeadSearchFilters): DemoLead[] {
  const cityQuery = filters.city.trim().toLowerCase();
  const keywordQuery = filters.keyword.trim().toLowerCase();

  const matched = leads.filter((lead) => {
    if (filters.country !== "all" && lead.country !== filters.country) return false;
    if (filters.category !== "all" && lead.category !== filters.category) return false;
    if (cityQuery && !lead.city.toLowerCase().includes(cityQuery)) return false;
    if (keywordQuery) {
      const haystack = `${lead.companyName} ${lead.category} ${lead.city} ${lead.country}`.toLowerCase();
      if (!haystack.includes(keywordQuery)) return false;
    }
    return true;
  });

  const limit = Number.isFinite(filters.maxResults) && filters.maxResults > 0 ? Math.floor(filters.maxResults) : 10;
  return matched.slice(0, limit);
}

export function describeActiveFilters(filters: LeadSearchFilters): string[] {
  const parts: string[] = [];
  if (filters.country !== "all") parts.push(`Country: ${filters.country}`);
  if (filters.city.trim()) parts.push(`City: ${filters.city.trim()}`);
  if (filters.category !== "all") parts.push(`Category: ${filters.category}`);
  if (filters.keyword.trim()) parts.push(`Keyword: “${filters.keyword.trim()}”`);
  return parts;
}

/* ------------------------------------------------------------------
 * Client-side result filtering and sorting (Part 4).
 *
 * These operate on already-fetched results only and never issue network
 * requests. Availability checks use actual field presence — never inferred
 * values. All sorting is deterministic with a stable index tiebreak, and
 * missing values sort consistently (last within their direction).
 * ------------------------------------------------------------------ */

export interface AvailabilitySelection {
  hasWebsite: boolean;
  hasPhone: boolean;
  hasEmail: boolean;
  hasOpeningHours: boolean;
}

/** Narrows live results by actual contact-field presence. */
export function applyAvailabilityFilters(
  companies: Company[],
  selection: AvailabilitySelection,
): Company[] {
  return companies.filter((company) => {
    if (selection.hasWebsite && !company.website) return false;
    if (selection.hasPhone && !company.phone) return false;
    if (selection.hasEmail && !company.email) return false;
    if (selection.hasOpeningHours && !company.openingHours) return false;
    return true;
  });
}

/**
 * Narrows demo records by their availability flags. Demo records carry no
 * email or opening-hours data, so those selections are unsupported here and
 * the demo UI does not offer them.
 */
export function applyDemoAvailabilityFilters(
  leads: DemoLead[],
  selection: Pick<AvailabilitySelection, "hasWebsite" | "hasPhone">,
): DemoLead[] {
  return leads.filter((lead) => {
    if (selection.hasWebsite && !lead.websiteAvailable) return false;
    if (selection.hasPhone && !lead.phoneAvailable) return false;
    return true;
  });
}

/** Keeps records whose heuristic score meets the threshold. */
export function applyMinScoreFilter<T extends { id: string }>(
  items: T[],
  minScore: number,
  scoreOf: (item: T) => number | null,
): T[] {
  if (!(minScore > 0)) return items;
  return items.filter((item) => {
    const score = scoreOf(item);
    return score !== null && score >= minScore;
  });
}

/** Number of present contact fields — the "info completeness" measure. */
export function infoCompleteness(company: Company): number {
  let count = 0;
  if (company.website) count += 1;
  if (company.phone) count += 1;
  if (company.email) count += 1;
  if (company.openingHours) count += 1;
  return count;
}

export function demoInfoCompleteness(lead: DemoLead): number {
  return (lead.websiteAvailable ? 1 : 0) + (lead.phoneAvailable ? 1 : 0);
}

function relevanceRank(name: string, category: string, keyword: string): number {
  const query = keyword.trim().toLowerCase();
  if (!query) return 0;
  const haystack = `${name} ${category}`.toLowerCase();
  const index = haystack.indexOf(query);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

export interface SortContext {
  keyword: string;
  scoreOf: (id: string) => number | null;
  infoOf: (id: string) => number;
  /** Pitch-opportunity rank (lower = better target); live results only. */
  opportunityOf?: (id: string) => number | null;
}

/**
 * Deterministically sorts records by id-keyed context (names are read by the
 * caller to keep this function data-shape agnostic). Unknown ids score
 * null/zero and sort last. Original order breaks all ties (stable).
 */
export function sortByIdOrder<T extends { id: string }>(
  items: T[],
  names: Map<string, { name: string; category: string }>,
  sort: SortOrder,
  context: SortContext,
): T[] {
  if (sort === "provider") return items;
  const decorated = items.map((item, index) => ({ item, index }));
  const rank = (id: string): number => {
    switch (sort) {
      case "relevance": {
        const entry = names.get(id);
        if (!entry) return Number.MAX_SAFE_INTEGER;
        return relevanceRank(entry.name, entry.category, context.keyword);
      }
      case "info":
        return -context.infoOf(id);
      case "score": {
        const score = context.scoreOf(id);
        return score === null ? Number.MAX_SAFE_INTEGER : -score;
      }
      case "opportunity": {
        const rank = context.opportunityOf?.(id) ?? null;
        return rank === null ? Number.MAX_SAFE_INTEGER : rank;
      }
      case "name":
        return 0;
    }
  };
  decorated.sort((a, b) => {
    if (sort === "name") {
      const nameA = names.get(a.item.id)?.name ?? "";
      const nameB = names.get(b.item.id)?.name ?? "";
      const compared = nameA.localeCompare(nameB, undefined, { sensitivity: "base" });
      if (compared !== 0) return compared;
      return a.index - b.index;
    }
    const rankA = rank(a.item.id);
    const rankB = rank(b.item.id);
    if (rankA !== rankB) return rankA - rankB;
    return a.index - b.index;
  });
  return decorated.map((entry) => entry.item);
}
