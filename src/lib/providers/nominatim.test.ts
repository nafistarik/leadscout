import { describe, expect, test } from "bun:test";
import { geocodeCacheKey, parseNominatimResult } from "@/lib/providers/nominatim";

describe("geocodeCacheKey", () => {
  test("normalizes case and whitespace", () => {
    expect(geocodeCacheKey("  Berlin ", "GERMANY")).toBe("berlin|germany");
  });
});

describe("parseNominatimResult", () => {
  test("parses bounding box, label, city, and country", () => {
    const area = parseNominatimResult(
      {
        boundingbox: ["52.3", "52.7", "13.0", "13.8"],
        display_name: "Berlin, Germany",
        address: { city: "Berlin", country: "Germany" },
      },
      "Berlin",
    );
    expect(area).toEqual({
      south: 52.3,
      west: 13.0,
      north: 52.7,
      east: 13.8,
      label: "Berlin, Germany",
      city: "Berlin",
      country: "Germany",
    });
  });

  test("falls back to the query city when address parts are missing", () => {
    const area = parseNominatimResult(
      { boundingbox: ["1", "2", "3", "4"], display_name: "", address: {} },
      "Lyon",
    );
    expect(area?.city).toBe("Lyon");
    expect(area?.country).toBeNull();
    expect(area?.label).toBe("Lyon");
  });

  test("rejects malformed payloads", () => {
    expect(parseNominatimResult(null, "x")).toBeNull();
    expect(parseNominatimResult({ boundingbox: ["a", "b", "c", "d"] }, "x")).toBeNull();
    expect(parseNominatimResult({ boundingbox: ["5", "4", "1", "2"] }, "x")).toBeNull();
    expect(parseNominatimResult({ boundingbox: ["91", "92", "1", "2"] }, "x")).toBeNull();
    expect(parseNominatimResult({ boundingbox: ["1"] }, "x")).toBeNull();
  });
});
