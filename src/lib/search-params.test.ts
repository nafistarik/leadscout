import { describe, expect, test } from "bun:test";
import { EMPTY_FILTERS } from "@/lib/filter-leads";
import {
  filtersToSearchParams,
  restoredSearchKey,
  searchParamsToFilters,
} from "@/lib/search-params";

function params(query: string): URLSearchParams {
  return new URLSearchParams(query);
}

describe("searchParamsToFilters", () => {
  test("restores a full shareable URL", () => {
    const restored = searchParamsToFilters(
      params("mode=live&country=Germany&city=Berlin&category=Bakery&keyword=rye&max=25&web=1&phone=1&email=1&hours=1&minScore=40&sort=name"),
    );
    expect(restored.mode).toBe("live");
    expect(restored.filters).toEqual({
      country: "Germany",
      city: "Berlin",
      category: "Bakery",
      keyword: "rye",
      maxResults: 25,
      hasWebsite: true,
      hasPhone: true,
      hasEmail: true,
      hasOpeningHours: true,
      minScore: 40,
      sort: "name",
    });
  });

  test("defaults safely on empty or unknown input", () => {
    const restored = searchParamsToFilters(params(""));
    expect(restored.mode).toBe("live");
    expect(restored.filters).toEqual({ ...EMPTY_FILTERS, country: "" });
  });

  test("rejects invalid enums and out-of-range values", () => {
    const restored = searchParamsToFilters(
      params("mode=other&country=Nope&category=Nope&max=999&minScore=33&sort=nope&web=yes"),
    );
    expect(restored.mode).toBe("live");
    expect(restored.filters.country).toBe("Nope");
    expect(restored.filters.category).toBe("all");
    expect(restored.filters.maxResults).toBe(EMPTY_FILTERS.maxResults);
    expect(restored.filters.minScore).toBe(0);
    expect(restored.filters.sort).toBe("provider");
    expect(restored.filters.hasWebsite).toBe(false);
  });

  test("demo mode validates country against the dataset list", () => {
    expect(searchParamsToFilters(params("mode=demo&country=Germany")).filters.country).toBe("Germany");
    expect(searchParamsToFilters(params("mode=demo&country=Atlantis")).filters.country).toBe("all");
    expect(searchParamsToFilters(params("mode=demo")).filters.country).toBe("all");
  });

  test("trims and caps free text", () => {
    const restored = searchParamsToFilters(params("city=" + encodeURIComponent("  Berlin  ") + "&keyword=" + "x".repeat(200)));
    expect(restored.filters.city).toBe("Berlin");
    expect(restored.filters.keyword).toHaveLength(80);
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
      hasWebsite: true,
      minScore: 70,
      sort: "score" as const,
    };
    const query = filtersToSearchParams("live", filters).toString();
    expect(searchParamsToFilters(new URLSearchParams(query))).toEqual({ mode: "live", filters });
  });

  test("omits defaults to keep URLs short", () => {
    expect(filtersToSearchParams("live", { ...EMPTY_FILTERS, country: "" }).toString()).toBe("mode=live");
    expect(filtersToSearchParams("demo", EMPTY_FILTERS).toString()).toBe("mode=demo");
  });

  test("contains no sensitive or private data", () => {
    const query = filtersToSearchParams("live", {
      ...EMPTY_FILTERS,
      country: "Germany",
      city: "Berlin",
    }).toString();
    expect(query).not.toMatch(/token|key|secret|password|email|saved/i);
  });
});

describe("restoredSearchKey", () => {
  test("is stable for equivalent restorations", () => {
    const a = restoredSearchKey(searchParamsToFilters(params("city=Berlin")));
    const b = restoredSearchKey(searchParamsToFilters(params("city=%20Berlin%20")));
    expect(a).toBe(b);
  });
});
