import { searchCacheKey, InflightDeduper, TtlCache } from "@/lib/providers/cache";
import { bboxAreaKm2, formatAreaKm2, MAX_SEARCH_AREA_KM2 } from "@/lib/providers/geo";
import { resolveSearchArea } from "@/lib/providers/nominatim";
import { dedupeCompanies, fetchOverpass } from "@/lib/providers/overpass";
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

const resultCache = new TtlCache<ProviderSearchResult>(RESULT_TTL_MS);
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
  const { companies, truncated } = await fetchOverpass(
    { tags, keyword: request.keyword, area, serverLimit },
    { signal: options.signal },
  );

  const unique = dedupeCompanies(companies);
  return {
    companies: unique.slice(0, limit),
    meta: {
      providerId: "overpass",
      areaLabel: area.label,
      truncated: truncated || unique.length > limit,
      examined: companies.length,
      areaKm2,
    },
  };
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
