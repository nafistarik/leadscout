/**
 * Lead pipeline: what the user has done with each saved lead.
 *
 * Everything here is entered by the user (or stamped by an explicit user
 * action such as confirming "mark as contacted"). The app cannot see the
 * user's WhatsApp or inbox, so it never infers a contact or a reply.
 * Stored apart from the company snapshots, keyed by saved-lead id, so
 * unsaving and re-saving a lead keeps its history.
 */

export const LEAD_STATUSES = ["new", "contacted", "replied", "proposal-sent", "won", "lost", "not-a-fit"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  replied: "Replied",
  "proposal-sent": "Proposal sent",
  won: "Won",
  lost: "Lost",
  "not-a-fit": "Not a fit",
};

/** Statuses where the lead is finished; a follow-up date no longer matters. */
const CLOSED_STATUSES: readonly LeadStatus[] = ["won", "lost", "not-a-fit"];

export const LOST_REASONS = ["no-budget", "not-interested", "no-reply", "has-website", "other"] as const;
export type LostReason = (typeof LOST_REASONS)[number];

export const LOST_REASON_LABELS: Record<LostReason, string> = {
  "no-budget": "No budget",
  "not-interested": "Not interested",
  "no-reply": "Never replied",
  "has-website": "Already has a website",
  other: "Other",
};

export interface LeadPipelineEntry {
  /** Omitted means "new". */
  status?: LeadStatus;
  /** Only kept while the status is "lost". */
  lostReason?: LostReason;
  notes?: string;
  /** Calendar date YYYY-MM-DD in the user's own time zone. */
  followUpDate?: string;
  /** Times the user confirmed a message was sent from the app. */
  contactCount?: number;
  /** ISO timestamp of the last confirmed contact. */
  lastContactedAt?: string;
  /** ISO timestamp of the last status change. */
  statusChangedAt?: string;
}

/** Saved-lead id → pipeline entry. */
export type LeadPipelineMap = Record<string, LeadPipelineEntry>;

export const MAX_NOTES_LENGTH = 2000;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isOneOf<T extends string>(values: readonly T[], value: unknown): value is T {
  return typeof value === "string" && (values as readonly string[]).includes(value);
}

/** Strict YYYY-MM-DD check that also rejects impossible dates like 2026-02-30. */
export function isValidDateString(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function isIsoTimestamp(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && !Number.isNaN(Date.parse(value));
}

function sanitizeEntry(value: unknown): LeadPipelineEntry | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const item = value as Record<string, unknown>;
  const entry: LeadPipelineEntry = {};
  if (isOneOf(LEAD_STATUSES, item.status) && item.status !== "new") entry.status = item.status;
  if (entry.status === "lost" && isOneOf(LOST_REASONS, item.lostReason)) entry.lostReason = item.lostReason;
  if (typeof item.notes === "string" && item.notes.trim()) entry.notes = item.notes.trim().slice(0, MAX_NOTES_LENGTH);
  if (typeof item.followUpDate === "string" && isValidDateString(item.followUpDate)) entry.followUpDate = item.followUpDate;
  if (Number.isInteger(item.contactCount) && (item.contactCount as number) > 0) entry.contactCount = item.contactCount as number;
  if (isIsoTimestamp(item.lastContactedAt)) entry.lastContactedAt = item.lastContactedAt;
  if (isIsoTimestamp(item.statusChangedAt)) entry.statusChangedAt = item.statusChangedAt;
  return Object.keys(entry).length > 0 ? entry : null;
}

/**
 * Validates stored data into a clean map; malformed entries are dropped
 * rather than crashing the page.
 */
export function sanitizePipelineMap(value: unknown): LeadPipelineMap {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return {};
  const result: LeadPipelineMap = {};
  for (const [id, raw] of Object.entries(value as Record<string, unknown>)) {
    const entry = id ? sanitizeEntry(raw) : null;
    if (entry) result[id] = entry;
  }
  return result;
}

/** A lead's status, with "new" for one the user never touched. */
export function effectiveStatus(entry: LeadPipelineEntry | undefined): LeadStatus {
  return entry?.status ?? "new";
}

/** Writes one entry, removing it when nothing is left so storage stays small. */
function withEntry(map: LeadPipelineMap, id: string, entry: LeadPipelineEntry): LeadPipelineMap {
  const next = { ...map };
  const clean = sanitizeEntry(entry);
  if (clean) next[id] = clean;
  else delete next[id];
  return next;
}

