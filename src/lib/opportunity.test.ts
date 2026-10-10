import { describe, expect, test } from "bun:test";
import { computeOpportunity } from "@/lib/opportunity";
import { describeOsmDetails, isSocialOnlyUrl, socialUrl } from "@/lib/osm-details";
import { analyzeHtml, unreachableAnalysis } from "@/lib/website-analysis";
import type { Company } from "@/types/company";

const NOW = new Date("2026-10-11T00:00:00Z");

function company(overrides: Partial<Company> = {}, tags: Record<string, string> = {}): Company {
  return {
    id: "osm:node/1",
    provenance: "osm",
    name: "Test Cafe",
    category: "Coffee Shop",
    city: "Dhaka",
    country: "Bangladesh",
    locationLabel: "Dhaka, Bangladesh",
    lat: 23.75,
    lon: 90.41,
    website: null,
    phone: null,
    email: null,
    openingHours: null,
    source: "OpenStreetMap",
    sourceUrl: "https://www.openstreetmap.org/node/1",
    tags: { name: "Test Cafe", amenity: "cafe", ...tags },
    ...overrides,
  };
}

describe("describeOsmDetails", () => {
  test("collects every phone, address parts, and social profiles from tags", () => {
    const details = describeOsmDetails(
      company({ phone: "+880 1711-000000" }, {
        phone: "+880 1711-000000; +880 2 9999999",
        "contact:mobile": "+8801711000000",
        "addr:housenumber": "12",
        "addr:street": "DIT Road",
        "addr:suburb": "Malibagh",
        "addr:city": "Dhaka",
        "addr:postcode": "1217",
        "contact:facebook": "testcafe.bd",
        "contact:whatsapp": "+880 1711 000000",
        check_date: "2025-03-01",
      }),
    );
    expect(details.phones).toEqual(["+880 1711-000000", "+880 2 9999999"]);
    expect(details.address).toBe("12, DIT Road, Malibagh, Dhaka 1217");
    expect(details.socials).toEqual([
      { network: "facebook", url: "https://www.facebook.com/testcafe.bd" },
      { network: "whatsapp", url: "https://wa.me/8801711000000" },
    ]);
    expect(details.websiteKind).toBe("social");
    expect(details.lastChecked).toBe("2025-03-01");
  });

  test("a website tag pointing to Facebook is a social page, not a site", () => {
    const details = describeOsmDetails(company({ website: "https://www.facebook.com/testcafe" }));
    expect(details.websiteKind).toBe("social");
    expect(details.socials[0]?.network).toBe("facebook");
    expect(isSocialOnlyUrl("https://linktr.ee/testcafe")).toBe(true);
    expect(isSocialOnlyUrl("https://testcafe.example")).toBe(false);
  });

  test("rejects unsafe or mismatched social values", () => {
    expect(socialUrl("facebook", "javascript:alert(1)", "https://www.facebook.com/")).toBeNull();
    expect(socialUrl("instagram", "https://evil.example/x", "https://www.instagram.com/")).toBeNull();
    expect(socialUrl("instagram", "@cafe.dhaka", "https://www.instagram.com/")).toBe("https://www.instagram.com/cafe.dhaka");
  });
});

describe("computeOpportunity", () => {
  test("no website listed is a high opportunity, ranked lower when uncontactable", () => {
    const reachable = computeOpportunity(company({ phone: "123456" }, { phone: "123456" }), describeOsmDetails(company({ phone: "123456" }, { phone: "123456" })), null);
    const unreachable = computeOpportunity(company(), describeOsmDetails(company()), null);
    expect(reachable.level).toBe("high");
    expect(reachable.label).toBe("No website");
    expect(unreachable.level).toBe("high");
    expect(unreachable.rank).toBeGreaterThan(reachable.rank);
    expect(unreachable.reasons.join(" ")).toContain("No phone, email, or social");
  });

  test("chains are low priority even without a website", () => {
    const chain = company({}, { brand: "KFC", "brand:wikidata": "Q524757" });
    expect(computeOpportunity(chain, describeOsmDetails(chain), null).level).toBe("low");
  });

  test("an unchecked website waits for a check; checked results set the level", () => {
    const withSite = company({ website: "https://cafe.example" });
    const details = describeOsmDetails(withSite);
    expect(computeOpportunity(withSite, details, null).level).toBe("unknown");

    const down = unreachableAnalysis("https://cafe.example", "Domain does not exist (DNS lookup failed).", NOW);
    const downOpportunity = computeOpportunity(withSite, details, down);
    expect(downOpportunity.level).toBe("high");
    expect(downOpportunity.label).toBe("Website down");

    const modern = analyzeHtml({
      html: `<html><head><title>Cafe</title><meta name="viewport" content="width=device-width"><meta name="description" content="x"></head><body>${"Coffee. ".repeat(80)} © 2026</body></html>`,
      url: "https://cafe.example/",
      httpStatus: 200,
      now: NOW,
    });
    expect(computeOpportunity(withSite, details, modern).level).toBe("low");
  });
});
