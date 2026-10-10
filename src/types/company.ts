/**
 * Normalized company record for real (non-demo) search results.
 *
 * Missing information is represented as `null` — never invented. The UI must
 * render `null` fields as unavailable rather than substituting placeholders.
 */
export type DataProvenance = "osm" | "demo";

export interface Company {
  /** Stable provider-specific id, e.g. "osm:node/123456". */
  id: string;
  provenance: DataProvenance;
  /** Business name exactly as provided by the source. */
  name: string;
  /** Human-readable category label derived from source tags. */
  category: string;
  city: string | null;
  country: string | null;
  /** Formatted "City, Country" with graceful fallbacks. */
  locationLabel: string;
  lat: number | null;
  lon: number | null;
  /** Present only when the source actually provides them. */
  website: string | null;
  phone: string | null;
  email: string | null;
  openingHours: string | null;
  /** Human-readable source name, e.g. "OpenStreetMap". */
  source: string;
  /** Deep link to the source record, when the source offers one. */
  sourceUrl: string | null;
  /** Raw source tags, retained for scoring/debugging. Real source data only. */
  tags: Record<string, string>;
}

/**
 * A single saved lead: a snapshot of a real company record, so saved leads
 * survive refreshes without re-querying the provider.
 */
export interface SavedLeadRecord {
  id: string;
  savedAt: string;
  company: Company;
}

export function companyRecord(company: Company, savedAt: string): SavedLeadRecord {
  return { id: company.id, savedAt, company };
}
