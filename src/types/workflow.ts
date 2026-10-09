/**
 * User-assigned lead workflow metadata. Everything here is entered by the
 * user (or stamped by an explicit user action such as changing a status) —
 * never inferred from company data and never fabricated. Stored separately
 * from company snapshots, keyed by stable record id, so saving/unsaving a
 * lead never corrupts workflow data and vice versa.
 */

/** Explicit, user-assigned pipeline status. Absence means "Unreviewed". */
export type LeadStatus =
  | "unreviewed"
  | "researching"
  | "qualified"
  | "not-a-fit"
  | "ready-for-outreach";

export const LEAD_STATUSES: readonly LeadStatus[] = [
  "unreviewed",
  "researching",
  "qualified",
  "not-a-fit",
  "ready-for-outreach",
];

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  unreviewed: "Unreviewed",
  researching: "Researching",
  qualified: "Qualified",
  "not-a-fit": "Not a fit",
  "ready-for-outreach": "Ready for outreach",
};

/** User-selected next step. "none" means no action planned. */
export type NextAction =
  | "none"
  | "research-online"
  | "check-website"
  | "call"
  | "email"
  | "revisit-later";

export const NEXT_ACTIONS: readonly NextAction[] = [
  "none",
  "research-online",
  "check-website",
  "call",
  "email",
  "revisit-later",
];

export const NEXT_ACTION_LABELS: Record<NextAction, string> = {
  none: "No action planned",
  "research-online": "Research online",
  "check-website": "Check website",
  call: "Call",
  email: "Email",
  "revisit-later": "Revisit later",
};

export interface LeadWorkflow {
  /** Explicit status; omitted/unknown reads as "unreviewed". */
  status?: LeadStatus;
  /** Free-form user research notes. */
  notes?: string;
  /** User-selected next step. */
  nextAction?: NextAction;
  /** Optional follow-up date as YYYY-MM-DD. */
  followUpDate?: string;
  /** ISO timestamp of the last explicit status/note edit. */
  lastReviewedAt?: string;
}

/** Stored map: stable saved-lead record id -> workflow metadata. */
export type LeadWorkflowMap = Record<string, LeadWorkflow>;

export function isLeadStatus(value: unknown): value is LeadStatus {
  return (
    typeof value === "string" &&
    (LEAD_STATUSES as readonly string[]).includes(value)
  );
}

export function isNextAction(value: unknown): value is NextAction {
  return (
    typeof value === "string" &&
    (NEXT_ACTIONS as readonly string[]).includes(value)
  );
}
