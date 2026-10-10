import { describe, expect, test } from "bun:test";
import { EMPTY_FILTERS } from "@/lib/filter-leads";
import { providerRequestKey } from "@/lib/providers/index";

describe("providerRequestKey", () => {
  test("identical criteria share a cache key", () => {
    const base = { ...EMPTY_FILTERS, country: "Germany", city: "Berlin" };
    expect(providerRequestKey({ ...base })).toBe(providerRequestKey(base));
  });

  test("provider criteria changes produce distinct keys", () => {
    const base = { ...EMPTY_FILTERS, country: "Germany", city: "Berlin" };
    expect(providerRequestKey({ ...base, city: "Munich" })).not.toBe(providerRequestKey(base));
    expect(providerRequestKey({ ...base, keyword: "x" })).not.toBe(providerRequestKey(base));
  });
});
