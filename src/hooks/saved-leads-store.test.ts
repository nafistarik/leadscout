import { afterEach, describe, expect, test } from "bun:test";
import { STORAGE_KEYS } from "@/lib/storage";
import {
  readSavedLeadRecordsForTests,
  resetSavedLeadStoreForTests,
} from "@/hooks/use-saved-leads";

type MutableGlobals = Record<string, unknown>;
const globals = globalThis as MutableGlobals;
const savedWindow = globals.window;

function companyRecord(id: string) {
  return {
    id,
    savedAt: "2026-01-01T00:00:00.000Z",
    company: {
      id,
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

/** In-memory localStorage; optionally fails writes to simulate quota/private mode. */
function installMemoryStorage(initial: Record<string, string> = {}, failWrites = false) {
  const store: Record<string, string> = { ...initial };
  const localStorage = {
    getItem: (key: string): string | null => (key in store ? store[key] : null),
    setItem: (key: string, value: string): void => {
      if (failWrites) throw new Error("QuotaExceededError");
      store[key] = value;
    },
    removeItem: (key: string): void => {
      delete store[key];
    },
  };
  globals.window = { localStorage };
  return store;
}

afterEach(() => {
  globals.window = savedWindow;
  resetSavedLeadStoreForTests();
});

describe("saved-lead store lifecycle (real reader)", () => {
  test("starts empty with no stored data", () => {
    installMemoryStorage();
    resetSavedLeadStoreForTests();
    expect(readSavedLeadRecordsForTests()).toEqual([]);
  });

  test("reads real company snapshots from v2", () => {
    installMemoryStorage({
      [STORAGE_KEYS.savedLeadsV2]: JSON.stringify({
        version: 2,
        records: [companyRecord("osm:node/7")],
      }),
    });
    resetSavedLeadStoreForTests();
    const records = readSavedLeadRecordsForTests();
    expect(records).toHaveLength(1);
    expect(records[0].company.name).toBe("Real Co");
  });

  test("drops legacy demo references instead of crashing", () => {
    installMemoryStorage({
      [STORAGE_KEYS.savedLeadsV2]: JSON.stringify({
        version: 2,
        records: [
          { id: "demo:demo-01", kind: "demo", savedAt: "2026-01-01", demoId: "demo-01" },
          companyRecord("osm:node/7"),
        ],
      }),
    });
    resetSavedLeadStoreForTests();
    const records = readSavedLeadRecordsForTests();
    expect(records).toHaveLength(1);
    expect(records[0].id).toBe("osm:node/7");
  });

  test("corrupt v2 data resolves to empty without crashing", () => {
    installMemoryStorage({ [STORAGE_KEYS.savedLeadsV2]: "{{{not json" });
    resetSavedLeadStoreForTests();
    expect(readSavedLeadRecordsForTests()).toEqual([]);
  });

  test("external deletion after data returns empty, not stale cache", () => {
    const store = installMemoryStorage({
      [STORAGE_KEYS.savedLeadsV2]: JSON.stringify({
        version: 2,
        records: [companyRecord("osm:node/7")],
      }),
    });
    resetSavedLeadStoreForTests();
    expect(readSavedLeadRecordsForTests()).toHaveLength(1);
    delete store[STORAGE_KEYS.savedLeadsV2];
    expect(readSavedLeadRecordsForTests()).toEqual([]);
  });
});
