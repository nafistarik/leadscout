import { describe, expect, test } from "bun:test";
import {
  completenessSummary,
  describeCompleteness,
  presentDetailsLabel,
} from "@/lib/completeness";
import type { Company } from "@/types/company";

function company(overrides: Partial<Company> = {}): Company {
  return {
    id: "osm:node/1",
    provenance: "osm",
    name: "Acme",
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
    tags: {},
    ...overrides,
  };
}

describe("describeCompleteness", () => {
  test("counts only fields actually present", () => {
    const full = describeCompleteness(
      company({
        website: "https://a.example",
        phone: "1",
        email: "a@b.example",
        openingHours: "Mo-Fr",
        tags: { "addr:city": "Berlin" },
      }),
    );
    expect(full.present).toBe(6);
    expect(full.total).toBe(6);
    expect(completenessSummary(full)).toBe("6 of 6");
    expect(presentDetailsLabel(full)).toBe(
      "website; phone; email; opening hours; coordinates; address",
    );
  });

  test("sparse records score low without inventing data", () => {
    const empty = describeCompleteness(company({ lat: null, lon: null }));
    expect(empty.present).toBe(0);
    expect(presentDetailsLabel(empty)).toBe("");
  });

  test("coordinates require both axes; address requires tag detail", () => {
    const half = describeCompleteness(company({ lat: 52.5, lon: null }));
    expect(half.signals.find((s) => s.key === "coordinates")?.present).toBe(false);
    expect(half.signals.find((s) => s.key === "address")?.present).toBe(false);
  });

  test("is deterministic", () => {
    const input = company({ website: "https://a.example" });
    expect(describeCompleteness(input)).toEqual(describeCompleteness(input));
  });
});
