import type { Company } from "@/types/company";
import type { OsmTagPair } from "@/lib/providers/osm-tags";
import { normalizeWebsiteUrl } from "@/lib/links";
import { fetchWithTimeout, readJsonBody, toProviderError } from "@/lib/providers/http";
import { ProviderError } from "@/lib/providers/types";
import type { SearchArea } from "@/lib/providers/nominatim";

/**
 * Queries business objects from the Overpass API
 * (https://wiki.openstreetmap.org/wiki/Overpass_API).
 *
 * Safety rules:
 * - Only allowlisted OSM tag pairs (see osm-tags.ts) enter the query — never
 *   raw user input.
 * - The user keyword is sanitized to a safe alphabet, length-capped, and
 *   escaped before use in a case-insensitive name regex.
 * - Bounding-box numbers are validated as finite and range-checked.
 * - Only `name`-carrying nodes/ways/relations are requested, with `out center
 *   tags` so ways/relations resolve to a point and payloads stay small.
 */

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
] as const;
const OVERPASS_TIMEOUT_MS = 30_000;
const OVERPASS_SERVER_TIMEOUT_S = 25;
/** Generous ceiling for bodies that arrive slowly after headers (see readJsonBody). */
const BODY_TIMEOUT_MS = 15_000;
const MAX_KEYWORD_LENGTH = 40;

export interface OverpassSearchParams {
  tags: OsmTagPair[];
  keyword: string;
  area: SearchArea;
  /** Max elements requested from the server (before app-side slicing). */
  serverLimit: number;
}

