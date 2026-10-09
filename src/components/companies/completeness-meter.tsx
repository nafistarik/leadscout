import type { Company } from "@/types/company";
import { completenessExplanation, completenessSummary, describeCompleteness } from "@/lib/completeness";

/**
 * Compact completeness readout. The count describes mapped detail only —
 * the tooltip states explicitly that missing fields mean "unmapped",
 * never low quality.
 */
export function CompletenessMeter({ company }: { company: Company }) {
  const completeness = describeCompleteness(company);
  return (
    <p
      className="mt-1.5 text-[11px] text-ink3"
      title={completenessExplanation(completeness)}
    >
      {completenessSummary(completeness)} details present
    </p>
  );
}
