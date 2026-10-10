import { describe, expect, test } from "bun:test";
import { EMPTY_FILTERS } from "@/lib/filter-leads";
import {
  filtersToSearchParams,
  searchParamsToFilters,
} from "@/lib/search-params";

function params(query: string): URLSearchParams {
  return new URLSearchParams(query);
}

describe("searchParamsToFilters", () => {
  test("restores a full shareable URL", () => {
    const restored = searchParamsToFilters(
      params("country=Germany&city=Berlin&category=Bakery&keyword=rye&max=25"),
    );
    expect(restored).toEqual({
      country: "Germany",
      city: "Berlin",
      category: "Bakery",
      keyword: "rye",
      maxResults: 25,
    });
  });

  test("defaults safely on empty or unknown input", () => {
    expect(searchParamsToFilters(params(""))).toEqual(EMPTY_FILTERS);
  });

  test("rejects invalid enums and out-of-range values", () => {
    const restored = searchParamsToFilters(
      params("country=Nope&category=Nope&max=999"),
    );
    expect(restored.country).toBe("Nope");
    expect(restored.category).toBe("all");
    expect(restored.maxResults).toBe(EMPTY_FILTERS.maxResults);
  });

  test("live-only categories survive URL restore", () => {
    expect(searchParamsToFilters(params("category=Coffee%20Shop")).category).toBe(
      "Coffee Shop",
    );
    expect(searchParamsToFilters(params("category=Restaurant")).category).toBe(
      "Restaurant",
    );
  });

  test("trims and caps free text", () => {
    const restored = searchParamsToFilters(params("city=" + encodeURIComponent("  Berlin  ") + "&keyword=" + "x".repeat(200)));
    expect(restored.city).toBe("Berlin");
    expect(restored.keyword).toHaveLength(80);
  });
});

describe("filtersToSearchParams", () => {
  test("round-trips through the parser", () => {
    const filters = {
      ...EMPTY_FILTERS,
      country: "Germany",
      city: "Berlin",
      category: "Bakery",
      keyword: "rye",
      maxResults: 25,
    };
    const query = filtersToSearchParams(filters).toString();
    expect(searchParamsToFilters(new URLSearchParams(query))).toEqual(filters);
  });

  test("omits defaults to keep URLs short", () => {
    expect(filtersToSearchParams(EMPTY_FILTERS).toString()).toBe("");
  });

  test("contains no sensitive or private data", () => {
    const query = filtersToSearchParams({
      ...EMPTY_FILTERS,
      country: "Germany",
      city: "Berlin",
    }).toString();
    expect(query).not.toMatch(/token|key|secret|password|email|saved/i);
  });
});
