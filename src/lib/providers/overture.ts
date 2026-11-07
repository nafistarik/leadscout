import { BUSINESS_CATEGORIES } from "@/data/categories";
import { COUNTRIES } from "@/data/countries";
import { parseKeywordChips } from "@/lib/keywords";
import { normalizeWebsiteUrl } from "@/lib/links";
import { computeOpportunity } from "@/lib/opportunity";
import { describeOsmDetails, socialNetworkOf } from "@/lib/osm-details";
import type { SocialNetwork } from "@/lib/osm-details";
import { TtlCache } from "@/lib/providers/cache";
import { bboxAreaKm2 } from "@/lib/providers/geo";
import { toProviderError } from "@/lib/providers/http";
import { matchesSelector, OVERTURE_CATEGORY_SELECTORS } from "@/lib/providers/overture-categories";
import type { OvertureSelector } from "@/lib/providers/overture-categories";
import type { ProviderSearchRequest, ProviderSearchResult } from "@/lib/providers/types";
import { ProviderError } from "@/lib/providers/types";
import type { Company } from "@/types/company";

/**
 * Prepared-city search: Overture places pre-extracted per city and category
 * (scripts/overture/) and hosted as static files on Hugging Face. Search is
 * a fetch of one or a few small files plus filtering in the browser, so it
 * is fast and never touches the rate-limited public OSM servers.
 */

/** Public, CORS-enabled file host; the manifest names the release folder. */
export const OVERTURE_DATA_URL = "https://huggingface.co/datasets/nafistarik/leadscout-places/resolve/main/";

/** Per file; the largest category file is ~2 MB gzipped. */
const FILE_TIMEOUT_MS = 20_000;

/**
 * "All businesses" would mean every category file (~26 MB for London), so it
 * searches these common web-design clients instead and says so in the note.
 */
const ALL_BUSINESSES_CATEGORIES = [
  "Restaurant", "Coffee Shop", "Beauty Salon", "Hairdresser", "Dental Clinic",
  "Medical Clinic", "Hotel", "Real Estate Agent", "Gym", "Clothing Store",
];

/** Spellings people type for a prepared city, keyed by its manifest id. */
const CITY_ALIASES: Record<string, string[]> = {
  chattogram: ["chittagong"],
  barishal: ["barisal"],
  cumilla: ["comilla"],
  "coxs-bazar": ["coxs bazar", "cox bazar"],
  "new-york": ["new york city", "nyc"],
};

export interface ManifestCity {
  id: string;
  name: string;
  /** ISO 3166-1 alpha-2, lowercase. */
  country: string;
  bbox: [west: number, south: number, east: number, north: number];
  total: number;
  /** Row count per category file present for this city. */
  categories: Record<string, number>;
}

export interface OvertureManifest {
  release: string;
  cities: ManifestCity[];
}

/** One business as stored in a category file (see scripts/overture/extract.ts). */
export interface PlaceRow {
  id: string;
  n: string;
  c: string;
  t?: string;
  lat: number;
  lon: number;
  w?: string;
  p?: string;
  e?: string;
  s?: string[];
  a?: string;
}

const SOCIAL_TAG_KEYS: Record<SocialNetwork, string> = {
  facebook: "contact:facebook",
  instagram: "contact:instagram",
  whatsapp: "contact:whatsapp",
  linkedin: "contact:linkedin",
  x: "contact:twitter",
  youtube: "contact:youtube",
  tiktok: "contact:tiktok",
  telegram: "contact:telegram",
};

