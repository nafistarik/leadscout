import type { Company } from "@/types/company";
import type { LeadSearchFilters } from "@/lib/filter-leads";

/** Reused directly: the provider layer accepts the same filter shape as the UI. */
export type ProviderSearchRequest = LeadSearchFilters;

export interface ProviderSearchMeta {
  /** Which provider produced these results ("overpass" / "demo"). */
  providerId: string;
  /** Human-readable area that was actually searched, e.g. "Berlin, Germany". */
  areaLabel: string;
  /** True when the provider capped the result set (results are not exhaustive). */
  truncated: boolean;
  /** How many raw elements were considered before slicing to the limit. */
  examined: number;
  /** Approximate searched area in km² (null when not computable). */
  areaKm2: number | null;
}

export interface ProviderSearchResult {
  companies: Company[];
  meta: ProviderSearchMeta;
}

export type ProviderErrorKind =
  | "needs-location"
  | "location-not-found"
  | "area-too-large"
  | "timeout"
  | "rate-limit"
  | "network"
  | "bad-response";

export class ProviderError extends Error {
  readonly kind: ProviderErrorKind;
  readonly retryable: boolean;

  constructor(kind: ProviderErrorKind, message: string, retryable = true) {
    super(message);
    this.name = "ProviderError";
    this.kind = kind;
    this.retryable = retryable;
  }
}

/**
 * Small provider interface: another data source can be added by implementing
 * `search` and returning normalized results — no UI rewrite required.
 */
export interface CompanyProvider {
  readonly id: string;
  readonly label: string;
  search(request: ProviderSearchRequest, options: { signal: AbortSignal }): Promise<ProviderSearchResult>;
}
