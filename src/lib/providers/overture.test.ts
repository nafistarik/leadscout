import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { gzipSync } from "node:zlib";
import { describeOsmDetails } from "@/lib/osm-details";
import {
  findPreparedCity,
  OVERTURE_DATA_URL,
  placeToCompany,
  resetOvertureCache,
  searchOverture,
  selectPlaces,
} from "@/lib/providers/overture";
import type { ManifestCity, OvertureManifest, PlaceRow } from "@/lib/providers/overture";
import { ProviderError } from "@/lib/providers/types";
import { sanitizeRecords } from "@/lib/saved-leads";

type MutableGlobals = Record<string, unknown>;
const globals = globalThis as MutableGlobals;
const savedFetch = globals.fetch;

const DHAKA: ManifestCity = {
  id: "dhaka",
  name: "Dhaka",
  country: "bd",
  bbox: [90.229, 23.604, 90.549, 23.924],
  total: 4,
  categories: { dental_clinic: 3, personal_or_beauty_service: 1 },
};
const MANIFEST: OvertureManifest = {
  release: "2026-10-21.0",
  cities: [DHAKA, { ...DHAKA, id: "london", name: "London", country: "gb" }],
};

function row(id: string, extra: Partial<PlaceRow> = {}): PlaceRow {
  return { id, n: `Clinic ${id}`, c: "dental_clinic", lat: 23.7, lon: 90.4, ...extra };
}

const DENTAL: PlaceRow[] = [
  row("a", { w: "https://modern-clinic.example", p: "+8801700000001" }),
  row("b", { p: "+8801700000002" }),
  row("c"),
];

const neverAbort = { signal: new AbortController().signal };
const request = { country: "", city: "Dhaka", category: "Dental Clinic", keyword: "", maxResults: 10 };

/** Serves the manifest and gzipped category files the way Hugging Face does. */
function installDataHost(files: Record<string, unknown>, manifest: unknown = MANIFEST): string[] {
  const calls: string[] = [];
  globals.fetch = (url: string): Promise<Response> => {
    calls.push(url);
    const path = url.slice(OVERTURE_DATA_URL.length);
    if (path === "manifest.json") return Promise.resolve(new Response(JSON.stringify(manifest)));
    if (!(path in files)) return Promise.resolve(new Response("Entry not found", { status: 404 }));
    return Promise.resolve(new Response(gzipSync(JSON.stringify(files[path]))));
  };
  return calls;
}

beforeEach(() => resetOvertureCache());
afterEach(() => {
  globals.fetch = savedFetch;
});

describe("findPreparedCity", () => {
  test("matches the name, the id, and common spellings, ignoring case and punctuation", () => {
    const manifest: OvertureManifest = {
      release: "r",
      cities: [{ ...DHAKA, id: "coxs-bazar", name: "Cox's Bazar" }, { ...DHAKA, id: "chattogram", name: "Chattogram" }],
    };
    expect(findPreparedCity(manifest, "  COX'S BAZAR ", "")?.id).toBe("coxs-bazar");
    expect(findPreparedCity(manifest, "coxs-bazar", "")?.id).toBe("coxs-bazar");
    expect(findPreparedCity(manifest, "Chittagong", "Bangladesh")?.id).toBe("chattogram");
  });

  test("respects the country and never guesses an unknown one", () => {
    expect(findPreparedCity(MANIFEST, "London", "United Kingdom")?.id).toBe("london");
    expect(findPreparedCity(MANIFEST, "London", "Canada")).toBeNull();
    expect(findPreparedCity(MANIFEST, "London", "Narnia")).toBeNull();
    expect(findPreparedCity(MANIFEST, "Berlin", "")).toBeNull();
    expect(findPreparedCity(MANIFEST, "   ", "")).toBeNull();
  });
});

