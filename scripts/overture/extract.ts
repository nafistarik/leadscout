/**
 * Extracts Overture places for the prepared cities into small gzipped JSON
 * files, one per city and category, plus a manifest the app reads first.
 *
 *   bun scripts/overture/extract.ts            # every city
 *   bun scripts/overture/extract.ts dhaka      # only the listed ids
 *
 * Runs on a laptop only: DuckDB reads just the matching parts of Overture's
 * public Parquet files on S3, so no download of the whole dataset is needed.
 */
import { DuckDBInstance } from "@duckdb/node-api";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { OVERTURE_RELEASE, PREPARED_CITIES } from "./cities";

const SOURCE = `s3://overturemaps-us-west-2/release/${OVERTURE_RELEASE}/theme=places/type=place/*.parquet`;
const OUT_DIR = new URL(`./out/${OVERTURE_RELEASE}/`, import.meta.url).pathname;

/** Below this, Overture's own match score says the place is often stale or wrong. */
const MIN_CONFIDENCE = 0.7;

/**
 * Overture `basic_category` values that are never a web-design client:
 * nature, infrastructure, worship, government and residential buildings.
 */
const EXCLUDED_CATEGORIES = [
  "airport", "apartment", "atm", "beach", "bridge", "buddhist_place_of_worship", "built_feature",
  "canal", "castle", "cemetery", "christian_place_of_worship", "civic_center", "condominium",
  "courthouse", "dog_park", "embassy", "ev_charging_station", "fire_station", "forest", "garden",
  "geographic_entities", "government_department", "government_office", "hindu_place_of_worship",
  "historic_site", "island", "jail_or_prison", "jewish_place_of_worship", "lake", "land_feature",
  "lighthouse", "memorial_site", "military_base", "military_site", "monument", "mountain",
  "muslim_place_of_worship", "national_park", "nature_reserve", "park", "parking", "parking_garage",
  "parking_lot", "pier", "place_of_worship", "playground", "police_station", "political_organization",
  "public_fountain", "public_plaza", "public_restroom", "public_safety_service",
  "public_transit_facility_or_service", "rail_facility_or_service", "recreational_trail_or_path",
  "religious_organization", "rest_stop", "river", "sculpture_statue", "street_art", "train_station",
];

/** One business as stored in a category file; short keys keep the files small. */
interface PlaceRow {
  /** Overture id, stable across releases for the same place. */
  id: string;
  n: string;
  /** Coarse `basic_category` (the file it lives in). */
  c: string;
  /** Fine `taxonomy.primary`, e.g. "hair_salon" inside personal_or_beauty_service. */
  t?: string;
  lat: number;
  lon: number;
  w?: string;
  p?: string;
  e?: string;
  /** Social profile URLs, mostly Facebook pages. */
  s?: string[];
  a?: string;
}

interface CityManifest {
  id: string;
  name: string;
  country: string;
  bbox: [number, number, number, number];
  total: number;
  categories: Record<string, number>;
}

/**
 * Queries one city's places from Overture, applying every filter in SQL so
 * only rows the app can use leave S3.
 *
 * @param bbox [west, south, east, north] of the city.
 * @returns Slim rows with null fields dropped.
 */
async function queryCity(
  connection: Awaited<ReturnType<DuckDBInstance["connect"]>>,
  bbox: [number, number, number, number],
): Promise<PlaceRow[]> {
  const [west, south, east, north] = bbox;
  const excluded = EXCLUDED_CATEGORIES.map((category) => `'${category}'`).join(", ");
  const reader = await connection.runAndReadAll(`
    SELECT id, names.primary AS n, coalesce(basic_category, 'other') AS c, taxonomy.primary AS t,
      round(bbox.ymin, 5) AS lat, round(bbox.xmin, 5) AS lon,
      websites[1] AS w, phones[1] AS p, emails[1] AS e, socials AS s, addresses[1].freeform AS a
    FROM read_parquet('${SOURCE}')
    WHERE bbox.xmin BETWEEN ${west} AND ${east} AND bbox.ymin BETWEEN ${south} AND ${north}
      AND confidence >= ${MIN_CONFIDENCE}
      AND brand.names.primary IS NULL
      AND names.primary IS NOT NULL
      AND coalesce(operating_status, 'open') = 'open'
      AND coalesce(basic_category, 'other') NOT IN (${excluded})`);
  return reader.getRowObjectsJson().map((row) => {
    const place = Object.fromEntries(
      Object.entries(row).filter(([, value]) => value !== null && !(Array.isArray(value) && value.length === 0)),
    ) as unknown as PlaceRow;
    // taxonomy repeats the coarse category for uncategorized places; no extra information.
    if (place.t === place.c) delete place.t;
    return place;
  });
}

/**
 * Writes one gzipped JSON file per category for a city.
 *
 * @returns Row count per category, for the manifest.
 */
function writeCity(cityId: string, rows: PlaceRow[]): Record<string, number> {
  const byCategory = Map.groupBy(rows, (row) => row.c);
  const cityDir = `${OUT_DIR}${cityId}/`;
  rmSync(cityDir, { recursive: true, force: true });
  mkdirSync(cityDir, { recursive: true });
  const counts: Record<string, number> = {};
  for (const [category, list] of [...byCategory].sort(([a], [b]) => a.localeCompare(b))) {
    writeFileSync(`${cityDir}${category}.json.gz`, gzipSync(JSON.stringify(list)));
    counts[category] = list.length;
  }
  return counts;
}

const requested = process.argv.slice(2);
const unknown = requested.filter((id) => !PREPARED_CITIES.some((city) => city.id === id));
if (unknown.length > 0) throw new Error(`Unknown city id: ${unknown.join(", ")}`);
const cities = requested.length > 0 ? PREPARED_CITIES.filter((city) => requested.includes(city.id)) : PREPARED_CITIES;

const connection = await (await DuckDBInstance.create(":memory:")).connect();
await connection.run("INSTALL httpfs; LOAD httpfs; SET s3_region = 'us-west-2';");

// A partial run (`extract.ts dhaka`) replaces only those cities in the manifest.
const manifestPath = `${OUT_DIR}manifest.json`;
const previous: CityManifest[] = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, "utf8")).cities : [];
const manifest = previous.filter((entry) => !cities.some((city) => city.id === entry.id));
for (const city of cities) {
  const started = performance.now();
  const rows = await queryCity(connection, city.bbox);
  const categories = writeCity(city.id, rows);
  manifest.push({ id: city.id, name: city.name, country: city.country, bbox: city.bbox, total: rows.length, categories });
  const seconds = ((performance.now() - started) / 1000).toFixed(0);
  console.log(`${city.id}: ${rows.length} places, ${Object.keys(categories).length} categories, ${seconds}s`);
}

manifest.sort((a, b) => PREPARED_CITIES.findIndex((c) => c.id === a.id) - PREPARED_CITIES.findIndex((c) => c.id === b.id));
writeFileSync(
  manifestPath,
  JSON.stringify({ release: OVERTURE_RELEASE, generatedAt: new Date().toISOString(), cities: manifest }, null, 2),
);
