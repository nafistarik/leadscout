/**
 * Search criteria submitted to the live company provider. Changing any of
 * these requires a new search — nothing here filters locally.
 */
export interface LeadSearchFilters {
  country: string;
  city: string;
  category: string;
  keyword: string;
  maxResults: number;
}

/** Result ordering applied locally to fetched results, no network. */
export type SortOrder = "provider" | "name";

export const EMPTY_FILTERS: LeadSearchFilters = {
  country: "",
  city: "",
  category: "all",
  keyword: "",
  maxResults: 10,
};

/** Keys that participate in provider requests and cache keys. */
export const PROVIDER_FILTER_KEYS = ["country", "city", "category", "keyword", "maxResults"] as const;

/** True when any provider-side criterion differs from the empty form. */
export function hasActiveProviderCriteria(filters: LeadSearchFilters): boolean {
  const country = filters.country.trim();
  return (
    (country !== "" && country !== "all") ||
    filters.city.trim() !== "" ||
    filters.category !== "all" ||
    filters.keyword.trim() !== "" ||
    filters.maxResults !== EMPTY_FILTERS.maxResults
  );
}

export function describeActiveFilters(filters: LeadSearchFilters): string[] {
  const parts: string[] = [];
  if (filters.country !== "all" && filters.country.trim()) parts.push(`Country: ${filters.country.trim()}`);
  if (filters.city.trim()) parts.push(`City: ${filters.city.trim()}`);
  if (filters.category !== "all") parts.push(`Category: ${filters.category}`);
  if (filters.keyword.trim()) parts.push(`Keyword: “${filters.keyword.trim()}”`);
  return parts;
}

/**
 * Deterministically sorts records by id-keyed names. Original provider order
 * breaks all ties (stable). "provider" returns the input untouched.
 */
export function sortByIdOrder<T extends { id: string }>(
  items: T[],
  names: Map<string, { name: string; category: string }>,
  sort: SortOrder,
): T[] {
  if (sort === "provider") return items;
  const decorated = items.map((item, index) => ({ item, index }));
  decorated.sort((a, b) => {
    const nameA = names.get(a.item.id)?.name ?? "";
    const nameB = names.get(b.item.id)?.name ?? "";
    const compared = nameA.localeCompare(nameB, undefined, { sensitivity: "base" });
    if (compared !== 0) return compared;
    return a.index - b.index;
  });
  return decorated.map((entry) => entry.item);
}