/**
 * Changes a lead's status. A lost reason survives only while the lead stays
 * lost; picking the same status again changes nothing.
 *
 * @param now ISO timestamp stamped as `statusChangedAt`.
 */
export function setLeadStatus(
  map: LeadPipelineMap,
  id: string,
  status: LeadStatus,
  now: string,
  lostReason?: LostReason,
): LeadPipelineMap {
  const current = map[id] ?? {};
  if (effectiveStatus(current) === status && (status !== "lost" || current.lostReason === lostReason)) return map;
  const next: LeadPipelineEntry = { ...current, status, statusChangedAt: now };
  if (status === "lost" && lostReason) next.lostReason = lostReason;
  else delete next.lostReason;
  return withEntry(map, id, next);
}

/** The same status for many leads at once, as one new map (a lost reason is cleared). */
export function setLeadStatusMany(map: LeadPipelineMap, ids: string[], status: LeadStatus, now: string): LeadPipelineMap {
  return ids.reduce((next, id) => setLeadStatus(next, id, status, now), map);
}

/**
 * Records a message the user confirmed sending from the app: counts it,
 * stamps the time, and moves a new lead to "contacted". A lead already
 * further along keeps its status.
 */
export function recordContact(map: LeadPipelineMap, id: string, now: string): LeadPipelineMap {
  const current = map[id] ?? {};
  const moveToContacted = effectiveStatus(current) === "new";
  return withEntry(map, id, {
    ...current,
    contactCount: (current.contactCount ?? 0) + 1,
    lastContactedAt: now,
    ...(moveToContacted ? { status: "contacted" as const, statusChangedAt: now } : {}),
  });
}

/**
 * Updates notes and/or the follow-up date. An empty string clears the field;
 * an invalid date is ignored rather than stored.
 */
export function updateLeadDetails(
  map: LeadPipelineMap,
  id: string,
  patch: { notes?: string; followUpDate?: string },
): LeadPipelineMap {
  const next: LeadPipelineEntry = { ...(map[id] ?? {}) };
  if (patch.notes !== undefined) {
    const notes = patch.notes.trim().slice(0, MAX_NOTES_LENGTH);
    if (notes) next.notes = notes;
    else delete next.notes;
  }
  if (patch.followUpDate !== undefined) {
    if (patch.followUpDate === "") delete next.followUpDate;
    else if (isValidDateString(patch.followUpDate)) next.followUpDate = patch.followUpDate;
  }
  return withEntry(map, id, next);
}

/**
 * Whether a lead needs a follow-up today: its date has arrived and the lead
 * is still open (won, lost and not-a-fit never nag).
 *
 * @param today The user's local date as YYYY-MM-DD (see `localDateString`).
 */
export function isFollowUpDue(entry: LeadPipelineEntry | undefined, today: string): boolean {
  if (!entry?.followUpDate) return false;
  if (CLOSED_STATUSES.includes(effectiveStatus(entry))) return false;
  // Same-format YYYY-MM-DD strings compare correctly as text.
  return entry.followUpDate <= today;
}

/** The user's local calendar date as YYYY-MM-DD, for follow-up comparisons. */
export function localDateString(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Statuses that mean the business answered at some point. */
const ANSWERED: readonly LeadStatus[] = ["replied", "proposal-sent", "won"];

export interface PipelineRates {
  /** Leads that were contacted: anything past New, except Not a fit. */
  reached: number;
  replied: number;
  won: number;
  /** Whole percentages, or null before anyone was reached. */
  replyRate: number | null;
  winRate: number | null;
}

/**
 * How well outreach works: of the leads contacted, how many answered and how
 * many became projects. A lost lead counts as reached but not answered,
 * since the app cannot tell whether a lost lead replied first.
 */
export function pipelineRates(statuses: LeadStatus[]): PipelineRates {
  const reached = statuses.filter((status) => status !== "new" && status !== "not-a-fit").length;
  const replied = statuses.filter((status) => ANSWERED.includes(status)).length;
  const won = statuses.filter((status) => status === "won").length;
  const percent = (part: number) => (reached === 0 ? null : Math.round((part / reached) * 100));
  return { reached, replied, won, replyRate: percent(replied), winRate: percent(won) };
}
