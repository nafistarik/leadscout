import { searchCacheKey, InflightDeduper, TtlCache } from "@/lib/providers/cache";
import { bboxAreaKm2, formatAreaKm2, MAX_SEARCH_AREA_KM2 } from "@/lib/providers/geo";
import { resolveSearchArea } from "@/lib/providers/nominatim";
import { fetchNominatimPois } from "@/lib/providers/nominatim-pois";
import { dedupeCompanies, fetchOverpass, sanitizeKeyword } from "@/lib/providers/overpass";
import type { OverpassFetchResult, OverpassSearchParams } from "@/lib/providers/overpass";
import { tagsForCategory } from "@/lib/providers/osm-tags";
import type {
  CompanyProvider,
  ProviderSearchRequest,
  ProviderSearchResult,
} from "@/lib/providers/types";
import { ProviderError } from "@/lib/providers/types";

/**
 * Orchestrates live company discovery: geocode the area, query Overpass,
 * normalize + deduplicate, slice to the requested limit.
 *
 * Reliability behavior:
 * - Results are cached in memory for 10 minutes, keyed by normalized search
 *   parameters — identical searches reuse results without network traffic.
 * - Simultaneous identical searches share one in-flight promise instead of
 *   sending duplicate requests.
 * - Caching reduces load on public APIs but never guarantees availability.
 */
const RESULT_TTL_MS = 10 * 60 * 1000;
/** Bounds in-memory result growth across long sessions of distinct searches. */
const RESULT_CACHE_LIMIT = 50;
/**
 * Overall deadline for one search (geocode + Overpass + Nominatim fallback).
 * Individual legs already time out, so this only cuts off pathological
 * back-to-back stalls instead of leaving the UI spinning. Firing it reports
 * `timeout`, never a silent hang; the caller can retry manually.
 */
const OVERALL_TIMEOUT_MS = 60_000;
/**
 * Budget for all Overpass attempts combined. Most failures are fast (blocked
 * or 500 in well under a second); this caps slow/hanging instances so the
 * Nominatim fallback still has time inside the overall deadline.
 */
const OVERPASS_PHASE_MS = 25_000;

const resultCache = new TtlCache<ProviderSearchResult>(RESULT_TTL_MS, RESULT_CACHE_LIMIT);
const inflight = new InflightDeduper<ProviderSearchResult>();

function requestKey(request: ProviderSearchRequest): string {
  return searchCacheKey({
    country: request.country,
    city: request.city,
    category: request.category,
    keyword: request.keyword,
    maxResults: request.maxResults,
  });
}

/**
 * Cache key for a search request. Only provider-side criteria participate —
 * client-side refinements (availability, score, sort) must never bust the
 * cache or trigger new requests. Exported for tests.
 */
export function providerRequestKey(request: ProviderSearchRequest): string {
  return requestKey(request);
}

function resultLimit(maxResults: number): number {
  return Number.isFinite(maxResults) && maxResults > 0 ? Math.min(Math.floor(maxResults), 50) : 10;
}

async function runSearch(
  request: ProviderSearchRequest,
  options: { signal: AbortSignal },
): Promise<ProviderSearchResult> {
  const limit = resultLimit(request.maxResults);
  // Link the caller's signal to a local controller so the overall deadline
  // aborts in-flight provider requests instead of leaving them dangling.
  const controller = new AbortController();
  const onAbort = (): void => controller.abort();
  if (options.signal.aborted) controller.abort();
  else options.signal.addEventListener("abort", onAbort, { once: true });
  let overallTimedOut = false;
  const timer = setTimeout(() => {
    overallTimedOut = true;
    controller.abort();
  }, OVERALL_TIMEOUT_MS);
  try {
    return await runSearchInner(request, limit, { signal: controller.signal });
  } catch (error) {
    if (overallTimedOut) {
      throw new ProviderError(
        "timeout",
        "The overall search took too long and was stopped. Try a smaller area or fewer categories.",
      );
    }
    throw error;
  } finally {
    clearTimeout(timer);
    options.signal.removeEventListener("abort", onAbort);
  }
}

