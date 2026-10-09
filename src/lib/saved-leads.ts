import type { Company, SavedLeadRecord } from "@/types/company";
import { companyRecord, demoRecord } from "@/types/company";
import { STORAGE_KEYS, readLocalStorage, safeJsonParse, writeLocalStorage } from "@/lib/storage";

/**
 * Saved-lead store helpers (pure): validation, versioned migration, and
 * resolution of list/display references.
 *
 * Schema history:
 * - v1 (`savedLeadIds.v1`): `string[]` of demo ids from Part 1.
 * - v2 (`savedLeads.v2`): `{ version: 2, records: SavedLeadRecord[] }`
 *   holding both demo references and real company snapshots.
 */
export const SAVED_LEADS_SCHEMA_VERSION = 2;

function isValidCompany(value: unknown): value is Company {
  if (typeof value !== "object" || value === null) return false;
  const c = value as Record<string, unknown>;
  return (
    typeof c.id === "string" &&
    c.id.length > 0 &&
    (c.provenance === "osm" || c.provenance === "demo") &&
    typeof c.name === "string" &&
    c.name.length > 0 &&
    typeof c.category === "string" &&
    typeof c.locationLabel === "string" &&
    typeof c.source === "string" &&
    typeof c.tags === "object" &&
    c.tags !== null
  );
}

function sanitizeRecord(value: unknown): SavedLeadRecord | null {
  if (typeof value !== "object" || value === null) return null;
  const item = value as Record<string, unknown>;
  if (typeof item.id !== "string" || !item.id) return null;
  if (typeof item.savedAt !== "string" || !item.savedAt) return null;
  if (item.kind === "demo") {
    if (typeof item.demoId !== "string" || !item.demoId) return null;
    return { id: item.id, kind: "demo", savedAt: item.savedAt, demoId: item.demoId };
  }
  if (item.kind === "osm") {
    if (!isValidCompany(item.company)) return null;
    return { id: item.id, kind: "osm", savedAt: item.savedAt, company: item.company };
  }
  return null;
}

/** Validates unknown input into clean records; malformed entries are dropped. */
export function sanitizeRecords(value: unknown): SavedLeadRecord[] {
  const records = Array.isArray(value)
    ? value
    : typeof value === "object" && value !== null && Array.isArray((value as { records?: unknown }).records)
      ? (value as { records: unknown[] }).records
      : [];
  const seen = new Set<string>();
  const result: SavedLeadRecord[] = [];
  for (const entry of records) {
    const record = sanitizeRecord(entry);
    if (!record || seen.has(record.id)) continue;
    seen.add(record.id);
    result.push(record);
  }
  return result;
}

function sanitizeLegacyIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const id of value) {
    if (typeof id !== "string" || !id || seen.has(id)) continue;
    seen.add(id);
    result.push(id);
  }
  return result;
}

/**
 * Migrates Part 1 demo-id arrays to v2 records. Runs once: reads v1, writes
 * v2, then removes v1 (best-effort). Pure except for the storage side effect,
 * which is idempotent — re-running after a partial failure simply retries.
 */
export function migrateLegacySavedLeads(nowIso: string): SavedLeadRecord[] {
  const legacy = sanitizeLegacyIds(safeJsonParse<unknown>(readLocalStorage(STORAGE_KEYS.savedLeads), []));
  const records = legacy.map((demoId) => demoRecord(demoId, nowIso));
  if (records.length > 0) {
    writeLocalStorage(
      STORAGE_KEYS.savedLeadsV2,
      JSON.stringify({ version: SAVED_LEADS_SCHEMA_VERSION, records }),
    );
  }
  try {
    if (typeof window !== "undefined") window.localStorage.removeItem(STORAGE_KEYS.savedLeads);
  } catch {
    // Best-effort cleanup; the v1 key is ignored once v2 exists.
  }
  return records;
}

export function serializeRecords(records: SavedLeadRecord[]): string {
  return JSON.stringify({ version: SAVED_LEADS_SCHEMA_VERSION, records });
}

export interface ResolvedLead {
  id: string;
  name: string;
  kind: "demo" | "osm" | "missing";
}

/**
 * Resolves a list/store id to a display name. Handles namespaced ids
 * ("demo:…", "osm:…") and legacy raw Part-1 demo ids ("demo-01").
 */
export function resolveLeadDisplay(
  id: string,
  demoNameById: (demoId: string) => string | undefined,
  companyById: (companyId: string) => Company | undefined,
): ResolvedLead {
  const company = companyById(id);
  if (company) return { id, name: company.name, kind: "osm" };
  const demoId = id.startsWith("demo:") ? id.slice("demo:".length) : id;
  const demoName = demoNameById(demoId);
  if (demoName) return { id, name: demoName, kind: "demo" };
  return { id, name: "No longer saved", kind: "missing" };
}

export { companyRecord, demoRecord };
