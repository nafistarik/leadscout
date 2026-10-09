import { afterEach, describe, expect, test } from "bun:test";
import {
  migrateLegacySavedLeads,
  resolveLeadDisplay,
  sanitizeRecords,
} from "@/lib/saved-leads";
import { STORAGE_KEYS } from "@/lib/storage";
import type { Company } from "@/types/company";

function companyRecord() {
  return {
    id: "osm:node/7",
    kind: "osm",
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
    },
  };
}

/** Minimal in-memory localStorage so migration paths run under bun. */
function installMemoryStorage(initial: Record<string, string> = {}): Record<string, string> {
  const store: Record<string, string> = { ...initial };
  const localStorage = {
    getItem: (key: string): string | null => (key in store ? store[key] : null),
    setItem: (key: string, value: string): void => {
      store[key] = value;
    },
    removeItem: (key: string): void => {
      delete store[key];
    },
  };
  (globalThis as Record<string, unknown>).window = { localStorage };
  return store;
}

afterEach(() => {
  delete (globalThis as Record<string, unknown>).window;
});

describe("sanitizeRecords", () => {
  test("accepts valid demo and company records, drops malformed ones", () => {
    const records = sanitizeRecords([
      { id: "demo:demo-01", kind: "demo", savedAt: "2026-01-01", demoId: "demo-01" },
      companyRecord(),
      { id: "bad", kind: "demo", savedAt: "x" },
      { id: "osm:node/9", kind: "osm", savedAt: "x", company: { name: "No id" } },
      null,
      "junk",
    ]);
    expect(records).toHaveLength(2);
  });

  test("accepts both envelope and bare-array shapes, dedupes ids", () => {
    const demo = { id: "demo:demo-01", kind: "demo", savedAt: "2026-01-01", demoId: "demo-01" };
    expect(sanitizeRecords({ version: 2, records: [demo, demo] })).toHaveLength(1);
    expect(sanitizeRecords([demo])).toHaveLength(1);
    expect(sanitizeRecords(null)).toHaveLength(0);
    expect(sanitizeRecords("corrupted{")).toHaveLength(0);
  });
});

describe("migrateLegacySavedLeads", () => {
  test("migrates Part 1 ids to demo records and clears v1", () => {
    const store = installMemoryStorage({
      [STORAGE_KEYS.savedLeads]: JSON.stringify(["demo-01", "demo-02", 42, "demo-01"]),
    });
    const records = migrateLegacySavedLeads("2026-01-01T00:00:00.000Z");
    expect(records).toHaveLength(2);
    expect(records[0]).toEqual({
      id: "demo:demo-01",
      kind: "demo",
      savedAt: "2026-01-01T00:00:00.000Z",
      demoId: "demo-01",
    });
    expect(JSON.parse(store[STORAGE_KEYS.savedLeadsV2]).records).toHaveLength(2);
    expect(STORAGE_KEYS.savedLeads in store).toBe(false);
  });

  test("returns empty when no legacy data exists", () => {
    installMemoryStorage();
    expect(migrateLegacySavedLeads("2026-01-01T00:00:00.000Z")).toHaveLength(0);
  });
});

describe("resolveLeadDisplay", () => {
  const demoNameById = (id: string): string | undefined =>
    id === "demo-01" ? "Sample Co" : undefined;
  const companyById = (id: string): Company | undefined =>
    id === "osm:node/7" ? (companyRecord().company as Company) : undefined;

  test("resolves company, namespaced demo, and legacy demo ids", () => {
    expect(resolveLeadDisplay("osm:node/7", demoNameById, companyById).name).toBe("Real Co");
    expect(resolveLeadDisplay("demo:demo-01", demoNameById, companyById).kind).toBe("demo");
    expect(resolveLeadDisplay("demo-01", demoNameById, companyById).name).toBe("Sample Co");
  });

  test("marks unresolvable ids as missing", () => {
    const resolved = resolveLeadDisplay("osm:node/404", demoNameById, companyById);
    expect(resolved.kind).toBe("missing");
    expect(resolved.name).toBe("No longer saved");
  });
});
