import type { Company } from "@/types/company";
import type { DemoLead } from "@/types/lead";
import {
  isLeadStatus,
  isNextAction,
} from "@/types/workflow";
import type { LeadStatus, LeadWorkflow, LeadWorkflowMap } from "@/types/workflow";

/**
 * Pure workflow helpers: validation, overdue math, and the transparent
 * qualification checklist. Qualification rows report what the record
 * contains (match) or what is simply unknown — absence is never framed
 * as proof a company is unsuitable.
 */

const MAX_NOTES_LENGTH = 2000;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Strict YYYY-MM-DD calendar-date check (rejects 2026-02-30 etc.). */
export function isValidDateString(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function sanitizeWorkflow(value: unknown): LeadWorkflow | null {
  if (typeof value !== "object" || value === null) return null;
  const item = value as Record<string, unknown>;
  const workflow: LeadWorkflow = {};
  if (isLeadStatus(item.status)) workflow.status = item.status;
  if (typeof item.notes === "string" && item.notes.trim()) {
    workflow.notes = item.notes.trim().slice(0, MAX_NOTES_LENGTH);
  }
  if (isNextAction(item.nextAction) && item.nextAction !== "none") {
    workflow.nextAction = item.nextAction;
  }
  if (typeof item.followUpDate === "string" && isValidDateString(item.followUpDate)) {
    workflow.followUpDate = item.followUpDate;
  }
  if (typeof item.lastReviewedAt === "string" && item.lastReviewedAt) {
    workflow.lastReviewedAt = item.lastReviewedAt;
  }
  if (Object.keys(workflow).length === 0) return null;
  return workflow;
}

/** Validates unknown input into a clean id -> workflow map. */
export function sanitizeWorkflowMap(value: unknown): LeadWorkflowMap {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return {};
  const result: LeadWorkflowMap = {};
  for (const [id, entry] of Object.entries(value as Record<string, unknown>)) {
    if (!id) continue;
    const workflow = sanitizeWorkflow(entry);
    if (workflow) result[id] = workflow;
  }
  return result;
}

/** Effective status: explicit value, or "unreviewed" when never assigned. */
export function effectiveStatus(workflow: LeadWorkflow | undefined): LeadStatus {
  return workflow?.status ?? "unreviewed";
}

/**
 * Pure map transitions used by the workflow hook. Callers merge onto a
 * freshly read map so concurrent tabs edit per-record state without
 * clobbering each other's unrelated entries. Empty results mean "no change".
 */
export function applyWorkflowPatch(
  map: LeadWorkflowMap,
  recordId: string,
  patch: LeadWorkflow,
): LeadWorkflowMap | null {
  if (!recordId || Object.keys(patch).length === 0) return null;
  const merged: LeadWorkflow = { ...(map[recordId] ?? {}), ...patch };
  if (Object.keys(merged).length === 0) return null;
  return { ...map, [recordId]: merged };
}

export function removeWorkflowField(
  map: LeadWorkflowMap,
  recordId: string,
  key: keyof LeadWorkflow,
): LeadWorkflowMap | null {
  const previous = map[recordId];
  if (!previous || !(key in previous)) return null;
  const rest: LeadWorkflow = { ...previous };
  delete rest[key];
  if (Object.keys(rest).length === 0) {
    const remaining: LeadWorkflowMap = { ...map };
    delete remaining[recordId];
    return remaining;
  }
  return { ...map, [recordId]: rest };
}

/**
 * True when a follow-up date is set and lies strictly before the given
 * day (YYYY-MM-DD). A missing date is never overdue.
 */
export function isOverdue(followUpDate: string | undefined, todayYmd: string): boolean {
  if (!followUpDate || !isValidDateString(followUpDate)) return false;
  if (!isValidDateString(todayYmd)) return false;
  return followUpDate < todayYmd;
}

/** Today's date as YYYY-MM-DD in local time (formatting only, no timers). */
export function todayLocalYmd(now: Date = new Date()): string {
  const pad = (value: number): string => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export type QualificationResult = "match" | "unknown";

export interface QualificationRow {
  criterion: string;
  result: QualificationResult;
  detail: string;
}

export interface ObservedSignals {
  website: boolean;
  phone: boolean;
  email: boolean;
  openingHours: boolean;
  coordinates: boolean;
  categoryKnown: boolean;
}

export function signalsFromCompany(company: Company): ObservedSignals {
  return {
    website: company.website !== null,
    phone: company.phone !== null,
    email: company.email !== null,
    openingHours: company.openingHours !== null,
    coordinates: company.lat !== null && company.lon !== null,
    categoryKnown: company.category.trim().length > 0,
  };
}

export function signalsFromDemoLead(lead: DemoLead): ObservedSignals {
  return {
    website: lead.websiteAvailable,
    phone: lead.phoneAvailable,
    email: false,
    openingHours: false,
    coordinates: false,
    categoryKnown: lead.category.trim().length > 0,
  };
}

/**
 * Transparent checklist over observed signals. Present data is a "match";
 * absent data is "unknown" with an explicit note that it only means
 * unmapped/unlisted — never evidence against the company.
 */
export function buildQualificationChecklist(signals: ObservedSignals): QualificationRow[] {
  const row = (
    criterion: string,
    present: boolean,
    presentDetail: string,
    missingDetail: string,
  ): QualificationRow =>
    present
      ? { criterion, result: "match", detail: presentDetail }
      : { criterion, result: "unknown", detail: missingDetail };
  return [
    row("Website listed", signals.website, "Website available in the record.", "No website in the record — may simply be unlisted."),
    row("Phone listed", signals.phone, "Phone available in the record.", "No phone in the record — may simply be unlisted."),
    row("Email listed", signals.email, "Email available in the record.", "No email in the record — may simply be unlisted."),
    row(
      "Opening hours listed",
      signals.openingHours,
      "Opening hours available in the record.",
      "No opening hours in the record — may simply be unlisted.",
    ),
    row(
      "Coordinates available",
      signals.coordinates,
      "Map coordinates available in the record.",
      "No coordinates in the record.",
    ),
    row(
      "Category known",
      signals.categoryKnown,
      "Business category recorded.",
      "No category recorded.",
    ),
  ];
}
