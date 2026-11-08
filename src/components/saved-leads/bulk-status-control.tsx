"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { LEAD_STATUS_LABELS, LEAD_STATUSES } from "@/lib/lead-pipeline";
import type { LeadStatus } from "@/lib/lead-pipeline";

const STATUS_OPTIONS = LEAD_STATUSES.map((status) => ({ value: status, label: LEAD_STATUS_LABELS[status] }));

/**
 * Sets one status on every lead currently shown, after a confirmation,
 * since it replaces each lead's own status.
 *
 * @param count How many leads are shown (and would change).
 * @param onApply Receives the chosen status once confirmed.
 */
export function BulkStatusControl({ count, onApply }: { count: number; onApply: (status: LeadStatus) => void }) {
  const [pending, setPending] = useState<LeadStatus | null>(null);

  if (pending) {
    return (
      <div role="status" className="flex flex-wrap items-center gap-2 text-xs text-ink2">
        <span>
          Set all {count} shown lead{count === 1 ? "" : "s"} to “{LEAD_STATUS_LABELS[pending]}”?
        </span>
        <Button
          type="button"
          size="sm"
          onClick={() => {
            onApply(pending);
            setPending(null);
          }}
        >
          Yes, set {count}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setPending(null)}>
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full">
      <Select
        id="bulk-status"
        value=""
        options={STATUS_OPTIONS}
        onChange={(next) => setPending(next as LeadStatus)}
        searchable={false}
        size="sm"
        placeholder={`Set status for all ${count} shown…`}
      />
    </div>
  );
}
