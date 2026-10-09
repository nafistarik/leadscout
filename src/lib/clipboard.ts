import type { Company } from "@/types/company";
import { LEAD_STATUS_LABELS, NEXT_ACTION_LABELS } from "@/types/workflow";
import type { LeadWorkflow } from "@/types/workflow";

/**
 * Clipboard helpers for the lead-research workflow. All copying happens
 * from explicit user-triggered buttons; results report real outcomes so
 * the UI never claims a copy succeeded when it failed.
 */

export interface CopyResult {
  ok: boolean;
  error?: string;
}

const NOT_AVAILABLE = "Not available";

/**
 * Multi-line research summary. Missing fields stay explicitly missing.
 * An optional user workflow appends a clearly separated "Your research"
 * section — source data and user notes are never mixed.
 */
export function buildCompanySummary(company: Company, workflow?: LeadWorkflow): string {
  const lines = [
    `${company.name} — ${company.category}`,
    company.locationLabel,
    `Website: ${company.website ?? NOT_AVAILABLE}`,
    `Phone: ${company.phone ?? NOT_AVAILABLE}`,
    `Email: ${company.email ?? NOT_AVAILABLE}`,
    `Opening hours: ${company.openingHours ?? NOT_AVAILABLE}`,
    `Source: ${company.source}${company.sourceUrl ? ` (${company.sourceUrl})` : ""}`,
  ];
  const research: string[] = [];
  if (workflow?.status) research.push(`Status: ${LEAD_STATUS_LABELS[workflow.status]}`);
  if (workflow?.nextAction && workflow.nextAction !== "none") {
    research.push(`Next action: ${NEXT_ACTION_LABELS[workflow.nextAction]}`);
  }
  if (workflow?.followUpDate) research.push(`Follow up: ${workflow.followUpDate}`);
  if (workflow?.notes) research.push(`Notes: ${workflow.notes}`);
  if (research.length > 0) {
    lines.push("", "Your research (local notes, not source data):", ...research);
  }
  return lines.join("\n");
}

/**
 * Contact-only text for pasting into outreach notes. Returns null when the
 * source provides no contact fields, so callers can disable the action
 * instead of copying an empty or misleading note.
 */
export function buildContactText(company: Company): string | null {
  const lines: string[] = [];
  if (company.website) lines.push(`Website: ${company.website}`);
  if (company.phone) lines.push(`Phone: ${company.phone}`);
  if (company.email) lines.push(`Email: ${company.email}`);
  return lines.length > 0 ? lines.join("\n") : null;
}

function clipboardWriter(): ((text: string) => Promise<void>) | null {
  try {
    const nav = (globalThis as { navigator?: unknown }).navigator as
      | { clipboard?: { writeText?: (text: string) => Promise<void> } }
      | undefined;
    if (nav?.clipboard && typeof nav.clipboard.writeText === "function") {
      return (text: string) => nav.clipboard?.writeText?.(text) as Promise<void>;
    }
  } catch {
    return null;
  }
  return null;
}

function legacyCopy(text: string): boolean {
  try {
    const doc = (globalThis as { document?: unknown }).document as
      | {
          createElement?: (tag: string) => {
            value: string;
            style: Record<string, string>;
            select?: () => void;
            setSelectionRange?: (start: number, end: number) => void;
          };
          body?: { appendChild?: (el: unknown) => void; removeChild?: (el: unknown) => void };
          execCommand?: (command: string) => boolean;
        }
      | undefined;
    if (!doc?.createElement || !doc.body?.appendChild || typeof doc.execCommand !== "function") {
      return false;
    }
    const area = doc.createElement("textarea");
    area.value = text;
    area.style.position = "fixed";
    area.style.opacity = "0";
    doc.body.appendChild(area);
    area.select?.();
    area.setSelectionRange?.(0, text.length);
    const succeeded = doc.execCommand("copy");
    doc.body.removeChild?.(area);
    return succeeded;
  } catch {
    return false;
  }
}

/** Copies text, preferring the async Clipboard API with a legacy fallback. */
export async function copyText(text: string): Promise<CopyResult> {
  const write = clipboardWriter();
  if (write) {
    try {
      await write(text);
      return { ok: true };
    } catch {
      // Fall through to the legacy path before reporting failure.
    }
  }
  if (legacyCopy(text)) return { ok: true };
  return {
    ok: false,
    error: "Copy failed — your browser blocked clipboard access. Select and copy the text manually.",
  };
}
