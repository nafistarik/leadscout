import { describe, expect, test } from "bun:test";
import { companyRecord } from "@/types/company";

describe("companyRecord", () => {
  test("builds a saved-lead snapshot keyed by the company id", () => {
    const company = {
      id: "osm:node/123",
      provenance: "osm" as const,
      name: "Real Co",
      category: "Bakery",
      city: "Berlin",
      country: "Germany",
      locationLabel: "Berlin, Germany",
      lat: 52.5,
      lon: 13.4,
      website: null,
      phone: null,
      email: null,
      openingHours: null,
      source: "OpenStreetMap",
      sourceUrl: null,
      tags: { name: "Real Co" },
    };
    const record = companyRecord(company, "2026-01-01T00:00:00.000Z");
    expect(record.id).toBe("osm:node/123");
    expect(record.savedAt).toBe("2026-01-01T00:00:00.000Z");
    expect(record.company).toBe(company);
  });
});