async function runSearchInner(
  request: ProviderSearchRequest,
  limit: number,
  options: { signal: AbortSignal },
): Promise<ProviderSearchResult> {
  const area = await resolveSearchArea(request.city, request.country, { signal: options.signal });

  // Refuse oversized areas before touching Overpass: a capped slice of a
  // huge region would mislead, and the scan risks timing out the shared API.
  const areaKm2 = bboxAreaKm2(area);
  if (areaKm2 !== null && areaKm2 > MAX_SEARCH_AREA_KM2) {
    const areaText = formatAreaKm2(areaKm2) ?? `${Math.round(areaKm2)} km²`;
    const limitText = formatAreaKm2(MAX_SEARCH_AREA_KM2) ?? `${MAX_SEARCH_AREA_KM2} km²`;
    throw new ProviderError(
      "area-too-large",
      `“${area.label}” spans roughly ${areaText}, above the ${limitText} live-search limit. Enter a city or district to narrow the area — broad regions return capped, misleading slices.`,
      false,
    );
  }

  const tags = tagsForCategory(request.category);
  const serverLimit = Math.min(limit * 2, 100);
  const params: OverpassSearchParams = { tags, keyword: request.keyword, area, serverLimit };

  let providerId = "overpass";
  let coverageNote: string | null = null;
  let fetched: OverpassFetchResult;
  try {
    fetched = await fetchOverpassWithinBudget(params, options.signal);
  } catch (overpassError) {
    if (options.signal.aborted) throw overpassError;
    // Every Overpass instance failed: fall back to Nominatim's category
    // search, which is far more available but narrower in coverage.
    try {
      const fallback = await fetchNominatimPois(params, { signal: options.signal });
      fetched = fallback;
      providerId = "nominatim";
      coverageNote =
        "The OpenStreetMap business-data servers (Overpass) were unavailable, so these results come from the Nominatim backup search: at most 40 places per category" +
        (fallback.skippedGenericTags ? ", and general shops, offices and trades are not included" : "") +
        (sanitizeKeyword(request.keyword) ? ", with the keyword matched only within those places" : "") +
        ". Retry later for fuller results.";
    } catch (fallbackError) {
      if (options.signal.aborted) throw fallbackError;
      throw combinedFailure(overpassError, fallbackError);
    }
  }

  const { companies, truncated } = fetched;
  const unique = dedupeCompanies(companies);
  return {
    companies: unique.slice(0, limit),
    meta: {
      providerId,
      areaLabel: area.label,
      truncated: truncated || unique.length > limit,
      examined: companies.length,
      areaKm2,
      coverageNote,
    },
  };
}

/** Runs fetchOverpass under its own phase deadline linked to the caller. */
async function fetchOverpassWithinBudget(
  params: OverpassSearchParams,
  signal: AbortSignal,
): Promise<OverpassFetchResult> {
  const controller = new AbortController();
  const onAbort = (): void => controller.abort();
  if (signal.aborted) controller.abort();
  else signal.addEventListener("abort", onAbort, { once: true });
  const timer = setTimeout(() => controller.abort(), OVERPASS_PHASE_MS);
  try {
    return await fetchOverpass(params, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", onAbort);
  }
}

/** One actionable error describing both failed sources. */
function combinedFailure(overpassError: unknown, fallbackError: unknown): ProviderError {
  const primary = overpassError instanceof ProviderError ? overpassError : null;
  const backup = fallbackError instanceof ProviderError ? fallbackError : null;
  // A genuinely offline browser is the one case where the user must act.
  if (primary?.kind === "network" || backup?.kind === "network") {
    return (primary?.kind === "network" ? primary : backup) as ProviderError;
  }
  const rateLimited = primary?.kind === "rate-limit" || backup?.kind === "rate-limit";
  return new ProviderError(
    rateLimited ? "rate-limit" : "unavailable",
    "The free public OpenStreetMap services did not return business data. " +
      `Business-data servers (Overpass): ${primary?.message ?? "failed"} ` +
      `Backup search (Nominatim): ${backup?.message ?? "failed"} ` +
      "Your location was found, so your connection works — wait a minute and retry.",
  );
}

class OverpassCompanyProvider implements CompanyProvider {
  readonly id = "overpass";
  readonly label = "OpenStreetMap";

  async search(
    request: ProviderSearchRequest,
    options: { signal: AbortSignal },
  ): Promise<ProviderSearchResult> {
    const key = requestKey(request);
    const cached = resultCache.get(key);
    if (cached) return cached;
    const result = await inflight.run(key, () => runSearch(request, options));
    resultCache.set(key, result);
    return result;
  }
}

/** The default live provider used by the Find Companies page. */
export const companyProvider: CompanyProvider = new OverpassCompanyProvider();

export type {
  CompanyProvider,
  ProviderErrorKind,
  ProviderSearchRequest,
  ProviderSearchResult,
  ProviderSearchMeta,
} from "@/lib/providers/types";
export { ProviderError };
