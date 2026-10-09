import { describe, expect, test } from "bun:test";
import { DEMO_LEADS } from "@/data/demo-leads";
import {
  EMPTY_FILTERS,
  applyAvailabilityFilters,
  applyDemoAvailabilityFilters,
  applyMinScoreFilter,
  demoInfoCompleteness,
  describeActiveFilters,
  filterDemoLeads,
  hasActiveProviderCriteria,
  hasLocalFilters,
  infoCompleteness,
  sortByIdOrder,
} from "@/lib/filter-leads";
import type { Company } from "@/types/company";

function company(overrides: Partial<Company> = {}): Company {
  return {
    id: "osm:node/1",
    provenance: "osm",
    name: "Acme",
    category: "Bakery",
    city: "Berlin",
    country: "Germany",
    locationLabel: "Berlin, Germany",
    lat: 52.5,
    lon: 13.4,
    website: null,
    phone: null,
    email: null,
    openingHours: null,
    source: "OpenStreetMap",
    sourceUrl: null,
    tags: {},
    ...overrides,
  };
}

describe("filterDemoLeads", () => {
  test("returns a capped slice when no filters are set", () => {
    expect(filterDemoLeads(DEMO_LEADS, EMPTY_FILTERS)).toHaveLength(10);
    expect(filterDemoLeads(DEMO_LEADS, { ...EMPTY_FILTERS, maxResults: 5 })).toHaveLength(5);
  });

  test("filters by country, category, city, and keyword", () => {
    expect(
      filterDemoLeads(DEMO_LEADS, { ...EMPTY_FILTERS, country: "Germany", maxResults: 50 }),
    ).toHaveLength(4);
    expect(
      filterDemoLeads(DEMO_LEADS, { ...EMPTY_FILTERS, keyword: "yoga", maxResults: 50 })[0].id,
    ).toBe("demo-07");
    expect(
      filterDemoLeads(DEMO_LEADS, { ...EMPTY_FILTERS, city: "ber", maxResults: 50 }).map((l) => l.id),
    ).toEqual(["demo-02"]);
  });

  test("returns empty when nothing matches and tolerates bad limits", () => {
    expect(
      filterDemoLeads(DEMO_LEADS, { ...EMPTY_FILTERS, country: "Germany", city: "Austin" }),
    ).toHaveLength(0);
    expect(filterDemoLeads(DEMO_LEADS, { ...EMPTY_FILTERS, maxResults: -3 })).toHaveLength(10);
  });
});

describe("describeActiveFilters", () => {
  test("describes only active filters", () => {
    expect(describeActiveFilters(EMPTY_FILTERS)).toEqual([]);
    expect(
      describeActiveFilters({ ...EMPTY_FILTERS, country: "Germany", keyword: "x" }),
    ).toEqual(["Country: Germany", "Keyword: “x”"]);
  });
});

describe("hasLocalFilters / hasActiveProviderCriteria", () => {
  test("detects local refinements", () => {
    expect(hasLocalFilters(EMPTY_FILTERS)).toBe(false);
    expect(hasLocalFilters({ ...EMPTY_FILTERS, hasWebsite: true })).toBe(true);
    expect(hasLocalFilters({ ...EMPTY_FILTERS, minScore: 40 })).toBe(true);
    expect(hasLocalFilters({ ...EMPTY_FILTERS, sort: "name" })).toBe(true);
  });

  test("detects provider criteria in both country conventions", () => {
    expect(hasActiveProviderCriteria(EMPTY_FILTERS)).toBe(false);
    expect(hasActiveProviderCriteria({ ...EMPTY_FILTERS, city: "Berlin" })).toBe(true);
    expect(hasActiveProviderCriteria({ ...EMPTY_FILTERS, country: "" })).toBe(false);
    expect(hasActiveProviderCriteria({ ...EMPTY_FILTERS, country: "Germany" })).toBe(true);
  });
});