describe("placeToCompany", () => {
  test("keeps contacts as OSM-style tags so the rest of the app reads them unchanged", () => {
    const company = placeToCompany(
      row("x", {
        t: "cosmetic_dentistry",
        w: "smile.example.com",
        p: "+8801711111111",
        e: "hello@smile.example.com",
        s: ["https://www.facebook.com/123", "https://www.instagram.com/smile", "https://unknown.example/x"],
        a: "House 1, Road 2",
      }),
      DHAKA,
      "Dental Clinic",
    );
    const { id, provenance, category, locationLabel, website, source, sourceUrl, openingHours } = company;
    expect({ id, provenance, category, locationLabel, website, source, sourceUrl, openingHours }).toEqual({
      id: "overture:x",
      provenance: "overture",
      category: "Dental Clinic",
      locationLabel: "Dhaka, Bangladesh",
      website: "https://smile.example.com",
      source: "Overture Maps",
      sourceUrl: null,
      openingHours: null,
    });
    const details = describeOsmDetails(company);
    expect(details.phones).toEqual(["+8801711111111"]);
    expect(details.emails).toEqual(["hello@smile.example.com"]);
    expect(details.socials.map((social) => social.network)).toEqual(["facebook", "instagram"]);
    expect(details.address).toBe("House 1, Road 2");
    expect(details.websiteKind).toBe("site");
  });

  test("a missing website is null and an uncategorized search labels by Overture's category", () => {
    const company = placeToCompany(row("y", { c: "personal_or_beauty_service", t: "hair_salon" }), DHAKA, null);
    expect(company.website).toBeNull();
    expect(company.phone).toBeNull();
    expect(company.category).toBe("Hair salon");
    expect(describeOsmDetails(company).websiteKind).toBe("none");
  });

  test("saved leads accept Overture companies", () => {
    const company = placeToCompany(row("z"), DHAKA, "Dental Clinic");
    expect(sanitizeRecords([{ id: company.id, savedAt: "2026-11-08T10:00:00.000Z", company }])).toHaveLength(1);
  });
});

describe("selectPlaces", () => {
  const rows = [
    row("1", { n: "Smile Dental" }),
    row("2", { n: "Bright Care", t: "pediatric_dentistry" }),
    row("1", { n: "Smile Dental" }),
    row("3", { c: "restaurant", n: "Smile Cafe" }),
  ];

  test("keeps only the selected category and drops duplicates", () => {
    expect(selectPlaces(rows, [{ c: "dental_clinic" }], "").map((place) => place.id)).toEqual(["1", "2"]);
  });

  test("keyword chips match the name or the fine category, any chip", () => {
    const selectors = [{ c: "dental_clinic" }];
    expect(selectPlaces(rows, selectors, "smile").map((place) => place.id)).toEqual(["1"]);
    expect(selectPlaces(rows, selectors, "PEDIATRIC").map((place) => place.id)).toEqual(["2"]);
    expect(selectPlaces(rows, selectors, "nothing, bright").map((place) => place.id)).toEqual(["2"]);
  });

  test("one business listed under two ids appears once: same name and phone", () => {
    const twins = [
      row("a", { n: "Post House Dental", p: "+44 1932 731207" }),
      row("b", { n: "post house  dental", p: "+441932731207", t: "general_dentistry" }),
    ];
    expect(selectPlaces(twins, [{ c: "dental_clinic" }], "").map((place) => place.id)).toEqual(["a"]);
  });

  test("without a phone, the same name at the same spot is one business", () => {
    const twins = [row("a", { n: "Smile", lat: 51.36465, lon: -0.45942 }), row("b", { n: "Smile", lat: 51.36468, lon: -0.45939 })];
    expect(selectPlaces(twins, [{ c: "dental_clinic" }], "").map((place) => place.id)).toEqual(["a"]);
  });

  test("branches sharing a name stay separate", () => {
    const branches = [
      row("a", { n: "Smile Dental", p: "+442000000001" }),
      row("b", { n: "Smile Dental", p: "+442000000002" }),
      row("c", { n: "Smile Dental", lat: 51.5, lon: -0.1 }),
      row("d", { n: "Smile Dental", lat: 51.6, lon: -0.2 }),
    ];
    expect(selectPlaces(branches, [{ c: "dental_clinic" }], "").map((place) => place.id)).toEqual(["a", "b", "c", "d"]);
  });
});

