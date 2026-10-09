"use client";

import Link from "next/link";
import { useState } from "react";
import { ListPlus } from "lucide-react";
import { useLeadLists } from "@/hooks/use-lead-lists";

/**
 * Compact "add saved lead to list" control used on table rows.
 * Native select + button: keyboard-accessible and mobile-friendly.
 */
export function AddToListControl({ leadId, leadName }: { leadId: string; leadName: string }) {
  const { lists, addToList, listsContaining } = useLeadLists();
  const [selected, setSelected] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  const memberOf = listsContaining(leadId);
  const candidates = lists.filter((list) => !list.leadIds.includes(leadId));

  if (lists.length === 0) {
    return (
      <Link
        href="/lists"
        className="inline-flex items-center gap-1 text-xs font-medium text-accent-ink hover:text-accent-hover"
      >
        <ListPlus className="h-3.5 w-3.5" aria-hidden="true" />
        Create a list to organize
      </Link>
    );
  }

  function handleAdd() {
    if (!selected) {
      setFeedback("Choose a list first.");
      return;
    }
    const result = addToList(selected, leadId);
    if (!result.ok) {
      setFeedback(result.error ?? "Could not add to list.");
      return;
    }
    const list = lists.find((item) => item.id === selected);
    setFeedback(`Added to “${list?.name ?? "list"}”.`);
    setSelected("");
  }

  const controlId = `add-to-list-${leadId.replace(/[^a-zA-Z0-9]/g, "-")}`;

  return (
    <div className="flex flex-col items-end gap-1">
      {memberOf.length > 0 ? (
        <p className="text-[11px] text-ink3">
          In {memberOf.length} list{memberOf.length === 1 ? "" : "s"}:{" "}
          {memberOf.map((list) => list.name).join(", ")}
        </p>
      ) : null}
      <div className="flex items-center gap-1.5">
        <label htmlFor={controlId} className="sr-only">
          Add {leadName} to a list
        </label>
        <select
          id={controlId}
          value={selected}
          onChange={(event) => {
            setSelected(event.target.value);
            setFeedback(null);
          }}
          className="neu-recessed h-8 max-w-36 cursor-pointer rounded-lg border border-line-soft bg-recessed px-2 text-xs text-ink"
        >
          <option value="">Add to list…</option>
          {candidates.map((list) => (
            <option key={list.id} value={list.id}>
              {list.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleAdd}
          disabled={!selected}
          aria-label={`Add ${leadName} to selected list`}
          className="neu-raised-sm neu-pressable inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-line-soft bg-raised text-ink2 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ListPlus className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      {feedback ? (
        <p role="status" className="text-[11px] text-ink3">
          {feedback}
        </p>
      ) : null}
    </div>
  );
}
