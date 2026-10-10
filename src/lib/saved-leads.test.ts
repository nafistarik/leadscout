import { describe, expect, test } from "bun:test";
import { sanitizeRecords } from "@/lib/saved-leads";
import type { Company, SavedLeadRecord } from "@/types/company";

function savedCompany(overrides: Partial<Company> = {}): SavedLeadRecord {
  return {
    id: "osm:node/7",
    savedAt: "2026-01-01T00:00:00.000Z",
    company: {
      id: "osm:node/7",
      provenance: "osm",
      name: "Real Co",
      category: "Bakery",
      locationLabel: "Berlin, Germany",
      city: "Berlin",
      country: "Germany",
      lat: null,
      lon: null,
      website: null,
      phone: null,
      email: null,
      openingHours: null,
      source: "OpenStreetMap",
      sourceUrl: null,
      tags: { name: "Real Co" },
      ...overrides,
    },
  };
}

describe("sanitizeRecords", () => {
  test("accepts valid company records, drops malformed and legacy ones", () => {
    const records = sanitizeRecords([
      savedCompany(),
      // Legacy demo references and id arrays no longer load.
      { id: "demo:demo-01", kind: "demo", savedAt: "2026-01-01", demoId: "demo-01" },
      { id: "bad", savedAt: "x" },
      { id: "osm:node/9", savedAt: "x", company: { name: "No id" } },
      null,
      "junk",
    ]);
    expect(records).toHaveLength(1);
    expect(records[0].company.name).toBe("Real Co");
  });

  test("accepts both envelope and bare-array shapes, dedupes ids", () => {
    const valid = savedCompany();
    expect(sanitizeRecords({ version: 2, records: [valid, valid] })).toHaveLength(1);
    expect(sanitizeRecords([valid])).toHaveLength(1);
    expect(sanitizeRecords(null)).toHaveLength(0);
    expect(sanitizeRecords("corrupted{")).toHaveLength(0);
  });
});