/** Keeps letters, numbers, spaces, hyphens and apostrophes; drops the rest. */
export function sanitizeKeyword(keyword: string): string {
  return keyword
    .replace(/[^\p{L}\p{N}\s\-']/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_KEYWORD_LENGTH);
}

/** Escapes a value for embedding in an Overpass double-quoted string. */
export function escapeOverpassString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export function formatBbox(area: SearchArea): string | null {
  const coords = [area.south, area.west, area.north, area.east];
  if (!coords.every((n) => Number.isFinite(n))) return null;
  if (!(area.south < area.north && area.west < area.east)) return null;
  const fixed = coords.map((n) => n.toFixed(5)).join(",");
  return `(${fixed})`;
}

/**
 * Builds a deterministic Overpass QL query from allowlisted inputs only.
 * Returns null when the bbox is invalid (caller treats this as an error).
 */
export function buildOverpassQuery(params: OverpassSearchParams): string | null {
  const bbox = formatBbox(params.area);
  if (!bbox) return null;
  const keyword = sanitizeKeyword(params.keyword);
  const nameFilter = keyword ? `["name"~"${escapeOverpassString(keyword)}",i]` : "";

  const clauses: string[] = [];
  for (const tag of params.tags) {
    const tagFilter = tag.value === null ? `["${tag.key}"]` : `["${tag.key}"="${tag.value}"]`;
    for (const kind of ["node", "way", "relation"] as const) {
      clauses.push(`  ${kind}${tagFilter}["name"]${nameFilter}${bbox};`);
    }
  }

  const limit = Math.max(1, Math.min(100, Math.floor(params.serverLimit)));
  return (
    `[out:json][timeout:${OVERPASS_SERVER_TIMEOUT_S}];\n` +
    `(\n${clauses.join("\n")}\n);\n` +
    `out center tags ${limit};`
  );
}

type OsmElementType = "node" | "way" | "relation";

interface RawElement {
  type?: unknown;
  id?: unknown;
  lat?: unknown;
  lon?: unknown;
  center?: unknown;
  tags?: unknown;
}

function isStringRecord(value: unknown): value is Record<string, string> {
  if (typeof value !== "object" || value === null) return false;
  return Object.values(value).every((v) => typeof v === "string");
}

function finiteOrNull(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return null;
}

function pickContact(tags: Record<string, string>, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = tags[key]?.trim();
    if (value) return value;
  }
  return null;
}

/** Normalizes one raw Overpass element; returns null for malformed entries. */
export function normalizeElement(
  raw: unknown,
  pairByTag: Map<string, OsmTagPair>,
  area: SearchArea,
): Company | null {
  if (typeof raw !== "object" || raw === null) return null;
  const el = raw as RawElement;
  if (el.type !== "node" && el.type !== "way" && el.type !== "relation") return null;
  if (typeof el.id !== "number" || !Number.isInteger(el.id)) return null;
  if (!isStringRecord(el.tags)) return null;

  const name = el.tags.name?.trim();
  if (!name) return null;

  let lat: number | null = null;
  let lon: number | null = null;
  if (el.type === "node") {
    lat = finiteOrNull(el.lat);
    lon = finiteOrNull(el.lon);
  } else if (typeof el.center === "object" && el.center !== null) {
    const center = el.center as { lat?: unknown; lon?: unknown };
    lat = finiteOrNull(center.lat);
    lon = finiteOrNull(center.lon);
  }

  const matched = matchTagPair(el.tags, pairByTag);
  const category = matched?.label ?? prettifyTags(el.tags);
  const city =
    el.tags["addr:city"]?.trim() ||
    el.tags["addr:town"]?.trim() ||
    el.tags["addr:village"]?.trim() ||
    el.tags["addr:suburb"]?.trim() ||
    area.city;
  const country = el.tags["addr:country"]?.trim() || area.country;
  const locationLabel =
    [city, country].filter(Boolean).join(", ") || area.label || "Location not specified";

  const type = el.type as OsmElementType;
  return {
    id: `osm:${type}/${el.id}`,
    provenance: "osm",
    name,
    category,
    city: city || null,
    country: country || null,
    locationLabel,
    lat,
    lon,
    website: normalizeWebsiteUrl(pickContact(el.tags, "website", "contact:website")),
    phone: pickContact(el.tags, "phone", "contact:phone"),
    email: pickContact(el.tags, "email", "contact:email"),
    openingHours: pickContact(el.tags, "opening_hours")?.trim() ? el.tags["opening_hours"].trim() : null,
    source: "OpenStreetMap",
    sourceUrl: `https://www.openstreetmap.org/${type}/${el.id}`,
    tags: el.tags,
  };
}

function matchTagPair(tags: Record<string, string>, pairByTag: Map<string, OsmTagPair>): OsmTagPair | null {
  for (const [key, pair] of pairByTag) {
    const value = tags[key];
    if (value === undefined) continue;
    if (pair.value === null || pair.value === value) return pair;
  }
  return null;
}

/** Builds the lookup used to label normalized results. */
export function pairLookup(tags: OsmTagPair[]): Map<string, OsmTagPair> {
  const map = new Map<string, OsmTagPair>();
  for (const pair of tags) {
    if (!map.has(pair.key)) map.set(pair.key, pair);
  }
  return map;
}

function prettifyTags(tags: Record<string, string>): string {
  const keys = ["shop", "office", "craft", "amenity", "leisure"];
  for (const key of keys) {
    const value = tags[key];
    if (value) {
      const words = value.replace(/_/g, " ").trim();
      return words.charAt(0).toUpperCase() + words.slice(1);
    }
  }
  return "Business";
}

function dedupeKey(company: Company): string {
  const name = company.name
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  const lat = company.lat !== null ? company.lat.toFixed(3) : "?";
  const lon = company.lon !== null ? company.lon.toFixed(3) : "?";
  return `${name}|${lat}|${lon}`;
}

/**
 * Deduplicates normalized companies. The stable OSM id is the primary key;
 * a name + rounded-coordinate comparison catches the same business modeled
 * as multiple element types. Distinct businesses with similar names at
 * different locations are always kept.
 */
export function dedupeCompanies(companies: Company[]): Company[] {
  const seenIds = new Set<string>();
  const seenKeys = new Set<string>();
  const result: Company[] = [];
  for (const company of companies) {
    if (seenIds.has(company.id)) continue;
    const key = dedupeKey(company);
    if (seenKeys.has(key)) continue;
    seenIds.add(company.id);
    seenKeys.add(key);
    result.push(company);
  }
  return result;
}

export interface OverpassFetchResult {
  companies: Company[];
  /** True when the server hit the requested element limit. */
  truncated: boolean;
}

function looksLikeTimeout(data: unknown): boolean {
  if (typeof data !== "object" || data === null) return false;
  const remark = (data as { remark?: unknown }).remark;
  return typeof remark === "string" && /timed out/i.test(remark);
}

async function fetchFromEndpoint(
  endpoint: string,
  query: string,
  params: OverpassSearchParams,
  options: { signal: AbortSignal },
): Promise<OverpassFetchResult> {
  const url = `${endpoint}?data=${encodeURIComponent(query)}`;
  const response = await fetchWithTimeout(url, {
    signal: options.signal,
    timeoutMs: OVERPASS_TIMEOUT_MS,
    headers: { Accept: "application/json" },
  }).catch((error: unknown) => {
    throw toProviderError(error, "Could not reach the Overpass API. Check your connection and try again.");
  });

  if (response.status === 429) {
    throw new ProviderError(
      "rate-limit",
      "The Overpass API is rate-limiting requests right now. Wait a minute or two, then retry.",
    );
  }
  if (response.status === 504 || response.status === 502 || response.status === 503) {
    throw new ProviderError(
      response.status === 504 ? "timeout" : "network",
      "The Overpass API is overloaded right now. Wait a moment and retry.",
    );
  }
  if (!response.ok) {
    throw new ProviderError(
      "network",
      `The Overpass API returned an unexpected status (${response.status}). Try again shortly.`,
    );
  }

  let data: unknown;
  try {
    data = await readJsonBody(response, { signal: options.signal, timeoutMs: BODY_TIMEOUT_MS });
  } catch (error) {
    // Timeouts already carry their kind; anything else means the payload
    // could not be parsed (including aborts, which callers handle by signal).
    if (error instanceof ProviderError) throw error;
    throw new ProviderError("bad-response", "The Overpass API returned data in an unexpected format.");
  }

  if (looksLikeTimeout(data)) {
    throw new ProviderError(
      "timeout",
      "The Overpass query timed out on the server. Try a smaller area or fewer categories.",
    );
  }
  if (typeof data !== "object" || data === null || !Array.isArray((data as { elements?: unknown }).elements)) {
    throw new ProviderError("bad-response", "The Overpass API returned data in an unexpected format.");
  }

  const elements = (data as { elements: unknown[] }).elements;
  const lookup = pairLookup(params.tags);
  const companies: Company[] = [];
  for (const element of elements) {
    const company = normalizeElement(element, lookup, params.area);
    if (company) companies.push(company);
  }
  return { companies, truncated: elements.length >= params.serverLimit };
}

/**
 * Runs the query against the primary endpoint, falling back to a secondary
 * instance once on connection/timeout/server errors — but never on
 * rate-limits (a 429 means back off, not shift load elsewhere).
 */
export async function fetchOverpass(
  params: OverpassSearchParams,
  options: { signal: AbortSignal },
): Promise<OverpassFetchResult> {
  const query = buildOverpassQuery(params);
  if (!query) {
    throw new ProviderError("bad-response", "The search area is invalid. Try a different city.");
  }

  try {
    return await fetchFromEndpoint(OVERPASS_ENDPOINTS[0], query, params, options);
  } catch (error) {
    if (
      error instanceof ProviderError &&
      (error.kind === "rate-limit" || error.kind === "needs-location" || error.kind === "location-not-found")
    ) {
      throw error;
    }
    // Single fallback attempt for transport-level failures.
    return await fetchFromEndpoint(OVERPASS_ENDPOINTS[1], query, params, options);
  }
}
