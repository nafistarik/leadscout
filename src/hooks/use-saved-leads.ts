import { useCallback, useState, useSyncExternalStore } from "react";
import type { Company, SavedLeadRecord } from "@/types/company";
import { toDemoRecordId } from "@/types/company";
import { STORAGE_KEYS, readLocalStorage, safeJsonParse, writeLocalStorage } from "@/lib/storage";
import {
  migrateLegacySavedLeads,
  sanitizeRecords,
  serializeRecords,
} from "@/lib/saved-leads";
import {
  notifyStorageChanged,
  probeStorage,
  subscribeToStorage,
} from "@/hooks/use-local-storage-value";

/**
 * Saved-lead state (demo references + real company snapshots) persisted to
 * localStorage under a versioned envelope.
 *
 * - SSR-safe via useSyncExternalStore (server snapshot: empty).
 * - Part 1 demo-id arrays migrate to v2 records exactly once per session;
 *   existing user data is preserved.
 * - Malformed stored records are dropped by validation, never crash pages.
 * - Cross-tab sync is preserved through the shared storage-event channel.
 */

interface RecordCache {
  raw: string | null;
  value: SavedLeadRecord[];
}

const cache: RecordCache = { raw: undefined as unknown as string | null, value: [] };
let cacheReady = false;
let migrationAttempted = false;

function readRecords(): SavedLeadRecord[] {
  const raw = readLocalStorage(STORAGE_KEYS.savedLeadsV2);
  if (raw !== null) {
    if (cacheReady && cache.raw === raw) return cache.value;
    const value = sanitizeRecords(safeJsonParse<unknown>(raw, []));
    cache.raw = raw;
    cache.value = value;
    cacheReady = true;
    return value;
  }
  if (!migrationAttempted) {
    migrationAttempted = true;
    const migrated = migrateLegacySavedLeads(new Date().toISOString());
    cache.raw = readLocalStorage(STORAGE_KEYS.savedLeadsV2);
    cache.value = migrated;
    cacheReady = true;
    return migrated;
  }
  if (cacheReady) return cache.value;
  cache.raw = null;
  cache.value = [];
  cacheReady = true;
  return [];
}

function writeRecords(next: SavedLeadRecord[]): void {
  const serialized = serializeRecords(next);
  const ok = writeLocalStorage(STORAGE_KEYS.savedLeadsV2, serialized);
  cache.raw = ok ? serialized : readLocalStorage(STORAGE_KEYS.savedLeadsV2);
  cache.value = next;
  cacheReady = true;
  notifyStorageChanged();
}

export function useSavedLeads() {
  const records = useSyncExternalStore(subscribeToStorage, readRecords, () => []);
  const [storageAvailable] = useState(probeStorage);

  const setRecords = useCallback((next: SavedLeadRecord[]) => {
    writeRecords(next);
  }, []);

  const savedIds = records.map((record) => record.id);

  const isSaved = useCallback(
    (recordId: string) => records.some((record) => record.id === recordId),
    [records],
  );

  const isDemoSaved = useCallback(
    (demoId: string) => isSaved(toDemoRecordId(demoId)),
    [isSaved],
  );

  const isCompanySaved = useCallback((companyId: string) => isSaved(companyId), [isSaved]);

  const toggleDemo = useCallback(
    (demoId: string) => {
      const id = toDemoRecordId(demoId);
      if (isSaved(id)) {
        setRecords(records.filter((record) => record.id !== id));
      } else {
        setRecords([
          ...records,
          { id, kind: "demo", savedAt: new Date().toISOString(), demoId },
        ]);
      }
    },
    [isSaved, records, setRecords],
  );

  const toggleCompany = useCallback(
    (company: Company) => {
      if (isSaved(company.id)) {
        setRecords(records.filter((record) => record.id !== company.id));
      } else {
        // Dedupe by provider id: never store the same record twice.
        const withoutDupes = records.filter((record) => record.id !== company.id);
        setRecords([
          ...withoutDupes,
          { id: company.id, kind: "osm", savedAt: new Date().toISOString(), company },
        ]);
      }
    },
    [isSaved, records, setRecords],
  );

  const removeSaved = useCallback(
    (recordId: string) => {
      setRecords(records.filter((record) => record.id !== recordId));
    },
    [records, setRecords],
  );

  const getCompany = useCallback(
    (companyId: string): Company | undefined => {
      const record = records.find((item) => item.id === companyId);
      return record?.kind === "osm" ? record.company : undefined;
    },
    [records],
  );

  return {
    records,
    savedIds,
    storageAvailable,
    isSaved,
    isDemoSaved,
    isCompanySaved,
    toggleDemo,
    toggleCompany,
    removeSaved,
    getCompany,
  };
}
