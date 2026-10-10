import { describe, expect, test } from "bun:test";
import {
  EMPTY_FILTERS,
  describeActiveFilters,
  hasActiveProviderCriteria,
  sortByIdOrder,
} from "@/lib/filter-leads";

const items = [
  { id: "1", name: "delta Bakery", category: "Bakery" },
  { id: "2", name: "Alpha Bakery", category: "Bakery" },
  { id: "3", name: "alpha Bakery", category: "Cafe" },
];
const names = new Map(items.map((c) => [c.id, { name: c.name, category: c.category }]));

describe("describeActiveFilters", () => {
  test("describes only active filters", () => {
    expect(describeActiveFilters(EMPTY_FILTERS)).toEqual([]);
    expect(
      describeActiveFilters({ ...EMPTY_FILTERS, country: "Germany", keyword: "x" }),
    ).toEqual(["Country: Germany", "Keyword: “x”"]);
  });
});

describe("hasActiveProviderCriteria", () => {
  test("detects provider criteria in both country conventions", () => {
    expect(hasActiveProviderCriteria(EMPTY_FILTERS)).toBe(false);
    expect(hasActiveProviderCriteria({ ...EMPTY_FILTERS, city: "Berlin" })).toBe(true);
    expect(hasActiveProviderCriteria({ ...EMPTY_FILTERS, country: "" })).toBe(false);
    expect(hasActiveProviderCriteria({ ...EMPTY_FILTERS, country: "Germany" })).toBe(true);
  });
});

describe("sortByIdOrder", () => {
  test("provider order is stable and untouched", () => {
    expect(sortByIdOrder(items, names, "provider").map((x) => x.id)).toEqual(["1", "2", "3"]);
  });

  test("name sort is case-insensitive with stable ties", () => {
    expect(sortByIdOrder(items, names, "name").map((x) => x.id)).toEqual(["2", "3", "1"]);
  });

  test("sorting is deterministic across runs", () => {
    const first = sortByIdOrder(items, names, "name").map((x) => x.id).join(",");
    const second = sortByIdOrder(items, names, "name").map((x) => x.id).join(",");
    expect(first).toBe(second);
  });
});
