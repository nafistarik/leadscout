/**
 * Maps the app's business categories to OpenStreetMap tag pairs.
 *
 * Each entry lists one or more `{ key, value }` pairs that are OR-ed in the
 * Overpass query. Categories without a direct OSM equivalent map to the
 * closest broader tag and are marked `approximate` so the UI/tests can tell
 * exact matches from broader ones. "all" uses generic business tags.
 */
export interface OsmTagPair {
  key: string;
  value: string | null;
  /** Human-readable category shown for results matched by this pair. */
  label: string;
  /** True when the tag is broader than the requested category. */
  approximate?: boolean;
}

const CATEGORY_TAGS: Record<string, OsmTagPair[]> = {
  Bakery: [{ key: "shop", value: "bakery", label: "Bakery" }],
  "Dental Clinic": [{ key: "amenity", value: "dentist", label: "Dental Clinic" }],
  "Bicycle Shop": [{ key: "shop", value: "bicycle", label: "Bicycle Shop" }],
  "Coworking Space": [{ key: "office", value: "coworking", label: "Coworking Space" }],
  Florist: [{ key: "shop", value: "florist", label: "Florist" }],
  "Coffee Roaster": [{ key: "shop", value: "coffee", label: "Coffee Roaster" }],
  "Yoga Studio": [
    { key: "leisure", value: "fitness_centre", label: "Yoga / Fitness Studio", approximate: true },
  ],
  Bookstore: [{ key: "shop", value: "books", label: "Bookstore" }],
  "Coffee Shop": [{ key: "amenity", value: "cafe", label: "Coffee Shop" }],
  Restaurant: [
    { key: "amenity", value: "restaurant", label: "Restaurant" },
    { key: "amenity", value: "fast_food", label: "Fast Food" },
  ],
  Landscaping: [
    { key: "craft", value: "gardener", label: "Landscaping" },
    { key: "shop", value: "garden_centre", label: "Garden Centre" },
  ],
  Plumber: [{ key: "craft", value: "plumber", label: "Plumber" }],
  Physiotherapy: [
    { key: "amenity", value: "clinic", label: "Clinic / Physiotherapy", approximate: true },
    { key: "amenity", value: "doctors", label: "Medical Practice", approximate: true },
  ],
  "Interior Design": [{ key: "shop", value: "interior_decoration", label: "Interior Design" }],
};

/** Generic business tags used when no specific category is selected. */
export const GENERIC_BUSINESS_TAGS: OsmTagPair[] = [
  { key: "shop", value: null, label: "Shop" },
  { key: "office", value: null, label: "Office" },
  { key: "craft", value: null, label: "Craft" },
  { key: "amenity", value: "restaurant", label: "Restaurant" },
  { key: "amenity", value: "cafe", label: "Coffee Shop" },
  { key: "amenity", value: "fast_food", label: "Fast Food" },
];

/**
 * Returns the OSM tag pairs for an app category, or the generic business
 * tags when `category` is "all" or unmapped (never throws for UI input).
 */
export function tagsForCategory(category: string): OsmTagPair[] {
  if (category === "all") return GENERIC_BUSINESS_TAGS;
  return CATEGORY_TAGS[category] ?? GENERIC_BUSINESS_TAGS;
}

/** True when the category maps to purpose-built (non-approximate) OSM tags. */
export function hasExactTagMapping(category: string): boolean {
  if (category === "all") return false;
  const pairs = CATEGORY_TAGS[category];
  return pairs !== undefined && pairs.some((pair) => !pair.approximate);
}
