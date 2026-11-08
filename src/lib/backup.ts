import { sanitizePipelineMap } from "@/lib/lead-pipeline";
import type { LeadPipelineEntry, LeadPipelineMap } from "@/lib/lead-pipeline";
import { sanitizeRecords } from "@/lib/saved-leads";
import type { SavedLeadRecord } from "@/types/company";

/**
 * Backup file for saved leads and their pipeline. Everything lives in one
 * browser, so this is how a user keeps a copy and how two people working
 * the same leads share their progress: export here, import there.
 */

export const BACKUP_APP = "leadscout";
export const BACKUP_VERSION = 1;
/** Far above any real list; stops a wrong or hostile file from freezing the tab. */
export const MAX_BACKUP_BYTES = 5_000_000;

export interface LeadsBackup {
  app: typeof BACKUP_APP;
  version: typeof BACKUP_VERSION;
  exportedAt: string;
  savedLeads: SavedLeadRecord[];
  pipeline: LeadPipelineMap;
}

/** Serializes the current saved leads and pipeline as a backup file. */
export function buildBackup(savedLeads: SavedLeadRecord[], pipeline: LeadPipelineMap, exportedAt: string): string {
  const backup: LeadsBackup = { app: BACKUP_APP, version: BACKUP_VERSION, exportedAt, savedLeads, pipeline };
  return JSON.stringify(backup, null, 2);
}

/**
 * Reads a backup file, validating every record with the same rules as
 * browser storage; anything malformed is dropped, never trusted.
 *
 * @throws Error with a user-facing message when the text is not a LeadScout backup.
 */
export function parseBackup(text: string): { savedLeads: SavedLeadRecord[]; pipeline: LeadPipelineMap } {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error("This file is not valid JSON.");
  }
  const item = typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
  if (item?.app !== BACKUP_APP || typeof item.version !== "number") {
    throw new Error("This file is not a LeadScout backup.");
  }
  if (item.version > BACKUP_VERSION) {
    throw new Error("This backup was made by a newer version of LeadScout.");
  }
  return { savedLeads: sanitizeRecords(item.savedLeads), pipeline: sanitizePipelineMap(item.pipeline) };
}

/** When a pipeline entry last changed, from the timestamps it carries. */
function touchedAt(entry: LeadPipelineEntry): number {
  return Math.max(Date.parse(entry.statusChangedAt ?? "") || 0, Date.parse(entry.lastContactedAt ?? "") || 0);
}

export interface MergeResult {
  savedLeads: SavedLeadRecord[];
  pipeline: LeadPipelineMap;
  added: number;
  updated: number;
}

/**
 * Merges an imported backup into what this browser already has. Leads only
 * ever get added; for a lead both sides track, the more recently changed
 * pipeline entry wins, and the contact count keeps the higher number so no
 * contact is forgotten.
 */
export function mergeBackup(
  current: { savedLeads: SavedLeadRecord[]; pipeline: LeadPipelineMap },
  incoming: { savedLeads: SavedLeadRecord[]; pipeline: LeadPipelineMap },
): MergeResult {
  const known = new Set(current.savedLeads.map((record) => record.id));
  const newLeads = incoming.savedLeads.filter((record) => !known.has(record.id));
  const pipeline: LeadPipelineMap = { ...current.pipeline };
  let updated = 0;
  for (const [id, theirs] of Object.entries(incoming.pipeline)) {
    const ours = pipeline[id];
    if (!ours) {
      pipeline[id] = theirs;
      if (known.has(id)) updated += 1;
      continue;
    }
    const winner = touchedAt(theirs) > touchedAt(ours) ? theirs : ours;
    const contactCount = Math.max(ours.contactCount ?? 0, theirs.contactCount ?? 0);
    const merged = { ...winner, ...(contactCount > 0 ? { contactCount } : {}) };
    if (JSON.stringify(merged) !== JSON.stringify(ours)) {
      pipeline[id] = merged;
      updated += 1;
    }
  }
  return { savedLeads: [...current.savedLeads, ...newLeads], pipeline, added: newLeads.length, updated };
}

/** Filename like leadscout-backup-20261108-1430.json, in the user's local time. */
export function backupFilename(now: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
  return `leadscout-backup-${stamp}.json`;
}
