/**
 * Cities whose Overture places are pre-extracted and hosted on Hugging Face.
 * Any other city falls back to the live OpenStreetMap search in the app.
 *
 * `bbox` is [west, south, east, north] in degrees, looked up from Nominatim
 * on 2026-11-08. `id` is the folder name in the dataset, so never rename one
 * without re-uploading its files.
 */
/** Overture release the files are cut from; also the folder name on Hugging Face. */
export const OVERTURE_RELEASE = "2026-10-21.0";

export interface PreparedCity {
  id: string;
  name: string;
  /** ISO 3166-1 alpha-2, lowercase. */
  country: string;
  bbox: [west: number, south: number, east: number, north: number];
}

export const PREPARED_CITIES: PreparedCity[] = [
  // Bangladesh. OSM has no city boundary for most of these, so Nominatim
  // returns a ~35 km square around the centre; neighbours (Dhaka, Gazipur,
  // Narayanganj) overlap.
  { id: "dhaka", name: "Dhaka", country: "bd", bbox: [90.229, 23.604, 90.549, 23.924] },
  { id: "chattogram", name: "Chattogram", country: "bd", bbox: [91.674, 22.174, 91.994, 22.494] },
  { id: "sylhet", name: "Sylhet", country: "bd", bbox: [91.709, 24.739, 92.029, 25.059] },
  { id: "khulna", name: "Khulna", country: "bd", bbox: [89.404, 22.657, 89.724, 22.977] },
  { id: "rajshahi", name: "Rajshahi", country: "bd", bbox: [88.432, 24.212, 88.752, 24.532] },
  { id: "barishal", name: "Barishal", country: "bd", bbox: [90.211, 22.545, 90.531, 22.865] },
  { id: "rangpur", name: "Rangpur", country: "bd", bbox: [89.156, 25.661, 89.322, 25.84] },
  { id: "mymensingh", name: "Mymensingh", country: "bd", bbox: [90.25, 24.588, 90.57, 24.908] },
  { id: "gazipur", name: "Gazipur", country: "bd", bbox: [90.258, 23.84, 90.578, 24.16] },
  { id: "narayanganj", name: "Narayanganj", country: "bd", bbox: [90.339, 23.464, 90.659, 23.784] },
  { id: "cumilla", name: "Cumilla", country: "bd", bbox: [91.021, 23.301, 91.341, 23.621] },
  // Set by hand: Nominatim returns the whole district. Town, airport and the
  // beach-hotel strip down to Inani (~465 km²).
  { id: "coxs-bazar", name: "Cox's Bazar", country: "bd", bbox: [91.94, 21.2, 92.08, 21.49] },

  // Abroad: markets with many Bangladeshi-owned small businesses.
  { id: "london", name: "London", country: "gb", bbox: [-0.51, 51.287, 0.334, 51.692] },
  { id: "birmingham", name: "Birmingham", country: "gb", bbox: [-2.034, 52.381, -1.729, 52.609] },
  { id: "manchester", name: "Manchester", country: "gb", bbox: [-2.32, 53.34, -2.147, 53.545] },
  { id: "dubai", name: "Dubai", country: "ae", bbox: [55.132, 25.105, 55.452, 25.425] },
  { id: "abu-dhabi", name: "Abu Dhabi", country: "ae", bbox: [54.297, 24.281, 54.766, 24.602] },
  { id: "new-york", name: "New York", country: "us", bbox: [-74.259, 40.477, -73.7, 40.918] },
  { id: "kuala-lumpur", name: "Kuala Lumpur", country: "my", bbox: [101.615, 3.033, 101.758, 3.245] },
  { id: "toronto", name: "Toronto", country: "ca", bbox: [-79.639, 43.58, -79.113, 43.855] },
  // Set by hand: Nominatim returns Greater Sydney with the Blue Mountains.
  // Parramatta/Liverpool to Manly, Cronulla to Chatswood (~1,700 km²).
  { id: "sydney", name: "Sydney", country: "au", bbox: [150.88, -34.07, 151.31, -33.68] },
];
