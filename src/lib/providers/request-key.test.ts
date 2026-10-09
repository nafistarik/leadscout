import { describe, expect, test } from "bun:test";
import { EMPTY_FILTERS } from "@/lib/filter-leads";
import { providerRequestKey } from "@/lib/providers/index";

describe("providerRequestKey", () => {
  test("client-side refinements never change the provider cache key", () => {
    const base = { ...EMPTY_FILTERS, country: "Germany", city: "Berlin" };
    const refined = {
      ...base,
      hasWebsite: true,
      hasPhone: true,
      hasEmail: true,
      hasOpeningHours: true,
      minScore: 70,
      sort: "score" as const,
    };
    expect(providerRequestKey(refined)).toBe(providerRequestKey(base));
  });

  test("provider criteria changes produce distinct keys", () => {
    const base = { ...EMPTY_FILTERS, country: "Germany", city: "Berlin" };
    expect(providerRequestKey({ ...base, city: "Munich" })).not.toBe(providerRequestKey(base));
    expect(providerRequestKey({ ...base, keyword: "x" })).not.toBe(providerRequestKey(base));
  });
});
