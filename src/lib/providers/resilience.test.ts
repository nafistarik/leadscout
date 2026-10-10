import { afterEach, describe, expect, test } from "bun:test";
import { fetchOverpass } from "@/lib/providers/overpass";
import { companyProvider } from "@/lib/providers/index";
import { resolveSearchArea } from "@/lib/providers/nominatim";
import { tagsForCategory } from "@/lib/providers/osm-tags";
import { ProviderError } from "@/lib/providers/types";
import type { SearchArea } from "@/lib/providers/nominatim";

type MutableGlobals = Record<string, unknown>;
const globals = globalThis as MutableGlobals;
const savedFetch = globals.fetch;
const savedWindow = globals.window;

const AREA: SearchArea = {
  south: 47.98,
  west: 7.82,
  north: 48.02,
  east: 7.88,
  label: "Freiburg, Germany",
  city: "Freiburg",
  country: "Germany",
};

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function installFetch(
  impl: (url: string, init?: { signal?: AbortSignal }) => Promise<Response>,
): string[] {
  const calls: string[] = [];
  globals.fetch = (url: string, init?: { signal?: AbortSignal }): Promise<Response> => {
    calls.push(url);
    return impl(url, init);
  };
  return calls;
}

function installMemoryStorage(initial: Record<string, string> = {}) {
  const store: Record<string, string> = { ...initial };
  globals.window = {
    localStorage: {
      getItem: (key: string): string | null => (key in store ? store[key] : null),
      setItem: (key: string, value: string): void => {
        store[key] = value;
      },
      removeItem: (key: string): void => {
        delete store[key];
      },
    },
  };
  return store;
}

afterEach(() => {
  globals.fetch = savedFetch;
  globals.window = savedWindow;
});

const neverAbort = { signal: new AbortController().signal };

function overpassParams() {
  return {
    tags: tagsForCategory("Bakery"),
    keyword: "",
    area: AREA,
    serverLimit: 10,
  };
}

function element(id: number, name: string) {
  return {
    type: "node",
    id,
    lat: 48.0,
    lon: 7.85,
    tags: { name, shop: "bakery" },
  };
}

