/**
 * Pure geographic helpers for bounding-box safety.
 *
 * Public Overpass/Nominatim instances are shared resources: an excessively
 * broad bounding box (a state, a large country) forces the server to scan
 * far more data while the capped output still misleads the user into
 * thinking the result is complete. The guard below keeps searches at a
 * metro/region scale and explains rejections instead of silently running
 * a truncated broad query.
 */

export interface BBox {
  south: number;
  west: number;
  north: number;
  east: number;
}

/**
 * Maximum live-search area in km². Documented rationale:
 * - A large metro (Berlin ≈ 1,700 km², London ≈ 1,600 km²) fits comfortably.
 * - Regions and small countries (Netherlands ≈ 41,500 km²) still fit.
 * - States and large countries (Bavaria ≈ 70,500 km², Germany ≈ 357,000 km²)
 *   are rejected: scanning them usually times out or returns a capped,
 *   misleading slice. Users are asked to enter a city or district instead.
 */
export const MAX_SEARCH_AREA_KM2 = 50_000;

const KM_PER_DEGREE_LAT = 110.57;
const KM_PER_DEGREE_LON_EQUATOR = 111.32;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Approximates bbox area with an equirectangular projection — accurate
 * enough for a safety guard (error is small versus the 50,000 km² limit).
 * Returns null for invalid bounds, including antimeridian-crossing boxes
 * (west > east), which Overpass cannot query as a single bbox.
 */
export function bboxAreaKm2(box: BBox): number | null {
  const { south, west, north, east } = box;
  if (![south, west, north, east].every((n) => Number.isFinite(n))) return null;
  if (!(south < north && west < east)) return null;
  if (Math.abs(south) > 90 || Math.abs(north) > 90) return null;
  if (Math.abs(west) > 180 || Math.abs(east) > 180) return null;
  const meanLat = toRadians((south + north) / 2);
  const heightKm = (north - south) * KM_PER_DEGREE_LAT;
  const widthKm = (east - west) * KM_PER_DEGREE_LON_EQUATOR * Math.cos(meanLat);
  if (!(heightKm > 0 && widthKm > 0)) return null;
  return heightKm * widthKm;
}

/** Human-readable area, e.g. "1,700 km²". Returns null for invalid input. */
export function formatAreaKm2(km2: number | null): string | null {
  if (km2 === null || !Number.isFinite(km2) || km2 < 0) return null;
  return `${Math.round(km2).toLocaleString("en-US")} km²`;
}
