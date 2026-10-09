import { describe, expect, test } from "bun:test";
import {
  buildOverpassQuery,
  dedupeCompanies,
  escapeOverpassString,
  formatBbox,
  normalizeElement,
  pairLookup,
  sanitizeKeyword,
} from "@/lib/providers/overpass";
import { GENERIC_BUSINESS_TAGS } from "@/lib/providers/osm-tags";
import type { SearchArea } from "@/lib/providers/nominatim";
import type { Company } from "@/types/company";

const AREA: SearchArea = {
  south: 52.3,
  west: 13.0,
  north: 52.7,
  east: 13.8,
  label: "Berlin, Germany",
  city: "Berlin",
  country: "Germany",
};

function company(overrides: Partial<Company> = {}): Company {
  return {
    id: "osm:node/1",
    provenance: "osm",
    name: "Test Bakery",
    category: "Bakery",
    city: "Berlin",
    country: "Germany",
    locationLabel: "Berlin, Germany",
    lat: 52.52,
    lon: 13.405,
    website: null,
    phone: null,
    email: null,
    openingHours: null,
    source: "OpenStreetMap",
    sourceUrl: "https://www.openstreetmap.org/node/1",
    tags: { shop: "bakery", name: "Test Bakery" },
    ...overrides,
  };
}

describe("sanitizeKeyword", () => {
  test("strips query-breaking characters", () => {
    expect(sanitizeKeyword('a"];(foo')).toBe("afoo");
    expect(sanitizeKeyword("a\nfoo")).toBe("a foo");
  });

  test("collapses whitespace and caps length", () => {
    expect(sanitizeKeyword("  a   b  ")).toBe("a b");
    expect(sanitizeKeyword("x".repeat(100)).length).toBe(40);
  });

  test("keeps letters, numbers, spaces, hyphens", () => {
    expect(sanitizeKeyword("Café Müller-2")).toBe("Café Müller-2");
  });

  test("empty input stays empty", () => {
    expect(sanitizeKeyword("   ")).toBe("");
  });
});

describe("escapeOverpassString", () => {
  test("escapes quotes and backslashes", () => {
    expect(escapeOverpassString('a"b\\c')).toBe('a\\"b\\\\c');
  });
});

describe("formatBbox", () => {
  test("formats valid bounds with fixed precision", () => {
    expect(formatBbox(AREA)).toBe("(52.30000,13.00000,52.70000,13.80000)");
  });

  test("rejects inverted or non-finite bounds", () => {
    expect(formatBbox({ ...AREA, south: 60, north: 50 })).toBeNull();
    expect(formatBbox({ ...AREA, west: NaN })).toBeNull();
  });
});

describe("buildOverpassQuery", () => {
  test("builds node/way/relation clauses for each tag pair", () => {
    const query = buildOverpassQuery({
      tags: [{ key: "shop", value: "bakery", label: "Bakery" }],
      keyword: "",
      area: AREA,
      serverLimit: 20,
    });
    expect(query).not.toBeNull();
    expect(query).toContain('node["shop"="bakery"]["name"]');
    expect(query).toContain('way["shop"="bakery"]["name"]');
    expect(query).toContain('relation["shop"="bakery"]["name"]');
    expect(query).toContain("out center tags 20");
  });

  test("never interpolates raw user input", () => {
    const query = buildOverpassQuery({
      tags: GENERIC_BUSINESS_TAGS,
      keyword: 'x"]; out evil; ["',
      area: AREA,
      serverLimit: 10,
    });
    expect(query).not.toBeNull();
    expect(query).not.toContain('"]; out evil; ["');
    expect(query).toContain('["name"~"x out evil",i]');
  });

  test("omits the name filter when the keyword sanitizes to empty", () => {
    const query = buildOverpassQuery({
      tags: GENERIC_BUSINESS_TAGS,
      keyword: "!!!",
      area: AREA,
      serverLimit: 10,
    });
    expect(query).not.toContain("name\"~");
  });

  test("returns null for an invalid bbox", () => {
    expect(
      buildOverpassQuery({
        tags: GENERIC_BUSINESS_TAGS,
        keyword: "",
        area: { ...AREA, south: 99, north: 98 },
        serverLimit: 10,
      }),
    ).toBeNull();
  });
});

describe("normalizeElement", () => {
  const lookup = pairLookup([{ key: "shop", value: "bakery", label: "Bakery" }]);

  test("normalizes a node with contact tags", () => {
    const result = normalizeElement(
      {
        type: "node",
        id: 123,
        lat: 52.5,
        lon: 13.4,
        tags: {
          name: "Muster Bakery",
          shop: "bakery",
          website: "https://example.com",
          phone: "+49 30 123",
          "addr:city": "Berlin",
          "addr:country": "Germany",
        },
      },
      lookup,
      AREA,
    );
    expect(result?.id).toBe("osm:node/123");
    expect(result?.category).toBe("Bakery");
    expect(result?.website).toBe("https://example.com");
    expect(result?.phone).toBe("+49 30 123");
    expect(result?.sourceUrl).toBe("https://www.openstreetmap.org/node/123");
  });

  test("uses way centers and contact:-prefixed tags", () => {
    const result = normalizeElement(
      {
        type: "way",
        id: 9,
        center: { lat: 1.5, lon: 2.5 },
        tags: { name: "Way Shop", shop: "bakery", "contact:website": "example.org" },
      },
      lookup,
      AREA,
    );
    expect(result?.lat).toBe(1.5);
    expect(result?.website).toBe("https://example.org");
  });

  test("missing fields become null, never invented", () => {
    const result = normalizeElement(
      { type: "node", id: 5, lat: 1, lon: 2, tags: { name: "Bare", shop: "bakery" } },
      lookup,
      AREA,
    );
    expect(result?.website).toBeNull();
    expect(result?.phone).toBeNull();
    expect(result?.email).toBeNull();
    expect(result?.openingHours).toBeNull();
    expect(result?.city).toBe("Berlin");
  });

  test("rejects malformed elements", () => {
    expect(normalizeElement(null, lookup, AREA)).toBeNull();
    expect(normalizeElement({ type: "node", id: 1, tags: { shop: "x" } }, lookup, AREA)).toBeNull();
    expect(normalizeElement({ type: "planet", id: 1, tags: { name: "x" } }, lookup, AREA)).toBeNull();
    expect(normalizeElement({ type: "node", id: 1.5, tags: { name: "x" } }, lookup, AREA)).toBeNull();
  });
});

describe("dedupeCompanies", () => {
  test("drops duplicate ids and same-name/same-place doubles", () => {
    const a = company({ id: "osm:node/1" });
    const dupeId = company({ id: "osm:node/1" });
    const samePlace = company({ id: "osm:way/2", name: "test   bakery!" });
    expect(dedupeCompanies([a, dupeId, samePlace])).toHaveLength(1);
  });

  test("keeps distinct businesses with similar names", () => {
    const a = company({ id: "osm:node/1", name: "Central Bakery" });
    const b = company({ id: "osm:node/2", name: "Central Bakery", lat: 53.5, lon: 14.0 });
    const c = company({ id: "osm:node/3", name: "Central Bakery West" });
    expect(dedupeCompanies([a, b, c])).toHaveLength(3);
  });
});