describe("searchOverture (stubbed host — no network)", () => {
  test("returns null for a city that is not prepared, after loading only the manifest", async () => {
    const calls = installDataHost({});
    expect(await searchOverture({ ...request, city: "Berlin" }, 10, neverAbort)).toBeNull();
    expect(calls).toEqual([`${OVERTURE_DATA_URL}manifest.json`]);
  });

  test("loads the category file and ranks the best pitch first: no website but reachable", async () => {
    installDataHost({ "2026-10-21.0/dhaka/dental_clinic.json.gz": DENTAL });
    const result = await searchOverture(request, 10, neverAbort);
    expect(result?.companies.map((company) => company.id)).toEqual(["overture:b", "overture:c", "overture:a"]);
    const { providerId, areaLabel, truncated, examined } = result?.meta ?? {};
    expect({ providerId, areaLabel, truncated, examined }).toEqual({
      providerId: "overture",
      areaLabel: "Dhaka, Bangladesh",
      truncated: false,
      examined: 3,
    });
    expect(result?.meta.coverageNote).toBeNull();
  });

  test("slices to the limit and reports truncation", async () => {
    installDataHost({ "2026-10-21.0/dhaka/dental_clinic.json.gz": DENTAL });
    const result = await searchOverture(request, 2, neverAbort);
    expect(result?.companies).toHaveLength(2);
    expect(result?.meta.truncated).toBe(true);
  });

  test("drops malformed rows instead of failing the search", async () => {
    installDataHost({ "2026-10-21.0/dhaka/dental_clinic.json.gz": [...DENTAL, { id: "bad" }, null, row("d", { lat: Number.NaN })] });
    const result = await searchOverture(request, 10, neverAbort);
    expect(result?.companies).toHaveLength(3);
  });

  test("skips files the city does not have and reuses loaded files", async () => {
    const calls = installDataHost({ "2026-10-21.0/dhaka/dental_clinic.json.gz": DENTAL });
    await searchOverture(request, 10, neverAbort);
    await searchOverture({ ...request, keyword: "clinic" }, 10, neverAbort);
    expect(calls.filter((url) => url.endsWith(".json.gz"))).toEqual([
      `${OVERTURE_DATA_URL}2026-10-21.0/dhaka/dental_clinic.json.gz`,
    ]);
  });

  test("“All businesses” searches the common client types and says so", async () => {
    const calls = installDataHost({
      "2026-10-21.0/dhaka/dental_clinic.json.gz": DENTAL,
      "2026-10-21.0/dhaka/personal_or_beauty_service.json.gz": [row("h", { c: "personal_or_beauty_service", t: "barber" })],
    });
    const result = await searchOverture({ ...request, category: "all" }, 10, neverAbort);
    expect(result?.companies).toHaveLength(4);
    expect(result?.meta.coverageNote).toContain("common client types");
    // Files missing from the manifest (e.g. restaurant here) are never requested.
    expect(calls.some((url) => url.endsWith("restaurant.json.gz"))).toBe(false);
  });

  test("a failed file load throws a ProviderError the caller can fall back on", async () => {
    installDataHost({});
    let caught: unknown = null;
    try {
      await searchOverture(request, 10, neverAbort);
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(ProviderError);
    expect((caught as ProviderError).kind).toBe("unavailable");
  });

  test("a malformed manifest is a bad-response error, and the next search retries it", async () => {
    installDataHost({}, { nope: true });
    let caught: unknown = null;
    try {
      await searchOverture(request, 10, neverAbort);
    } catch (error) {
      caught = error;
    }
    expect((caught as ProviderError).kind).toBe("bad-response");
    const calls = installDataHost({ "2026-10-21.0/dhaka/dental_clinic.json.gz": DENTAL });
    expect((await searchOverture(request, 10, neverAbort))?.companies).toHaveLength(3);
    expect(calls[0]).toBe(`${OVERTURE_DATA_URL}manifest.json`);
  });
});
