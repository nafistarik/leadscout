import { describe, expect, test } from "bun:test";
import { parseKeywordChips, serializeKeywordChips } from "@/lib/keywords";

describe("parseKeywordChips", () => {
  test("returns an empty array for empty input", () => {
    expect(parseKeywordChips("")).toEqual([]);
    expect(parseKeywordChips("   ")).toEqual([]);
    expect(parseKeywordChips(",,,")).toEqual([]);
  });

  test("splits on commas and trims whitespace", () => {
    expect(parseKeywordChips("bakery, dental")).toEqual(["bakery", "dental"]);
    expect(parseKeywordChips("  rye bread ,, sourdough  ")).toEqual(["rye bread", "sourdough"]);
  });

  test("keeps single keywords without commas intact", () => {
    expect(parseKeywordChips("rye bread")).toEqual(["rye bread"]);
  });

  test("drops duplicates case-insensitively, keeping the first casing", () => {
    expect(parseKeywordChips("Bakery, bakery, BAKERY, dental")).toEqual(["Bakery", "dental"]);
  });

  test("preserves entry order", () => {
    expect(parseKeywordChips("dental, bakery, cafe")).toEqual(["dental", "bakery", "cafe"]);
  });
});

describe("serializeKeywordChips", () => {
  test("joins chips with comma-space", () => {
    expect(serializeKeywordChips(["bakery", "dental"])).toEqual("bakery, dental");
  });

  test("serializes an empty list to an empty string", () => {
    expect(serializeKeywordChips([])).toEqual("");
  });

  test("normalizes raw entries before serializing", () => {
    expect(serializeKeywordChips(["  bakery ", "", "Bakery", "dental"])).toEqual("bakery, dental");
  });

  test("round-trips through parse", () => {
    expect(parseKeywordChips(serializeKeywordChips(["a", "b", "c"]))).toEqual(["a", "b", "c"]);
  });

  test("legacy comma-separated input parses into the same chips", () => {
    expect(parseKeywordChips("bakery, dental")).toEqual(
      parseKeywordChips(serializeKeywordChips(["bakery", "dental"])),
    );
  });
});
