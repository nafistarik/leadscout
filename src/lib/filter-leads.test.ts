import { describe, expect, test } from "bun:test";
import { DEMO_LEADS } from "@/data/demo-leads";
import { EMPTY_FILTERS, describeActiveFilters, filterDemoLeads } from "@/lib/filter-leads";

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
