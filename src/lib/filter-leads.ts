import type { DemoLead } from "@/types/lead";

export interface LeadSearchFilters {
  country: string;
  city: string;
  category: string;
  keyword: string;
  maxResults: number;
}

export const EMPTY_FILTERS: LeadSearchFilters = {
  country: "all",
  city: "",
  category: "all",
  keyword: "",
  maxResults: 10,
};

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
