import type { Company } from "@/types/company";
import { fetchWithTimeout, readJsonBody, toProviderError } from "@/lib/providers/http";
import { NOMINATIM_URL, waitForNominatimSlot } from "@/lib/providers/nominatim";
import { normalizeElement, pairLookup, sanitizeKeyword } from "@/lib/providers/overpass";
import type { OverpassFetchResult, OverpassSearchParams } from "@/lib/providers/overpass";
import { ProviderError } from "@/lib/providers/types";

/**
 * Fallback business search through Nominatim's category syntax
 * (`q=[amenity=cafe]` + bounded viewbox), used only when every Overpass
 * instance has failed. Nominatim is far more available than the public
 * Overpass servers, but it is narrower:
 * - at most 40 results per category request (no paging here);
 * - key-only tags (e.g. any `shop`) cannot be queried, so generic searches
 *   cover only the specific valued tags in the category mapping;
 * - keywords are matched client-side against the returned names.
 *
 * Requests are sequential and throttled to the 1 req/s usage policy
 * (shared with geocoding), and capped at MAX_REQUESTS per search.
 */

const REQUEST_TIMEOUT_MS = 12_000;
const BODY_TIMEOUT_MS = 15_000;
/** Nominatim's hard maximum for `limit`. */
const PAGE_LIMIT = 40;
const MAX_REQUESTS = 3;

interface NominatimPlace {
  osm_type?: unknown;
  osm_id?: unknown;
  lat?: unknown;
  lon?: unknown;
  name?: unknown;
  category?: unknown;
  type?: unknown;
  extratags?: unknown;
  address?: unknown;
}

function toNumber(value: unknown): number | null {
  const num = typeof value === "string" ? Number(value) : typeof value === "number" ? value : NaN;
  return Number.isFinite(num) ? num : null;
}

function stringEntries(value: unknown): Record<string, string> {
  if (typeof value !== "object" || value === null) return {};
  const result: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === "string") result[key] = entry;
  }
  return result;
}

/**
 * Converts one Nominatim place into the raw Overpass element shape so the
 * shared normalizer produces identical Company records (same `osm:` ids,
 * contact fields, and source links). Returns null for malformed entries.
 */
export function placeToElement(raw: unknown): unknown {
  if (typeof raw !== "object" || raw === null) return null;
  const place = raw as NominatimPlace;
  const lat = toNumber(place.lat);
  const lon = toNumber(place.lon);
  if (typeof place.category !== "string" || typeof place.type !== "string") return null;
  const name = typeof place.name === "string" ? place.name : "";
  const address = stringEntries(place.address);
  const tags: Record<string, string> = {
    ...stringEntries(place.extratags),
    [place.category]: place.type,
    name,
  };
  const city = address.city ?? address.town ?? address.village;
  if (city && !tags["addr:city"]) tags["addr:city"] = city;
  return {
    type: place.osm_type,
    id: toNumber(place.osm_id),
    lat,
    lon,
    center: { lat, lon },
    tags,
  };
}

export async function fetchNominatimPois(
  params: OverpassSearchParams,
  options: { signal: AbortSignal },
): Promise<OverpassFetchResult & { skippedGenericTags: boolean }> {
  const valued = params.tags.filter((tag) => tag.value !== null).slice(0, MAX_REQUESTS);
  const skippedGenericTags = params.tags.some((tag) => tag.value === null);
  if (valued.length === 0) {
    throw new ProviderError("unavailable", "The backup search cannot query this category.");
  }

  const { west, north, east, south } = params.area;
  const viewbox = [west, north, east, south].map((n) => n.toFixed(5)).join(",");
  const keyword = sanitizeKeyword(params.keyword).toLowerCase();
  const lookup = pairLookup(params.tags);
  const companies: Company[] = [];
  let truncated = false;

  for (const tag of valued) {
    const url =
      `${NOMINATIM_URL}?format=jsonv2&limit=${PAGE_LIMIT}&extratags=1&addressdetails=1` +
      `&accept-language=en&bounded=1&viewbox=${viewbox}` +
      `&q=${encodeURIComponent(`[${tag.key}=${tag.value}]`)}`;
    let data: unknown;
    try {
      await waitForNominatimSlot(options.signal);
      const response = await fetchWithTimeout(url, {
        signal: options.signal,
        timeoutMs: REQUEST_TIMEOUT_MS,
        headers: { Accept: "application/json" },
      });
      if (response.status === 429) {
        throw new ProviderError(
          "rate-limit",
          "The backup search (Nominatim) is rate-limiting requests right now. Wait a minute, then retry.",
        );
      }
      if (!response.ok) {
        throw new ProviderError(
          "unavailable",
          `The backup search (Nominatim) returned an unexpected status (${response.status}).`,
        );
      }
      data = await readJsonBody(response, { signal: options.signal, timeoutMs: BODY_TIMEOUT_MS });
    } catch (error) {
      throw toProviderError(error, "The backup search (Nominatim)");
    }
    if (!Array.isArray(data)) {
      throw new ProviderError("bad-response", "The backup search returned data in an unexpected format.");
    }
    if (data.length >= PAGE_LIMIT) truncated = true;
    for (const place of data) {
      const company = normalizeElement(placeToElement(place), lookup, params.area);
      if (!company) continue;
      if (keyword && !company.name.toLowerCase().includes(keyword)) continue;
      companies.push(company);
    }
  }

  return { companies, truncated, skippedGenericTags };
}
