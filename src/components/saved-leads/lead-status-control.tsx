"use client";

import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { LEAD_STATUS_LABELS, LEAD_STATUSES, LOST_REASON_LABELS, LOST_REASONS } from "@/lib/lead-pipeline";
import type { LeadPipelineEntry, LeadStatus, LostReason } from "@/lib/lead-pipeline";

const STATUS_OPTIONS = LEAD_STATUSES.map((status) => ({ value: status, label: LEAD_STATUS_LABELS[status] }));
const REASON_OPTIONS = LOST_REASONS.map((reason) => ({ value: reason, label: LOST_REASON_LABELS[reason] }));

/**
 * Pipeline status picker for one saved lead; a lost lead also gets an
 * optional reason picker.
 *
 * @param idPrefix Keeps ids unique: the table and the mobile cards render
 *   the same lead at once.
 * @param followUpDue Shows a "Follow-up due" badge when the date has arrived.
 * @param onChange Receives the new status and, for "lost", the reason.
 */
export function LeadStatusControl({
  idPrefix,
  companyName,
  entry,
  followUpDue,
  onChange,
}: {
  idPrefix: string;
  companyName: string;
  entry: LeadPipelineEntry | undefined;
  followUpDue: boolean;
  onChange: (status: LeadStatus, lostReason?: LostReason) => void;
}) {
  const status = entry?.status ?? "new";
  return (
    <div className="flex flex-col items-end gap-1.5" aria-label={`Pipeline status for ${companyName}`} role="group">
      {followUpDue ? (
        <Badge tone="warning" title={`Follow-up date: ${entry?.followUpDate ?? ""}`}>
          Follow-up due
        </Badge>
      ) : null}
      <Select
        id={`${idPrefix}-status`}
        value={status}
        options={STATUS_OPTIONS}
        onChange={(next) => onChange(next as LeadStatus)}
        searchable={false}
        size="sm"
      />
      {status === "lost" ? (
        <Select
          id={`${idPrefix}-lost-reason`}
          value={entry?.lostReason ?? ""}
          options={REASON_OPTIONS}
          onChange={(next) => onChange("lost", (next || undefined) as LostReason | undefined)}
          searchable={false}
          size="sm"
          placeholder="Reason (optional)"
          allowClear
          clearLabel="Clear lost reason"
        />
      ) : null}
    </div>
  );
}
