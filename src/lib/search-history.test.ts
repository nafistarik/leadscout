import { describe, expect, test } from "bun:test";
import {
  MAX_HISTORY_ENTRIES,
  addHistoryEntry,
  describeHistoryEntry,
  removeHistoryEntry,
  sanitizeHistory,
  summarizeSearchStats,
} from "@/lib/search-history";
import type { HistoryInput } from "@/lib/search-history";

function input(overrides: Partial<HistoryInput> = {}): HistoryInput {
  return {
    country: "Bangladesh",
    city: "Dhaka",
    category: "Coffee Shop",
    keyword: "",
    maxResults: 10,
    resultCount: 0,
    websiteIds: [],
    ...overrides,
  };
}

describe("sanitizeHistory", () => {
  test("keeps valid entries and drops malformed ones", () => {
    const cleaned = sanitizeHistory([
      { ...input(), id: "a", searchedAt: "2026-01-01T00:00:00Z" },
      { ...input(), id: "a", searchedAt: "2026-01-01T00:00:00Z" },
      { ...input(), id: "", searchedAt: "x" },
      { ...input(), id: "c", maxResults: Number.NaN, searchedAt: "x" },
      // Legacy entries carrying a mode field still load (the field is ignored).
      { ...input(), id: "legacy", mode: "live", searchedAt: "x" },
      // Entries predating statistics load as zero, never invented.
      {
        country: "Germany",
        city: "Berlin",
        category: "Bakery",
        keyword: "",
        maxResults: 10,
        id: "old",
        searchedAt: "x",
      },
      null,
      "junk",
    ]);
    expect(cleaned.map((e) => e.id)).toEqual(["a", "legacy", "old"]);
    const old = cleaned.find((e) => e.id === "old");
    expect(old?.resultCount).toBe(0);
    expect(old?.websiteIds).toEqual([]);
  });

  test("rejects non-arrays and caps length", () => {
    expect(sanitizeHistory(null)).toEqual([]);
    expect(sanitizeHistory("junk")).toEqual([]);
    const many = Array.from({ length: MAX_HISTORY_ENTRIES + 5 }, (_, i) => ({
      ...input(),
      id: `h${i}`,
      searchedAt: "2026-01-01T00:00:00Z",
    }));
    expect(sanitizeHistory(many)).toHaveLength(MAX_HISTORY_ENTRIES);
  });

  test("trims overlong fields and caps website ids", () => {
    const cleaned = sanitizeHistory([
      {
        ...input(),
        id: "a",
        city: "x".repeat(500),
        resultCount: 7.9,
        websiteIds: Array.from({ length: 80 }, (_, i) => `osm:node/${i}`),
        searchedAt: "x",
      },
    ]);
    expect(cleaned[0].city).toHaveLength(80);
    expect(cleaned[0].resultCount).toBe(7);
    expect(cleaned[0].websiteIds).toHaveLength(50);
  });
});

describe("addHistoryEntry", () => {
  test("prepends new searches and skips consecutive duplicates", () => {
    const first = addHistoryEntry([], input(), "a", "2026-01-01T00:00:00Z");
    expect(first).toHaveLength(1);
    expect(first[0].searchedAt).toBe("2026-01-01T00:00:00Z");
    // Same query twice in a row (e.g. double submit) stores once.
    expect(addHistoryEntry(first, input(), "b", "2026-01-01T00:01:00Z")).toHaveLength(1);
    // A different query is stored.
    const second = addHistoryEntry(first, input({ city: "Berlin" }), "c", "2026-01-01T00:02:00Z");
    expect(second.map((e) => e.id)).toEqual(["c", "a"]);
  });

  test("caps stored entries at the maximum", () => {
    let entries = addHistoryEntry([], input(), "base", "2026-01-01T00:00:00Z");
    for (let i = 0; i < MAX_HISTORY_ENTRIES + 5; i++) {
      entries = addHistoryEntry(entries, input({ city: `City${i}` }), `h${i}`, "2026-01-01T00:00:00Z");
    }
    expect(entries).toHaveLength(MAX_HISTORY_ENTRIES);
    expect(entries[0].city).toBe(`City${MAX_HISTORY_ENTRIES + 4}`);
  });
});

describe("removeHistoryEntry", () => {
  test("removes only the target entry", () => {
    const entries = addHistoryEntry(
      addHistoryEntry([], input(), "a", "2026-01-01T00:00:00Z"),
      input({ city: "Berlin" }),
      "b",
      "2026-01-01T00:00:00Z",
    );
    expect(removeHistoryEntry(entries, "b").map((e) => e.id)).toEqual(["a"]);
    expect(removeHistoryEntry(entries, "missing")).toHaveLength(2);
  });
});

describe("describeHistoryEntry", () => {
  test("builds compact human labels", () => {
    expect(
      describeHistoryEntry({ ...input(), id: "a", searchedAt: "x" }),
    ).toBe("Coffee Shop · Dhaka, Bangladesh");
    expect(
      describeHistoryEntry({ ...input(), id: "a", searchedAt: "x", category: "all", keyword: "" }).startsWith(
        "All businesses",
      ),
    ).toBe(true);
  });
});

describe("summarizeSearchStats", () => {
  test("derives totals from entries with unique website dedupe", () => {
    const entries = [
      { ...input(), id: "a", searchedAt: "x", resultCount: 10, websiteIds: ["osm:node/1", "osm:node/2"] },
      { ...input(), id: "b", searchedAt: "x", resultCount: 5, websiteIds: ["osm:node/2", "osm:node/3"] },
    ];
    expect(summarizeSearchStats(entries)).toEqual({
      totalSearches: 2,
      totalResults: 15,
      uniqueWebsites: 3,
    });
  });

  test("empty history summarizes to zero", () => {
    expect(summarizeSearchStats([])).toEqual({ totalSearches: 0, totalResults: 0, uniqueWebsites: 0 });
  });
});
