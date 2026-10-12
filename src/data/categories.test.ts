import { describe, expect, test } from "bun:test";
import { BUSINESS_CATEGORIES, CATEGORY_OPTIONS, LIVE_CATEGORIES } from "@/data/categories";
import { GENERIC_BUSINESS_TAGS, tagsForCategory } from "@/lib/providers/osm-tags";

describe("business categories", () => {
  test("dataset stays in sync with the provider-facing identifier list", () => {
    expect(LIVE_CATEGORIES).toEqual(BUSINESS_CATEGORIES.map((category) => category.value));
  });

  test("values are unique, URL-safe in length, and fully labeled", () => {
    const values = BUSINESS_CATEGORIES.map((category) => category.value);
    expect(new Set(values).size).toBe(values.length);
    for (const category of BUSINESS_CATEGORIES) {
      expect(category.value.length).toBeGreaterThan(0);
      // search-params.ts slices category params at 60 chars.
      expect(category.value.length <= 60).toBe(true);
      expect(category.label).toBe(category.value);
      expect(category.group.trim().length).toBeGreaterThan(0);
      expect(category.aliases.length).toBeGreaterThan(0);
    }
  });

  test("every displayed category translates to real provider tags (never silently 'all')", () => {
    for (const category of BUSINESS_CATEGORIES) {
      const tags = tagsForCategory(category.value);
      expect(tags.length).toBeGreaterThan(0);
      // Unmapped values fall back to the generic tag set by reference —
      // that must never happen for a category we display as a filter.
      expect(tags).not.toBe(GENERIC_BUSINESS_TAGS);
    }
  });

  test("All Businesses stays an unrestricted search, listed first", () => {
    expect(CATEGORY_OPTIONS[0]).toEqual({ value: "all", label: "All businesses" });
    expect(tagsForCategory("all")).toBe(GENERIC_BUSINESS_TAGS);
    expect(CATEGORY_OPTIONS).toHaveLength(BUSINESS_CATEGORIES.length + 1);
  });

  test("spot-checks map to the documented OSM tags", () => {
    expect(tagsForCategory("Pharmacy")).toEqual([
      { key: "amenity", value: "pharmacy", label: "Pharmacy" },
    ]);
    expect(tagsForCategory("Hotel")).toEqual([
      { key: "tourism", value: "hotel", label: "Hotel" },
    ]);
    expect(tagsForCategory("School")).toEqual([
      { key: "amenity", value: "school", label: "School" },
    ]);
    expect(tagsForCategory("Gym")).toEqual([
      { key: "leisure", value: "fitness_centre", label: "Gym" },
    ]);
  });
});