describe("fetchOverpass resilience (stubbed fetch — no network)", () => {
  test("rate-limit fails fast with one attempt and no fallback", async () => {
    const calls = installFetch(() => Promise.resolve(jsonResponse({}, 429)));
    let caught: unknown = null;
    try {
      await fetchOverpass(overpassParams(), neverAbort);
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(ProviderError);
    expect((caught as ProviderError).kind).toBe("rate-limit");
    expect(calls).toHaveLength(1);
  });

  test("server errors fall back once and normalize without data loss", async () => {
    const calls = installFetch((url: string) => {
      if (url.startsWith("https://overpass-api.de/")) {
        return Promise.resolve(jsonResponse({}, 500));
      }
      return Promise.resolve(
        jsonResponse({ elements: [element(1, "A"), element(1, "A"), element(2, "B")] }),
      );
    });
    const result = await fetchOverpass(overpassParams(), neverAbort);
    expect(calls).toHaveLength(2);
    // The fetch layer normalizes every element (deduplication is the
    // orchestrator's job and is covered by dedupeCompanies tests).
    expect(result.companies.map((c) => c.id)).toEqual(["osm:node/1", "osm:node/1", "osm:node/2"]);
    expect(result.companies[0].name).toBe("A");
    expect(result.truncated).toBe(false);
  });

  test("malformed payloads become bad-response errors, not crashes", async () => {
    installFetch(() => Promise.resolve(jsonResponse({ noElements: true })));
    let caught: unknown = null;
    try {
      await fetchOverpass(overpassParams(), neverAbort);
    } catch (error) {
      caught = error;
    }
    expect((caught as ProviderError).kind).toBe("bad-response");
  });

  test("server-side timeout remarks become timeout errors", async () => {
    installFetch(() => Promise.resolve(jsonResponse({ remark: "Query timed out" })));
    let caught: unknown = null;
    try {
      await fetchOverpass(overpassParams(), neverAbort);
    } catch (error) {
      caught = error;
    }
    expect((caught as ProviderError).kind).toBe("timeout");
  });

  test("aborted requests settle promptly without success", async () => {
    const controller = new AbortController();
    controller.abort();
    const calls = installFetch((_url: string, init?: { signal?: AbortSignal }) =>
      init?.signal?.aborted
        ? Promise.reject(new DOMException("Aborted", "AbortError"))
        : new Promise<Response>(() => {}),
    );
    let caught: unknown = null;
    try {
      await fetchOverpass(overpassParams(), { signal: controller.signal });
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(ProviderError);
    expect((caught as ProviderError).kind).toBe("timeout");
    // Primary fails instantly on the dead signal; exactly one fallback
    // attempt follows, then the error surfaces — no storm, no success.
    expect(calls).toHaveLength(2);
  });
});

describe("resolveSearchArea resilience (stubbed fetch — no network)", () => {
  test("empty city never touches the network", async () => {
    const calls = installFetch(() => Promise.resolve(jsonResponse([])));
    installMemoryStorage();
    let caught: unknown = null;
    try {
      await resolveSearchArea("   ", "Germany", neverAbort);
    } catch (error) {
      caught = error;
    }
    expect((caught as ProviderError).kind).toBe("needs-location");
    expect(calls).toHaveLength(0);
  });

  test("empty results become location-not-found", async () => {
    installFetch(() => Promise.resolve(jsonResponse([])));
    installMemoryStorage();
    let caught: unknown = null;
    try {
      await resolveSearchArea("Nowhereville", "", neverAbort);
    } catch (error) {
      caught = error;
    }
    expect((caught as ProviderError).kind).toBe("location-not-found");
  });

  test("rate limits map to rate-limit errors", async () => {
    installFetch(() => Promise.resolve(jsonResponse({}, 429)));
    installMemoryStorage();
    let caught: unknown = null;
    try {
      await resolveSearchArea("Freiburg", "Germany", neverAbort);
    } catch (error) {
      caught = error;
    }
    expect((caught as ProviderError).kind).toBe("rate-limit");
  });

  test("malformed bounding boxes become bad-response errors", async () => {
    installFetch(() =>
      Promise.resolve(
        jsonResponse([{ boundingbox: ["x", "y"], display_name: "X", address: {} }]),
      ),
    );
    installMemoryStorage();
    let caught: unknown = null;
    try {
      await resolveSearchArea("Freiburg", "Germany", neverAbort);
    } catch (error) {
      caught = error;
    }
    expect((caught as ProviderError).kind).toBe("bad-response");
  });

  test("second identical resolution reuses the geocode cache", async () => {
    const calls = installFetch(() =>
      Promise.resolve(
        jsonResponse([
          {
            boundingbox: ["47.98", "48.02", "7.82", "7.88"],
            display_name: "Freiburg, Germany",
            address: { city: "Freiburg", country: "Germany" },
          },
        ]),
      ),
    );
    installMemoryStorage();
    const first = await resolveSearchArea("Freiburg", "Germany", neverAbort);
    const second = await resolveSearchArea("Freiburg", "Germany", neverAbort);
    expect(first).toEqual(second);
    expect(first.city).toBe("Freiburg");
    expect(calls).toHaveLength(1);
  });
});

describe("companyProvider.search orchestration (stubbed fetch — no network)", () => {
  const cityBbox = ["47.98", "48.02", "7.82", "7.88"];
  const hugeBbox = ["40.0", "55.0", "-10.0", "15.0"];

  function installProviderStubs() {
    const calls: string[] = [];
    globals.fetch = (url: string): Promise<Response> => {
      calls.push(url);
      if (url.startsWith("https://nominatim.openstreetmap.org/")) {
        const huge = url.includes("Bigcountry");
        return Promise.resolve(
          jsonResponse([
            {
              boundingbox: huge ? hugeBbox : cityBbox,
              display_name: huge ? "Bigcountry" : "Testville, Germany",
              address: huge
                ? { country: "Bigcountry" }
                : { city: "Testville", country: "Germany" },
            },
          ]),
        );
      }
      return Promise.resolve(
        jsonResponse({
          elements: [
            element(1, "Alpha"),
            element(1, "Alpha"),
            element(2, "Beta"),
          ],
        }),
      );
    };
    return calls;
  }

  test("geocode, guard, fetch, dedupe, slice, and cache a full search", async () => {
    const calls = installProviderStubs();
    installMemoryStorage();
    const request = {
      country: "Germany",
      city: "Testville",
      category: "Bakery",
      keyword: "",
      maxResults: 10,
      hasWebsite: false,
      hasPhone: false,
      hasEmail: false,
      hasOpeningHours: false,
      minScore: 0,
      sort: "provider" as const,
    };
    const first = await companyProvider.search(request, neverAbort);
    expect(first.companies.map((c) => c.id)).toEqual(["osm:node/1", "osm:node/2"]);
    expect(first.meta.areaLabel).toBe("Testville, Germany");
    expect(first.meta.truncated).toBe(false);
    expect(first.meta.areaKm2).not.toBeNull();
    const fetchCount = calls.length;
    expect(fetchCount).toBe(2); // one geocode + one overpass query
    // Identical repeat search is fully cached: zero additional requests.
    const second = await companyProvider.search(request, neverAbort);
    expect(second).toEqual(first);
    expect(calls).toHaveLength(fetchCount);
  });

  test("oversized areas fail before any Overpass request", async () => {
    const calls = installProviderStubs();
    installMemoryStorage();
    let caught: unknown = null;
    try {
      await companyProvider.search(
        {
          country: "",
          city: "Bigcountry",
          category: "Bakery",
          keyword: "",
          maxResults: 10,
          hasWebsite: false,
          hasPhone: false,
          hasEmail: false,
          hasOpeningHours: false,
          minScore: 0,
          sort: "provider",
        },
        neverAbort,
      );
    } catch (error) {
      caught = error;
    }
    expect((caught as ProviderError).kind).toBe("area-too-large");
    expect(calls).toHaveLength(1); // geocode only
  });

  test("pre-aborted signal aborts before any completed request", async () => {
    const calls: string[] = [];
    globals.fetch = (url: string, init?: { signal?: AbortSignal }): Promise<Response> => {
      calls.push(url);
      if (init?.signal?.aborted) {
        return Promise.reject(new DOMException("Aborted", "AbortError"));
      }
      return Promise.resolve(jsonResponse([]));
    };
    installMemoryStorage();
    const controller = new AbortController();
    controller.abort();
    let caught: unknown = null;
    try {
      await companyProvider.search(
        {
          country: "Germany",
          city: "NeverFetched",
          category: "Bakery",
          keyword: "",
          maxResults: 10,
          hasWebsite: false,
          hasPhone: false,
          hasEmail: false,
          hasOpeningHours: false,
          minScore: 0,
          sort: "provider",
        },
        { signal: controller.signal },
      );
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(ProviderError);
    expect((caught as ProviderError).kind).toBe("timeout");
    // The in-flight attempt is torn down; nothing reports success.
    expect(calls.length < 2).toBe(true);
  });

  test("caller abort mid-flight settles promptly with no success", async () => {
    // A stub that hangs like a stalled upstream but honors abort, exactly
    // like a real fetch does.
    globals.fetch = (_url: string, init?: { signal?: AbortSignal }): Promise<Response> =>
      new Promise((_, reject) => {
        if (init?.signal?.aborted) {
          reject(new DOMException("Aborted", "AbortError"));
          return;
        }
        init?.signal?.addEventListener(
          "abort",
          () => reject(new DOMException("Aborted", "AbortError")),
          { once: true },
        );
      });
    installMemoryStorage();
    const controller = new AbortController();
    const pending = companyProvider.search(
      {
        country: "Germany",
        city: "HangingCity",
        category: "Bakery",
        keyword: "",
        maxResults: 10,
        hasWebsite: false,
        hasPhone: false,
        hasEmail: false,
        hasOpeningHours: false,
        minScore: 0,
        sort: "provider",
      },
      { signal: controller.signal },
    );
    controller.abort();
    let caught: unknown = null;
    try {
      await pending;
    } catch (error) {
      caught = error;
    }
    // Settles (test would time out otherwise) and never reports success.
    expect(caught).toBeInstanceOf(ProviderError);
  });
});
