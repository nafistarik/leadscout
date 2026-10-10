import { useCallback, useState, useSyncExternalStore } from "react";
import type { Company, SavedLeadRecord } from "@/types/company";
import { companyRecord } from "@/types/company";
import { STORAGE_KEYS, readLocalStorage, safeJsonParse, writeLocalStorage } from "@/lib/storage";
import { sanitizeRecords, serializeRecords } from "@/lib/saved-leads";
import {
  notifyStorageChanged,
  probeStorage,
  subscribeToStorage,
} from "@/hooks/use-local-storage-value";

/**
 * Saved-lead state: snapshots of real company records persisted to
 * localStorage under a versioned envelope.
 *
 * - SSR-safe via useSyncExternalStore (server snapshot: empty).
 * - Malformed or legacy (non-company) stored records are dropped by
 *   validation, never crash pages.
 * - Cross-tab sync is preserved through the shared storage-event channel.
 */

interface RecordCache {
  raw: string | null;
  value: SavedLeadRecord[];
}

const cache: RecordCache = { raw: undefined as unknown as string | null, value: [] };
let cacheReady = false;

function readRecords(): SavedLeadRecord[] {
  const raw = readLocalStorage(STORAGE_KEYS.savedLeadsV2);
  if (cacheReady && cache.raw === raw) return cache.value;
  // A null raw after previously holding data means the key was deleted
  // externally (e.g. local-data reset): resolve to empty, never resurrect
  // the stale cache. Otherwise the store reads as empty.
  const value = raw === null ? [] : sanitizeRecords(safeJsonParse<unknown>(raw, []));
  cache.raw = raw;
  cache.value = value;
  cacheReady = true;
  return value;
}

function writeRecords(next: SavedLeadRecord[]): void {
  const serialized = serializeRecords(next);
  const ok = writeLocalStorage(STORAGE_KEYS.savedLeadsV2, serialized);
  cache.raw = ok ? serialized : readLocalStorage(STORAGE_KEYS.savedLeadsV2);
  cache.value = next;
  cacheReady = true;
  notifyStorageChanged();
}

/**
 * Test seams for the store lifecycle (see saved-leads-store.test.ts):
 * direct access to the real reader plus a module-state reset so each test
 * starts from a clean store.
 */
export function readSavedLeadRecordsForTests(): SavedLeadRecord[] {
  return readRecords();
}

export function resetSavedLeadStoreForTests(): void {
  cache.raw = null;
  cache.value = [];
  cacheReady = false;
}

/** Frozen empty snapshot: referentially stable for getServerSnapshot. */
const EMPTY_RECORDS: readonly SavedLeadRecord[] = Object.freeze([]);

export function useSavedLeads() {
  const records = useSyncExternalStore(subscribeToStorage, readRecords, () => EMPTY_RECORDS as SavedLeadRecord[]);
  const [storageAvailable] = useState(probeStorage);

  const setRecords = useCallback((next: SavedLeadRecord[]) => {
    writeRecords(next);
  }, []);

  const isCompanySaved = useCallback(
    (companyId: string) => records.some((record) => record.id === companyId),
    [records],
  );

  const toggleCompany = useCallback(
    (company: Company) => {
      // Dedupe by provider id: never store the same record twice.
      const withoutDupes = records.filter((record) => record.id !== company.id);
      if (withoutDupes.length !== records.length) {
        setRecords(withoutDupes);
      } else {
        setRecords([...withoutDupes, companyRecord(company, new Date().toISOString())]);
      }
    },
    [records, setRecords],
  );

  return {
    records,
    storageAvailable,
    isCompanySaved,
    toggleCompany,
  };
}
