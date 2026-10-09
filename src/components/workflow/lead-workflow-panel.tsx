"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TextArea } from "@/components/ui/field";
import { useLeadWorkflow } from "@/hooks/use-lead-workflow";
import {
  LEAD_STATUS_LABELS,
  LEAD_STATUSES,
  NEXT_ACTION_LABELS,
  NEXT_ACTIONS,
} from "@/types/workflow";
import type { LeadStatus, NextAction } from "@/types/workflow";
import {
  buildQualificationChecklist,
  effectiveStatus,
  isOverdue,
  isValidDateString,
  todayLocalYmd,
} from "@/lib/workflow";
import type { ObservedSignals } from "@/lib/workflow";
import { cn } from "@/lib/storage";

const STATUS_TONES = {
  unreviewed: "neutral",
  researching: "info",
  qualified: "success",
  "not-a-fit": "neutral",
  "ready-for-outreach": "info",
} as const;

export function StatusBadge({ status }: { status: LeadStatus }) {
  return <Badge tone={STATUS_TONES[status]}>{LEAD_STATUS_LABELS[status]}</Badge>;
}

/**
 * Compact per-lead workflow editor: user-assigned status, research notes,
 * next action, follow-up date, and a transparent qualification checklist.
 * Everything here is explicit user input; nothing is inferred.
 */
export function LeadWorkflowPanel({
  recordId,
  leadName,
  signals,
}: {
  recordId: string;
  leadName: string;
  signals: ObservedSignals;
}) {
  const { getWorkflow, setStatus, saveNotes, setNextAction, setFollowUpDate } =
    useLeadWorkflow();
  const workflow = getWorkflow(recordId);
  const status = effectiveStatus(workflow);
  const [draft, setDraft] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);

  const checklist = buildQualificationChecklist(signals);
  const matched = checklist.filter((row) => row.result === "match").length;
  const overdue =
    workflow?.followUpDate !== undefined && isOverdue(workflow.followUpDate, todayLocalYmd());
  const notesValue = draft ?? workflow?.notes ?? "";

  function handleStatusChange(value: string) {
    if ((LEAD_STATUSES as readonly string[]).includes(value)) {
      setStatus(recordId, value as LeadStatus);
      setFeedback(`Status set to ${LEAD_STATUS_LABELS[value as LeadStatus]}.`);
    }
  }

  function handleSaveNotes() {
    saveNotes(recordId, notesValue);
    setDraft(null);
    setFeedback(
      notesValue.trim()
        ? "Notes saved locally."
        : "Notes cleared.",
    );
  }

  function handleDateChange(value: string) {
    setDateError(null);
    if (value && !isValidDateString(value)) {
      setDateError("Enter a valid calendar date (YYYY-MM-DD).");
      return;
    }
    setFollowUpDate(recordId, value);
  }

  const selectId = `wf-status-${recordId.replace(/[^a-zA-Z0-9]/g, "-")}`;
  const notesId = `wf-notes-${recordId.replace(/[^a-zA-Z0-9]/g, "-")}`;
  const actionId = `wf-action-${recordId.replace(/[^a-zA-Z0-9]/g, "-")}`;
  const dateId = `wf-date-${recordId.replace(/[^a-zA-Z0-9]/g, "-")}`;

  return (
    <div className="flex w-full flex-col items-stretch gap-2 text-left">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <StatusBadge status={status} />
        {overdue ? <Badge tone="warning">Follow-up due</Badge> : null}
        <label htmlFor={selectId} className="sr-only">
          Set status for {leadName}
        </label>
        <select
          id={selectId}
          value={status}
          onChange={(event) => handleStatusChange(event.target.value)}
          className={cn(
            "neu-recessed h-8 max-w-36 cursor-pointer rounded-lg border border-line-soft",
            "bg-recessed px-2 text-xs text-ink",
          )}
        >
          {LEAD_STATUSES.map((option) => (
            <option key={option} value={option}>
              {LEAD_STATUS_LABELS[option]}
            </option>
          ))}
        </select>
      </div>

      <details className="w-full">
        <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-md px-1 py-0.5 text-xs font-medium text-ink2 hover:text-ink [&::-webkit-details-marker]:hidden">
          Research & checklist ({matched} of {checklist.length} present)
        </summary>
        <div className="mt-2 space-y-3 rounded-lg border border-line-soft bg-recessed p-3">
          <ul className="space-y-1.5">
            {checklist.map((row) => (
              <li key={row.criterion} className="flex items-start justify-between gap-2 text-xs">
                <span className="text-ink2" title={row.detail}>
                  {row.criterion}
                </span>
                <Badge tone={row.result === "match" ? "success" : "neutral"}>
                  {row.result === "match" ? "Present" : "Unknown"}
                </Badge>
              </li>
            ))}
          </ul>
          <p className="text-[11px] leading-relaxed text-ink3">
            “Unknown” means the record does not contain it — not that the business lacks it.
          </p>

          <div>
            <label htmlFor={notesId} className="mb-1 block text-xs font-medium text-ink2">
              Research notes (stored only in this browser)
            </label>
            <TextArea
              id={notesId}
              value={notesValue}
              onChange={(event) => {
                setDraft(event.target.value);
                setFeedback(null);
              }}
              placeholder="e.g. Spoke to no one yet — site looks outdated, check pricing page."
              rows={3}
              maxLength={2000}
            />
            <div className="mt-1.5 flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleSaveNotes}
                disabled={notesValue === (workflow?.notes ?? "")}
              >
                Save notes
              </Button>
              {workflow?.lastReviewedAt ? (
                <span className="text-[11px] text-ink3">
                  Reviewed {workflow.lastReviewedAt.slice(0, 10)}
                </span>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor={actionId} className="mb-1 block text-xs font-medium text-ink2">
                Next action
              </label>
              <select
                id={actionId}
                value={workflow?.nextAction ?? "none"}
                onChange={(event) =>
                  setNextAction(recordId, event.target.value as NextAction)
                }
                className="neu-recessed h-9 w-full cursor-pointer rounded-lg border border-line-soft bg-recessed px-2 text-[13px] text-ink"
              >
                {NEXT_ACTIONS.map((option) => (
                  <option key={option} value={option}>
                    {NEXT_ACTION_LABELS[option]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor={dateId} className="mb-1 block text-xs font-medium text-ink2">
                Follow-up date (optional)
              </label>
              <input
                id={dateId}
                type="date"
                value={workflow?.followUpDate ?? ""}
                onChange={(event) => handleDateChange(event.target.value)}
                className="neu-recessed h-9 w-full cursor-pointer rounded-lg border border-line-soft bg-recessed px-2 text-[13px] text-ink"
              />
              {dateError ? (
                <p role="alert" className="mt-1 text-xs text-status-error-fg">
                  {dateError}
                </p>
              ) : null}
            </div>
          </div>
          {workflow?.nextAction && workflow.nextAction !== "none" ? (
            <p className="text-xs text-ink2">
              Next: {NEXT_ACTION_LABELS[workflow.nextAction]}
              {workflow.followUpDate ? ` · by ${workflow.followUpDate}` : ""}
            </p>
          ) : null}
        </div>
      </details>

      {feedback ? (
        <p role="status" className="text-right text-[11px] text-ink3">
          {feedback}
        </p>
      ) : null}
    </div>
  );
}
