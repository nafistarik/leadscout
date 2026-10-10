"use client";

import { History, X } from "lucide-react";
import { useSearchHistory } from "@/hooks/use-search-history";
import { describeHistoryEntry } from "@/lib/search-history";
import type { SearchHistoryEntry } from "@/lib/search-history";

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

/**
 * Recent searches at the bottom of the search experience. Selecting an entry
 * restores its criteria and runs the search again; results are never stored.
 */
export function RecentSearchesSection({
  onApply,
}: {
  onApply: (entry: SearchHistoryEntry) => void;
}) {
  const { history, removeEntry, clearHistory } = useSearchHistory();

  if (history.length === 0) return null;

  return (
    <section aria-labelledby="recent-searches-heading">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2
          id="recent-searches-heading"
          className="flex items-center gap-1.5 text-base font-semibold tracking-tight text-ink"
        >
          <History className="h-4 w-4 text-ink3" aria-hidden="true" />
          Recent searches
        </h2>
        <button
          type="button"
          onClick={clearHistory}
          className="cursor-pointer text-xs font-medium text-ink3 hover:text-status-error-fg"
        >
          Clear
        </button>
      </div>
      <ul className="space-y-1.5">
        {history.map((entry) => (
          <li
            key={entry.id}
            className="flex items-center justify-between gap-2 rounded-lg border border-line-soft bg-raised px-3 py-1.5"
          >
            <button
              type="button"
              onClick={() => onApply(entry)}
              title={`Run again: ${describeHistoryEntry(entry)}`}
              className="min-w-0 flex-1 cursor-pointer truncate text-left text-[13px] text-ink2 hover:text-ink"
            >
              <span className="font-medium">{describeHistoryEntry(entry)}</span>{" "}
              <span className="text-xs text-ink3">
                {entry.resultCount > 0 ? `${entry.resultCount} result${entry.resultCount === 1 ? "" : "s"} · ` : ""}
                {formatDate(entry.searchedAt)}
              </span>
            </button>
            <button
              type="button"
              onClick={() => removeEntry(entry.id)}
              aria-label={`Remove search ${describeHistoryEntry(entry)} from history`}
              className="shrink-0 cursor-pointer rounded p-1 text-ink3 hover:text-status-error-fg"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

