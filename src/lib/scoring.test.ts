import { describe, expect, test } from "bun:test";
import { MAX_SCORE, hasTagCity, scoreBand, scoreCompany } from "@/lib/scoring";
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

describe("scoreCompany", () => {
  test("scores only observable signals with documented weights", () => {
    const score = scoreCompany(
      company({ website: "https://a.example", phone: "123", email: "a@b.example", openingHours: "Mo-Fr" }),
      { categoryMatch: true, cityFromTags: true },
    );
    expect(score.score).toBe(30 + 20 + 15 + 15 + 10 + 10);
    expect(score.maxScore).toBe(MAX_SCORE);
    expect(score.reasons).toHaveLength(6);
  });

  test("sparse records score low without being penalized", () => {
    const score = scoreCompany(company(), { categoryMatch: false, cityFromTags: false });
    expect(score.score).toBe(0);
    expect(score.reasons).toHaveLength(0);
  });

  test("never exceeds the maximum", () => {
    const score = scoreCompany(
      company({ website: "x", phone: "x", email: "x", openingHours: "x" }),
      { categoryMatch: true, cityFromTags: true },
    );
    expect(score.score).toBeLessThan(MAX_SCORE + 1);
  });
});

describe("scoreBand", () => {
  test("bands thresholds", () => {
    expect(scoreBand(70)).toBe("Strong info");
    expect(scoreBand(69)).toBe("Partial info");
    expect(scoreBand(40)).toBe("Partial info");
    expect(scoreBand(39)).toBe("Basic listing");
  });
});

describe("hasTagCity", () => {
  test("detects address detail in tags", () => {
    expect(hasTagCity(company({ tags: { "addr:town": "X" } }))).toBe(true);
    expect(hasTagCity(company({ tags: {} }))).toBe(false);
  });
});

describe("score integrity", () => {
  test("is deterministic and reasons sum to the score", () => {
    const input = company({ website: "https://a.example", email: "a@b.example" });
    const first = scoreCompany(input, { categoryMatch: true, cityFromTags: false });
    const second = scoreCompany(input, { categoryMatch: true, cityFromTags: false });
    expect(first).toEqual(second);
    expect(first.reasons.reduce((sum, reason) => sum + reason.points, 0)).toBe(first.score);
    expect(first.maxScore).toBe(MAX_SCORE);
  });
});
