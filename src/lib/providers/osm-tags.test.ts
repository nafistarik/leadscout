import { describe, expect, test } from "bun:test";
import { DEMO_CATEGORIES } from "@/data/demo-leads";
import { hasExactTagMapping, tagsForCategory } from "@/lib/providers/osm-tags";

describe("tagsForCategory", () => {
  test("every demo category resolves to at least one tag pair", () => {
    for (const category of DEMO_CATEGORIES) {
      expect(tagsForCategory(category).length).toBeGreaterThan(0);
    }
  });

  test("unknown and 'all' categories fall back to generic business tags", () => {
    expect(tagsForCategory("all").map((t) => t.key)).toEqual(["shop", "office", "craft"]);
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
});
