import { afterEach, describe, expect, test } from "bun:test";
import { STORAGE_KEYS } from "@/lib/storage";
import {
  readSavedLeadRecordsForTests,
  resetSavedLeadStoreForTests,
} from "@/hooks/use-saved-leads";

type MutableGlobals = Record<string, unknown>;
const globals = globalThis as MutableGlobals;
const savedWindow = globals.window;

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

  test("migrates legacy v1 ids once, then v2 wins on later reads", () => {
    const store = installMemoryStorage({
      [STORAGE_KEYS.savedLeads]: JSON.stringify(["demo-01"]),
    });
    resetSavedLeadStoreForTests();
    const first = readSavedLeadRecordsForTests();
    expect(first).toHaveLength(1);
    expect(first[0]).toEqual({
      id: "demo:demo-01",
      kind: "demo",
      savedAt: first[0].savedAt,
      demoId: "demo-01",
    });
    // v2 was persisted and v1 removed.
    expect(typeof store[STORAGE_KEYS.savedLeadsV2]).toBe("string");
    expect(STORAGE_KEYS.savedLeads in store).toBe(false);
    // Second read uses v2 without re-migrating.
    expect(readSavedLeadRecordsForTests()).toHaveLength(1);
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
        records: [{ id: "demo:demo-01", kind: "demo", savedAt: "2026-01-01", demoId: "demo-01" }],
      }),
    });
    resetSavedLeadStoreForTests();
    expect(readSavedLeadRecordsForTests()).toHaveLength(1);
    delete store[STORAGE_KEYS.savedLeadsV2];
    expect(readSavedLeadRecordsForTests()).toEqual([]);
  });

  test("session state survives when writes fail (private mode)", () => {
    // Seed v1 directly (bypasses the throwing setItem), then migrate with
    // writes failing: the migrated session value must still be returned.
    const store: Record<string, string> = {
      [STORAGE_KEYS.savedLeads]: JSON.stringify(["demo-02"]),
    };
    const localStorage = {
      getItem: (key: string): string | null => (key in store ? store[key] : null),
      setItem: (): void => {
        throw new Error("QuotaExceededError");
      },
      removeItem: (key: string): void => {
        delete store[key];
      },
    };
    globals.window = { localStorage };
    resetSavedLeadStoreForTests();
    const records = readSavedLeadRecordsForTests();
    expect(records).toHaveLength(1);
    expect(records[0].id).toBe("demo:demo-02");
    // A second read in the same session keeps the value instead of wiping it.
    expect(readSavedLeadRecordsForTests()).toHaveLength(1);
  });
});
