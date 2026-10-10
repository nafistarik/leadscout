import { STORAGE_KEYS, readLocalStorage, safeJsonParse, writeLocalStorage } from "@/lib/storage";
import { fetchWithTimeout, readJsonBody, toProviderError } from "@/lib/providers/http";
import { ProviderError } from "@/lib/providers/types";

/**
 * Resolves a user-entered city/country to a geographic search area via
 * Nominatim (https://nominatim.openstreetmap.org).
 *
 * Usage-policy notes (see https://operations.osmfoundation.org/policies/nominatim/):
 * - at most 1 request/second — the app caches aggressively and only geocodes
 *   on explicit search submission, never per keystroke;
 * - responses carry OSM attribution requirements, honored in the UI;
 * - the browser automatically sends a Referer; no API key is used.
 */

export interface SearchArea {
  south: number;
  west: number;
  north: number;
  east: number;
  /** Human-readable area, e.g. "Berlin, Germany". */
  label: string;
  city: string | null;
  country: string | null;
}

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const GEOCODE_TIMEOUT_MS = 12_000;
/** Ceiling for bodies that arrive slowly after headers (see readJsonBody). */
const BODY_TIMEOUT_MS = 15_000;
const GEOCODE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const GEOCODE_CACHE_LIMIT = 50;

interface NominatimResult {
  boundingbox?: unknown;
  display_name?: unknown;
  address?: unknown;
}

interface CachedGeocode {
  storedAt: number;
  area: SearchArea;
}

function readGeocodeCache(): Record<string, CachedGeocode> {
  const raw = readLocalStorage(STORAGE_KEYS.geocodeCache);
  const parsed = safeJsonParse<unknown>(raw, {});
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {};
  const entries = Object.entries(parsed as Record<string, unknown>).filter(
    (entry): entry is [string, CachedGeocode] => {
      const value = entry[1] as CachedGeocode;
      return (
        typeof value === "object" &&
        value !== null &&
        typeof value.storedAt === "number" &&
        typeof value.area === "object" &&
        value.area !== null
      );
    },
  );
  return Object.fromEntries(entries);
}

function writeGeocodeCache(cache: Record<string, CachedGeocode>): void {
  const keys = Object.keys(cache).slice(-GEOCODE_CACHE_LIMIT);
  const trimmed: Record<string, CachedGeocode> = {};
  for (const key of keys) trimmed[key] = cache[key];
  writeLocalStorage(STORAGE_KEYS.geocodeCache, JSON.stringify(trimmed));
}

export function geocodeCacheKey(city: string, country: string): string {
  return `${city.trim().toLowerCase()}|${country.trim().toLowerCase()}`;
}

function toFiniteNumber(value: unknown): number | null {
  const num = typeof value === "string" ? Number(value) : typeof value === "number" ? value : NaN;
  return Number.isFinite(num) ? num : null;
}

/** Pure parser: converts one Nominatim result into a SearchArea, or null. */
export function parseNominatimResult(result: unknown, fallbackCity: string): SearchArea | null {
  if (typeof result !== "object" || result === null) return null;
  const item = result as NominatimResult;
  if (!Array.isArray(item.boundingbox) || item.boundingbox.length < 4) return null;
  const [south, north, west, east] = item.boundingbox.map(toFiniteNumber);
  if (south === null || north === null || west === null || east === null) return null;
  if (!(south < north && west < east)) return null;
  if (Math.abs(south) > 90 || Math.abs(north) > 90 || Math.abs(west) > 180 || Math.abs(east) > 180) {
    return null;
  }

  const address =
    typeof item.address === "object" && item.address !== null
      ? (item.address as Record<string, unknown>)
      : {};
  const pick = (...keys: string[]): string | null => {
    for (const key of keys) {
      const value = address[key];
      if (typeof value === "string" && value.trim()) return value.trim();
    }
    return null;
  };
  const city = pick("city", "town", "village", "municipality", "suburb", "county", "state") ?? (fallbackCity || null);
  const country = pick("country");
  const label =
    typeof item.display_name === "string" && item.display_name.trim()
      ? item.display_name
          .split(",")
          .slice(0, 3)
          .map((part) => part.trim())
          .filter(Boolean)
          .join(", ")
      : [city, country].filter(Boolean).join(", ") || fallbackCity;

  return { south, west, north, east, label, city, country };
}

export async function resolveSearchArea(
  city: string,
  country: string,
  options: { signal: AbortSignal },
): Promise<SearchArea> {
  const trimmedCity = city.trim();
  if (!trimmedCity) {
    throw new ProviderError(
      "needs-location",
      "Enter a city or region to search live data. Location is required to bound the search area.",
      false,
    );
  }

  const key = geocodeCacheKey(trimmedCity, country);
  const cache = readGeocodeCache();
  const cached = cache[key];
  if (cached && Date.now() - cached.storedAt < GEOCODE_TTL_MS) {
    return cached.area;
  }

  const query = country.trim() && country.trim().toLowerCase() !== "all"
    ? `${trimmedCity}, ${country.trim()}`
    : trimmedCity;
  const url =
    `${NOMINATIM_URL}?format=jsonv2&limit=1&addressdetails=1&accept-language=en` +
    `&q=${encodeURIComponent(query)}`;

  let data: unknown;
  try {
    const response = await fetchWithTimeout(url, {
      signal: options.signal,
      timeoutMs: GEOCODE_TIMEOUT_MS,
      headers: { Accept: "application/json" },
    });
    if (response.status === 429) {
      throw new ProviderError(
        "rate-limit",
        "The location service is rate-limiting requests right now. Wait a moment and retry.",
      );
    }
    if (!response.ok) {
      throw new ProviderError(
        "network",
        `The location service returned an unexpected status (${response.status}). Try again shortly.`,
      );
    }
    data = await readJsonBody(response, { signal: options.signal, timeoutMs: BODY_TIMEOUT_MS });
  } catch (error) {
    throw toProviderError(error, "Could not resolve the location. Check your connection and try again.");
  }

  if (!Array.isArray(data) || data.length === 0) {
    throw new ProviderError(
      "location-not-found",
      `No matching place was found for “${trimmedCity}”. Check the spelling or try a nearby larger city.`,
      false,
    );
  }

  const area = parseNominatimResult(data[0], trimmedCity);
  if (!area) {
    throw new ProviderError(
      "bad-response",
      "The location service returned data in an unexpected format. Try again shortly.",
    );
  }

  writeGeocodeCache({ ...cache, [key]: { storedAt: Date.now(), area } });
  return area;
}