function normalizeCityName(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Finds the prepared city a search is for.
 *
 * @param city Free text from the search form.
 * @param country English country name from the form, or "" for any.
 * @returns The manifest city, or null when the search must go to live OSM.
 */
export function findPreparedCity(manifest: OvertureManifest, city: string, country: string): ManifestCity | null {
  const wanted = normalizeCityName(city);
  if (!wanted) return null;
  const countryCode = country
    ? COUNTRIES.find((option) => option.name.toLowerCase() === country.trim().toLowerCase())?.code.toLowerCase()
    : undefined;
  // A country we cannot resolve must not match a prepared city in another one.
  if (country && !countryCode) return null;
  return (
    manifest.cities.find((entry) => {
      if (countryCode && entry.country !== countryCode) return false;
      const names = [entry.name, entry.id, ...(CITY_ALIASES[entry.id] ?? [])].map(normalizeCityName);
      return names.includes(wanted);
    }) ?? null
  );
}

function isPlaceRow(value: unknown): value is PlaceRow {
  if (typeof value !== "object" || value === null) return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.id === "string" &&
    typeof row.n === "string" &&
    row.n.trim().length > 0 &&
    typeof row.c === "string" &&
    Number.isFinite(row.lat) &&
    Number.isFinite(row.lon)
  );
}

function prettifyCategory(value: string): string {
  const words = value.replace(/_/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * Converts one stored place to the app's Company shape. Contacts are also
 * written as OSM-style tags, so details, opportunity scoring, website checks
 * and CSV export treat it exactly like an OpenStreetMap result.
 *
 * @param categoryLabel The searched category's label, or null for "All businesses".
 */
export function placeToCompany(row: PlaceRow, city: ManifestCity, categoryLabel: string | null): Company {
  const countryName = COUNTRIES.find((option) => option.code.toLowerCase() === city.country)?.name ?? null;
  const website = normalizeWebsiteUrl(row.w);
  const tags: Record<string, string> = { name: row.n, "overture:category": row.t ?? row.c };
  if (website) tags.website = website;
  if (row.p) tags.phone = row.p;
  if (row.e) tags.email = row.e;
  if (row.a) tags["addr:full"] = row.a;
  for (const url of row.s ?? []) {
    const network = socialNetworkOf(url);
    if (network && !tags[SOCIAL_TAG_KEYS[network]]) tags[SOCIAL_TAG_KEYS[network]] = url;
  }
  return {
    id: `overture:${row.id}`,
    provenance: "overture",
    name: row.n.trim(),
    category: categoryLabel ?? prettifyCategory(row.t ?? row.c),
    city: city.name,
    country: countryName,
    locationLabel: [city.name, countryName].filter(Boolean).join(", "),
    lat: row.lat,
    lon: row.lon,
    website,
    phone: row.p ?? null,
    email: row.e ?? null,
    openingHours: null,
    source: "Overture Maps",
    sourceUrl: null,
    tags,
  };
}

/**
 * Picks the rows that belong to the searched category and keyword.
 *
 * @param keyword Comma-separated chips; a row matches when its name or fine
 *   category contains any of them (case-insensitive).
 */
export function selectPlaces(rows: PlaceRow[], selectors: OvertureSelector[], keyword: string): PlaceRow[] {
  const chips = parseKeywordChips(keyword).map((chip) => chip.toLowerCase());
  const seen = new Set<string>();
  return rows.filter((row) => {
    if (seen.has(row.id) || !selectors.some((selector) => matchesSelector(row, selector))) return false;
    if (chips.length > 0) {
      const haystack = `${row.n} ${(row.t ?? row.c).replace(/_/g, " ")}`.toLowerCase();
      if (!chips.some((chip) => haystack.includes(chip))) return false;
    }
    seen.add(row.id);
    return true;
  });
}

async function fetchJson(url: string, signal: AbortSignal, gzipped: boolean): Promise<unknown> {
  const timeout = AbortSignal.timeout(FILE_TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: AbortSignal.any([signal, timeout]) });
    if (!response.ok || !response.body) {
      throw new ProviderError("unavailable", `The prepared business data could not be loaded (HTTP ${response.status}).`);
    }
    // The host serves .json.gz as raw gzip bytes (no Content-Encoding), so unzip here.
    const body = gzipped ? response.body.pipeThrough(new DecompressionStream("gzip")) : response.body;
    return await new Response(body).json();
  } catch (error) {
    if (timeout.aborted && !signal.aborted) {
      throw new ProviderError("timeout", "Loading the prepared business data took too long. Try again.");
    }
    if (error instanceof SyntaxError) {
      throw new ProviderError("bad-response", "The prepared business data was damaged in transit. Try again.");
    }
    throw signal.aborted ? error : toProviderError(error, "The prepared-data host (Hugging Face)");
  }
}

