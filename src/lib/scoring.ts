import type { Company } from "@/types/company";

/**
 * Optional, explainable heuristic "fit score" for real company records.
 *
 * The score reflects ONLY directly observable OSM signals — how complete the
 * mapped business information is. It is not a prediction of revenue, intent,
 * or conversion likelihood, and missing fields are never treated as proof of
 * low quality (a business may simply be unmapped).
 *
 * Weights (max 100):
 * - Website listed: 30
 * - Phone listed: 20
 * - Category matches the searched category: 15
 * - Email listed: 15
 * - Opening hours listed: 10
 * - City known from source tags: 10
 */
export interface ScoreReason {
  label: string;
  points: number;
}

export interface LeadScore {
  score: number;
  maxScore: number;
  reasons: ScoreReason[];
}

export const SCORE_WEIGHTS = {
  website: 30,
  phone: 20,
  categoryMatch: 15,
  email: 15,
  openingHours: 10,
  cityFromTags: 10,
} as const;

export const MAX_SCORE = 100;

export type ScoreBand = "Strong info" | "Partial info" | "Basic listing";

export function scoreBand(score: number): ScoreBand {
  if (score >= 70) return "Strong info";
  if (score >= 40) return "Partial info";
  return "Basic listing";
}

export function scoreCompany(
  company: Company,
  options: { categoryMatch: boolean; cityFromTags: boolean },
): LeadScore {
  const reasons: ScoreReason[] = [];
  if (company.website) reasons.push({ label: "Website listed in OSM data", points: SCORE_WEIGHTS.website });
  if (company.phone) reasons.push({ label: "Phone listed in OSM data", points: SCORE_WEIGHTS.phone });
  if (options.categoryMatch) {
    reasons.push({ label: "Matches the searched category", points: SCORE_WEIGHTS.categoryMatch });
  }
  if (company.email) reasons.push({ label: "Email listed in OSM data", points: SCORE_WEIGHTS.email });
  if (company.openingHours) {
    reasons.push({ label: "Opening hours listed in OSM data", points: SCORE_WEIGHTS.openingHours });
  }
  if (options.cityFromTags) {
    reasons.push({ label: "Address detail present in OSM tags", points: SCORE_WEIGHTS.cityFromTags });
  }
  const score = Math.min(
    MAX_SCORE,
    reasons.reduce((total, reason) => total + reason.points, 0),
  );
  return { score, maxScore: MAX_SCORE, reasons };
}

/** True when the company carries a city in its own OSM tags (not a fallback). */
export function hasTagCity(company: Company): boolean {
  const tags = company.tags;
  return Boolean(
    tags["addr:city"]?.trim() ||
      tags["addr:town"]?.trim() ||
      tags["addr:village"]?.trim() ||
      tags["addr:suburb"]?.trim(),
  );
}
