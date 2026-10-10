"use client";

import { Loader2, ScanSearch, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { WebsiteChecks } from "@/hooks/use-website-analysis";
import { cn } from "@/lib/storage";

export type PitchFocus = "all" | "hot" | "no-website" | "social" | "site-issues" | "unchecked";

const FOCUS_OPTIONS: Array<{ value: PitchFocus; label: string; title: string }> = [
  { value: "all", label: "All", title: "Every fetched result" },
  { value: "hot", label: "Hot leads", title: "High pitch opportunity: no website, social page only, or a down/outdated site" },
  { value: "no-website", label: "No website", title: "No website listed in OpenStreetMap" },
  { value: "social", label: "Social only", title: "Only a Facebook/Instagram/WhatsApp-style page" },
  { value: "site-issues", label: "Site has issues", title: "Checked websites that are down, outdated, or need work" },
  { value: "unchecked", label: "Not checked", title: "Has a website that has not been checked yet" },
];

/**
 * Pitch-focused quick filters plus the bulk website check. Filters apply
 * locally to fetched results; checks run one at a time through the free
 * website reader and only when the user asks.
 */
export function PitchToolbar({
  focus,
  counts,
  onFocusChange,
  uncheckedSites,
  checks,
}: {
  focus: PitchFocus;
  counts: Record<PitchFocus, number>;
  onFocusChange: (focus: PitchFocus) => void;
  uncheckedSites: Array<string | null>;
  checks: WebsiteChecks;
}) {
  const busy = checks.pending > 0;
  const paused = checks.pausedUntil > 0;
  return (
    <div className="neu-recessed space-y-3 rounded-lg border border-line-soft bg-recessed p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label="Pitch focus" className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-xs font-medium text-ink2">Pitch focus:</span>
          {FOCUS_OPTIONS.map((option) => {
            const active = focus === option.value;
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={active}
                title={option.title}
                onClick={() => onFocusChange(option.value)}
                className={cn(
                  "inline-flex cursor-pointer items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium transition-colors",
                  active
                    ? "border-transparent bg-accent text-on-accent"
                    : "border-line-soft bg-raised text-ink2 hover:text-ink",
                )}
              >
                {option.label}
                <span className={cn("tabular-nums", active ? "opacity-90" : "text-ink3")}>{counts[option.value]}</span>
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          {busy ? (
            <>
              <span className="inline-flex items-center gap-1.5 text-xs text-ink2" role="status">
                <Loader2 className={cn("h-3.5 w-3.5", !paused && "animate-spin")} aria-hidden="true" />
                {paused ? "Paused for the rate limit…" : "Checking websites…"} {checks.pending} left
              </span>
              <Button type="button" variant="ghost" size="sm" onClick={checks.cancel}>
                <X className="h-3.5 w-3.5" aria-hidden="true" />
                Cancel
              </Button>
            </>
          ) : (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={uncheckedSites.length === 0}
              onClick={() => checks.checkMany(uncheckedSites)}
              title="Load each listed homepage and look for dated or broken signs (one at a time)"
            >
              <ScanSearch className="h-3.5 w-3.5" aria-hidden="true" />
              {uncheckedSites.length === 0 ? "All shown websites checked" : `Check ${uncheckedSites.length} website${uncheckedSites.length === 1 ? "" : "s"}`}
            </Button>
          )}
        </div>
      </div>
      {checks.notice ? <p className="text-xs text-status-warning-fg">{checks.notice}</p> : null}
      <p className="text-[11px] leading-relaxed text-ink3">
        Website checks load each homepage through the free Jina Reader (r.jina.ai), which receives the site address —
        about 20 checks per minute. Signals such as an old copyright year are hints, not proof; results are kept in this
        browser for 14 days.
      </p>
    </div>
  );
}