let manifestPromise: Promise<OvertureManifest> | null = null;

/** The manifest is tiny and changes only on a new upload: one load per session. */
function loadManifest(signal: AbortSignal): Promise<OvertureManifest> {
  manifestPromise ??= fetchJson(`${OVERTURE_DATA_URL}manifest.json`, signal, false).then((value) => {
    const manifest = value as Partial<OvertureManifest> | null;
    if (typeof manifest?.release !== "string" || !Array.isArray(manifest.cities)) {
      throw new ProviderError("bad-response", "The prepared business data list is in an unexpected format.");
    }
    return manifest as OvertureManifest;
  });
  // A failed or aborted load must not stick for the rest of the session.
  manifestPromise.catch(() => {
    manifestPromise = null;
  });
  return manifestPromise;
}

/** Parsed category files; immutable per release, so only memory bounds them. */
const fileCache = new TtlCache<PlaceRow[]>(30 * 60 * 1000, 20);

/** Forgets the loaded manifest and files; tests start from a clean session. */
export function resetOvertureCache(): void {
  manifestPromise = null;
  fileCache.clear();
}

async function loadCategoryFile(url: string, signal: AbortSignal): Promise<PlaceRow[]> {
  const cached = fileCache.get(url);
  if (cached) return cached;
  const value = await fetchJson(url, signal, true);
  const rows = Array.isArray(value) ? value.filter(isPlaceRow) : [];
  fileCache.set(url, rows);
  return rows;
}

/**
 * Searches a prepared city.
 *
 * @param limit Maximum companies to return (already clamped by the caller).
 * @returns Results ranked best pitch first, or null when the city is not
 *   prepared and the caller should run the live OpenStreetMap search.
 * @throws ProviderError when the prepared data cannot be loaded.
 */
export async function searchOverture(
  request: ProviderSearchRequest,
  limit: number,
  options: { signal: AbortSignal },
): Promise<ProviderSearchResult | null> {
  const manifest = await loadManifest(options.signal);
  const city = findPreparedCity(manifest, request.city, request.country);
  if (!city) return null;

  const allBusinesses = request.category === "all" || !OVERTURE_CATEGORY_SELECTORS[request.category];
  const selectors = allBusinesses
    ? ALL_BUSINESSES_CATEGORIES.flatMap((category) => OVERTURE_CATEGORY_SELECTORS[category])
    : OVERTURE_CATEGORY_SELECTORS[request.category];
  const files = [...new Set(selectors.map((selector) => selector.c))].filter((file) => city.categories[file]);
  const rows = (
    await Promise.all(
      files.map((file) => loadCategoryFile(`${OVERTURE_DATA_URL}${manifest.release}/${city.id}/${file}.json.gz`, options.signal)),
    )
  ).flat();

  const label = allBusinesses ? null : (BUSINESS_CATEGORIES.find((option) => option.value === request.category)?.label ?? null);
  const ranked = selectPlaces(rows, selectors, request.keyword)
    .map((row, index) => {
      const company = placeToCompany(row, city, label);
      return { company, index, rank: computeOpportunity(company, describeOsmDetails(company), null).rank };
    })
    // Stable: equal pitch rank keeps file order.
    .sort((a, b) => a.rank - b.rank || a.index - b.index);

  const [west, south, east, north] = city.bbox;
  return {
    companies: ranked.slice(0, limit).map((entry) => entry.company),
    meta: {
      providerId: "overture",
      areaLabel: [city.name, COUNTRIES.find((option) => option.code.toLowerCase() === city.country)?.name]
        .filter(Boolean)
        .join(", "),
      truncated: ranked.length > limit,
      examined: ranked.length,
      areaKm2: bboxAreaKm2({ west, south, east, north }),
      coverageNote: allBusinesses
        ? `“All businesses” in a prepared city searches ${ALL_BUSINESSES_CATEGORIES.length} common client types (${ALL_BUSINESSES_CATEGORIES.join(", ")}). Pick a category for anything else.`
        : null,
    },
  };
}
