import { describe, expect, test } from "bun:test";
import { LIVE_CATEGORIES } from "@/data/search-options";
import { GENERIC_BUSINESS_TAGS, hasExactTagMapping, tagsForCategory } from "@/lib/providers/osm-tags";

describe("tagsForCategory", () => {
  test("every live category resolves to at least one tag pair", () => {
    for (const category of LIVE_CATEGORIES) {
      expect(tagsForCategory(category).length).toBeGreaterThan(0);
    }
  });

  test("unknown and 'all' categories fall back to generic business tags", () => {
    expect(tagsForCategory("all")).toEqual(GENERIC_BUSINESS_TAGS);
    expect(tagsForCategory("No Such Category")).toEqual(tagsForCategory("all"));
  });

  test("known mappings use concrete tags", () => {
    expect(tagsForCategory("Bakery")).toEqual([
      { key: "shop", value: "bakery", label: "Bakery" },
    ]);
    expect(tagsForCategory("Plumber")).toEqual([
      { key: "craft", value: "plumber", label: "Plumber" },
    ]);
  });

  test("approximate mappings are flagged", () => {
    expect(hasExactTagMapping("Bakery")).toBe(true);
    expect(hasExactTagMapping("Yoga Studio")).toBe(false);
    expect(hasExactTagMapping("all")).toBe(false);
  });

  test("coffee shops map to amenity=cafe, distinct from coffee retail", () => {
    expect(tagsForCategory("Coffee Shop")).toEqual([
      { key: "amenity", value: "cafe", label: "Coffee Shop" },
    ]);
    expect(hasExactTagMapping("Coffee Shop")).toBe(true);
    // shop=coffee (retail beans) is a different concept and stays separate.
    expect(tagsForCategory("Coffee Roaster")).toEqual([
      { key: "shop", value: "coffee", label: "Coffee Roaster" },
    ]);
  });

  test("restaurants map to amenity=restaurant and fast_food with distinct labels", () => {
    expect(tagsForCategory("Restaurant")).toEqual([
      { key: "amenity", value: "restaurant", label: "Restaurant" },
      { key: "amenity", value: "fast_food", label: "Fast Food" },
    ]);
    expect(hasExactTagMapping("Restaurant")).toBe(true);
  });

  test("generic fallback covers food-service amenities, not every OSM object", () => {
    const generic = tagsForCategory("all");
    const pairs = generic.map((t) => `${t.key}=${t.value}`);
    expect(pairs).toContain("amenity=restaurant");
    expect(pairs).toContain("amenity=cafe");
    expect(pairs).toContain("amenity=fast_food");
    // Still bounded: no wildcard amenity/* that would match schools/hospitals.
    expect(generic.some((t) => t.key === "amenity" && t.value === null)).toBe(false);
  });

  test("every live category resolves to at least one tag pair", () => {
    for (const category of LIVE_CATEGORIES) {
      expect(tagsForCategory(category).length).toBeGreaterThan(0);
    }
    expect(LIVE_CATEGORIES).toContain("Coffee Shop");
    expect(LIVE_CATEGORIES).toContain("Restaurant");
  });

  test("dental-clinic mapping is unchanged (regression)", () => {
    expect(tagsForCategory("Dental Clinic")).toEqual([
      { key: "amenity", value: "dentist", label: "Dental Clinic" },
    ]);
    expect(hasExactTagMapping("Dental Clinic")).toBe(true);
  });
});