describe("applyAvailabilityFilters", () => {
  const a = company({ id: "osm:node/1", website: "https://a.example", phone: "1" });
  const b = company({ id: "osm:node/2", email: "b@example.com", openingHours: "Mo-Fr" });
  const c = company({ id: "osm:node/3" });

  test("combines multiple availability requirements", () => {
    expect(applyAvailabilityFilters([a, b, c], EMPTY_FILTERS)).toHaveLength(3);
    expect(
      applyAvailabilityFilters([a, b, c], { ...EMPTY_FILTERS, hasWebsite: true, hasPhone: true }).map((x) => x.id),
    ).toEqual(["osm:node/1"]);
    expect(
      applyAvailabilityFilters([a, b, c], { ...EMPTY_FILTERS, hasEmail: true }).map((x) => x.id),
    ).toEqual(["osm:node/2"]);
    expect(
      applyAvailabilityFilters([a, b, c], { ...EMPTY_FILTERS, hasOpeningHours: true, hasWebsite: true }),
    ).toHaveLength(0);
  });

  test("is synchronous and never returns a promise (no network)", () => {
    const result = applyAvailabilityFilters([a], EMPTY_FILTERS);
    expect(result).not.toBeInstanceOf(Promise);
  });
});

describe("applyDemoAvailabilityFilters", () => {
  test("uses sample flags; email/hours are unsupported by shape", () => {
    const withBoth = DEMO_LEADS.filter((lead) => lead.websiteAvailable && lead.phoneAvailable);
    expect(
      applyDemoAvailabilityFilters(DEMO_LEADS, { hasWebsite: true, hasPhone: true }).length,
    ).toBe(withBoth.length);
    expect(
      applyDemoAvailabilityFilters(DEMO_LEADS, { hasWebsite: false, hasPhone: false }),
    ).toHaveLength(DEMO_LEADS.length);
  });
});

describe("applyMinScoreFilter", () => {
  test("keeps records at or above the threshold; off means all", () => {
    const items = [{ id: "a" }, { id: "b" }, { id: "c" }];
    const scoreOf = (item: { id: string }): number | null =>
      item.id === "a" ? 80 : item.id === "b" ? 40 : null;
    expect(applyMinScoreFilter(items, 0, scoreOf)).toHaveLength(3);
    expect(applyMinScoreFilter(items, 40, scoreOf).map((x) => x.id)).toEqual(["a", "b"]);
    expect(applyMinScoreFilter(items, 70, scoreOf).map((x) => x.id)).toEqual(["a"]);
    expect(applyMinScoreFilter(items, -5, scoreOf)).toHaveLength(3);
  });
});

describe("infoCompleteness", () => {
  test("counts present fields only", () => {
    expect(infoCompleteness(company())).toBe(0);
    expect(infoCompleteness(company({ website: "x", email: "y" }))).toBe(2);
    expect(demoInfoCompleteness(DEMO_LEADS[0])).toBeLessThan(3);
  });
});

describe("sortByIdOrder", () => {
  const items = [
    company({ id: "1", name: "delta Bakery", category: "Bakery" }),
    company({ id: "2", name: "Alpha Bakery", category: "Bakery" }),
    company({ id: "3", name: "alpha Bakery", category: "Cafe" }),
  ];
  const names = new Map(items.map((c) => [c.id, { name: c.name, category: c.category }]));
  const ctx = { keyword: "", scoreOf: (): number | null => null, infoOf: (): number => 0 };

  test("provider order is stable and untouched", () => {
    expect(sortByIdOrder(items, names, "provider", ctx).map((x) => x.id)).toEqual(["1", "2", "3"]);
  });

  test("name sort is case-insensitive with stable ties", () => {
    expect(sortByIdOrder(items, names, "name", ctx).map((x) => x.id)).toEqual(["2", "3", "1"]);
  });

  test("relevance ranks keyword position; missing keyword keeps order", () => {
    const ranked = sortByIdOrder(items, names, "relevance", { ...ctx, keyword: "alpha" });
    expect(ranked.map((x) => x.id)).toEqual(["2", "3", "1"]);
    expect(sortByIdOrder(items, names, "relevance", ctx).map((x) => x.id)).toEqual(["1", "2", "3"]);
  });

  test("info and score sort missing values last, ties stable", () => {
    const infoCtx = {
      ...ctx,
      infoOf: (id: string) => (id === "3" ? 2 : 0),
    };
    expect(sortByIdOrder(items, names, "info", infoCtx).map((x) => x.id)).toEqual(["3", "1", "2"]);
    const scoreCtx = {
      ...ctx,
      scoreOf: (id: string) => (id === "2" ? 90 : id === "1" ? 10 : null),
    };
    expect(sortByIdOrder(items, names, "score", scoreCtx).map((x) => x.id)).toEqual(["2", "1", "3"]);
  });

  test("sorting is deterministic across runs", () => {
    const first = sortByIdOrder(items, names, "name", ctx).map((x) => x.id).join(",");
    const second = sortByIdOrder(items, names, "name", ctx).map((x) => x.id).join(",");
    expect(first).toBe(second);
  });
});
