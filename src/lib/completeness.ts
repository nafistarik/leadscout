import type { Company } from "@/types/company";
import { hasTagCity } from "@/lib/scoring";

/**
 * Transparent data-completeness for live company records.
 *
 * Derived ONLY from fields actually present in the record. Completeness
 * describes mapped detail — never company quality, legitimacy, or sales
 * potential. Missing fields mean "not mapped", never "bad business".
 * Category is intentionally excluded: every live result carries a
 * query-derived label, so counting it would inflate every score equally.
 */
export type CompletenessKey =
  | "website"
  | "phone"
  | "email"
  | "openingHours"
  | "coordinates"
  | "address";

export interface CompletenessSignal {
  key: CompletenessKey;
  /** Short stable label used in UI meters and CSV exports. */
  label: string;
  present: boolean;
}

export interface Completeness {
  signals: CompletenessSignal[];
  present: number;
  total: number;
}

export function describeCompleteness(company: Company): Completeness {
  const signals: CompletenessSignal[] = [
    { key: "website", label: "website", present: company.website !== null },
    { key: "phone", label: "phone", present: company.phone !== null },
    { key: "email", label: "email", present: company.email !== null },
    { key: "openingHours", label: "opening hours", present: company.openingHours !== null },
    {
      key: "coordinates",
      label: "coordinates",
      present: company.lat !== null && company.lon !== null,
    },
    { key: "address", label: "address", present: hasTagCity(company) },
  ];
  return { signals, present: signals.filter((signal) => signal.present).length, total: signals.length };
}

/** Compact "3 of 6" rendering; use alongside the full breakdown. */
export function completenessSummary(completeness: Completeness): string {
  return `${completeness.present} of ${completeness.total}`;
}

/** Semicolon-joined names of present fields for CSV export. */
export function presentDetailsLabel(completeness: Completeness): string {
  return completeness.signals
    .filter((signal) => signal.present)
    .map((signal) => signal.label)
    .join("; ");
}

/** Tooltip-grade explanation that states what the count does NOT mean. */
export function completenessExplanation(completeness: Completeness): string {
  const missing = completeness.signals
    .filter((signal) => !signal.present)
    .map((signal) => signal.label)
    .join(", ");
  const base =
    `Website, phone, email, opening hours, coordinates, address detail — ` +
    `${completenessSummary(completeness)} present in OpenStreetMap data.`;
  if (!missing) return `${base} Nothing missing.`;
  return `${base} Missing here: ${missing}. Missing fields only mean unmapped, not low quality.`;
}
