import { Badge } from "@/components/ui/badge";
import { scoreBand } from "@/lib/scoring";
import type { LeadScore } from "@/lib/scoring";

/**
 * Compact heuristic score display. The breakdown is expandable so the model
 * stays transparent without cluttering the table.
 */
export function ScoreBadge({ score }: { score: LeadScore }) {
  const band = scoreBand(score.score);
  return (
    <details className="group inline-block">
      <summary
        className="neu-recessed inline-flex cursor-pointer list-none items-center gap-1.5 rounded-md border border-line-soft bg-recessed px-2 py-0.5 text-[11px] font-semibold text-accent-ink [&::-webkit-details-marker]:hidden"
        title="Heuristic fit score based only on available OSM detail — not a prediction"
      >
        <span aria-hidden="true">◉</span>
        {score.score}/{score.maxScore} · {band}
      </summary>
      <div className="neu-raised mt-2 w-60 rounded-lg border border-line-soft bg-raised p-3 text-left">
        <p className="text-xs font-semibold text-ink">
          Heuristic fit score — not a prediction
        </p>
        <ul className="mt-2 space-y-1">
          {score.reasons.length === 0 ? (
            <li className="text-xs text-ink2">
              No scored signals present. Missing fields only mean the business is sparsely mapped.
            </li>
          ) : (
            score.reasons.map((reason) => (
              <li key={reason.label} className="flex justify-between gap-2 text-xs text-ink2">
                <span>{reason.label}</span>
                <span className="font-semibold text-ink">+{reason.points}</span>
              </li>
            ))
          )}
        </ul>
        <p className="mt-2 text-[11px] leading-relaxed text-ink3">
          Based solely on observable OpenStreetMap detail. It says nothing about revenue, intent,
          or likelihood to buy.
        </p>
      </div>
    </details>
  );
}

export function ScoreLegend() {
  return <Badge tone="info">Heuristic scores · info only</Badge>;
}
