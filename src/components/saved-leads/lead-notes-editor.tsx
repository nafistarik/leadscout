"use client";

import { useState } from "react";
import { TextArea, TextInput } from "@/components/ui/field";
import { MAX_NOTES_LENGTH } from "@/lib/lead-pipeline";
import type { LeadPipelineEntry } from "@/lib/lead-pipeline";

function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/**
 * Notes and follow-up date for one saved lead, shown in its details panel.
 * Notes save when the box loses focus; the date saves as soon as it is picked.
 *
 * @param idPrefix Keeps ids unique between the table and the mobile cards.
 * @param onChange Receives only the field that changed; "" clears it.
 */
export function LeadNotesEditor({
  idPrefix,
  entry,
  onChange,
}: {
  idPrefix: string;
  entry: LeadPipelineEntry | undefined;
  onChange: (patch: { notes?: string; followUpDate?: string }) => void;
}) {
  const saved = entry?.notes ?? "";
  const [draft, setDraft] = useState(saved);
  // Take a newly saved note (this box's own blur, or another tab) without
  // remounting, so focus can move straight on to the date picker.
  const [seen, setSeen] = useState(saved);
  if (seen !== saved) {
    setSeen(saved);
    setDraft(saved);
  }
  const notesId = `${idPrefix}-notes`;
  const dateId = `${idPrefix}-follow-up`;

  return (
    <section className="mb-4 grid gap-3 border-b border-line-soft pb-4 lg:grid-cols-[1fr_12rem]">
      <div>
        <label htmlFor={notesId} className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink3">
          Your notes
        </label>
        <TextArea
          id={notesId}
          value={draft}
          maxLength={MAX_NOTES_LENGTH}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => {
            if (draft.trim() !== saved) onChange({ notes: draft });
          }}
          placeholder="What did they say? Budget, best time to call, who decides…"
          rows={3}
        />
        <p className="mt-1 text-[11px] text-ink3">Saved in this browser when you click outside the box.</p>
      </div>
      <div>
        <label htmlFor={dateId} className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink3">
          Follow up on
        </label>
        <TextInput
          id={dateId}
          type="date"
          value={entry?.followUpDate ?? ""}
          onChange={(event) => onChange({ followUpDate: event.target.value })}
        />
        {entry?.contactCount ? (
          <p className="mt-2 text-[11px] leading-relaxed text-ink2">
            Contacted {entry.contactCount} time{entry.contactCount === 1 ? "" : "s"}
            {entry.lastContactedAt ? `, last on ${formatDay(entry.lastContactedAt)}` : ""}.
          </p>
        ) : null}
      </div>
    </section>
  );
}
