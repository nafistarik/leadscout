import type { Company, SavedLeadRecord } from "@/types/company";
import { companyRecord } from "@/types/company";

/**
 * Saved-lead store helpers (pure): validation and serialization for real
 * company snapshots persisted under `savedLeads.v2`.
 *
 * Records from older schemas (demo references, legacy id arrays) are dropped
 * by validation instead of crashing — only real company snapshots load.
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
  if (!isValidCompany(item.company)) return null;
  return companyRecord(item.company, item.savedAt);
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

export function serializeRecords(records: SavedLeadRecord[]): string {
  return JSON.stringify({ version: SAVED_LEADS_SCHEMA_VERSION, records });
}

export { companyRecord };
