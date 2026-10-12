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

  // -- Food & Drink (standard amenity/shop/craft values) ----------------
  Bar: [{ key: "amenity", value: "bar", label: "Bar" }],
  Pub: [{ key: "amenity", value: "pub", label: "Pub" }],
  "Fast Food": [{ key: "amenity", value: "fast_food", label: "Fast Food" }],
  "Ice Cream Shop": [{ key: "shop", value: "ice_cream", label: "Ice Cream Shop" }],
  Catering: [{ key: "craft", value: "caterer", label: "Catering" }],
  Butcher: [{ key: "shop", value: "butcher", label: "Butcher" }],
  Greengrocer: [{ key: "shop", value: "greengrocer", label: "Greengrocer" }],
  Confectionery: [{ key: "shop", value: "confectionery", label: "Confectionery" }],
  "Tea Shop": [{ key: "shop", value: "tea", label: "Tea Shop" }],
  "Wine Shop": [{ key: "shop", value: "wine", label: "Wine Shop" }],

  // -- Retail & Shopping ------------------------------------------------
  Supermarket: [{ key: "shop", value: "supermarket", label: "Supermarket" }],
  "Convenience Store": [{ key: "shop", value: "convenience", label: "Convenience Store" }],
  "Department Store": [{ key: "shop", value: "department_store", label: "Department Store" }],
  "Clothing Store": [{ key: "shop", value: "clothes", label: "Clothing Store" }],
  "Shoe Store": [{ key: "shop", value: "shoes", label: "Shoe Store" }],
  "Electronics Store": [{ key: "shop", value: "electronics", label: "Electronics Store" }],
  "Mobile Phone Shop": [{ key: "shop", value: "mobile_phone", label: "Mobile Phone Shop" }],
  "Furniture Store": [{ key: "shop", value: "furniture", label: "Furniture Store" }],
  "Gift Shop": [{ key: "shop", value: "gift", label: "Gift Shop" }],
  "Jewelry Store": [{ key: "shop", value: "jewelry", label: "Jewelry Store" }],
  "Toy Store": [{ key: "shop", value: "toys", label: "Toy Store" }],
  "Sports Shop": [{ key: "shop", value: "sports", label: "Sports Shop" }],
  "Pet Store": [{ key: "shop", value: "pet", label: "Pet Store" }],
  "Hardware Store": [{ key: "shop", value: "hardware", label: "Hardware Store" }],
  "Home Improvement Store": [{ key: "shop", value: "doityourself", label: "Home Improvement Store" }],
  "Wholesale Store": [{ key: "shop", value: "wholesale", label: "Wholesale Store" }],
  "Stationery Shop": [{ key: "shop", value: "stationery", label: "Stationery Shop" }],
  "Cosmetics Store": [{ key: "shop", value: "cosmetics", label: "Cosmetics Store" }],
  Optician: [{ key: "shop", value: "optician", label: "Optician" }],
  "Second-hand Store": [{ key: "shop", value: "second_hand", label: "Second-hand Store" }],
  "Antique Shop": [{ key: "shop", value: "antiques", label: "Antique Shop" }],
  "Music Shop": [{ key: "shop", value: "music", label: "Music Shop" }],
  "Dry Cleaner": [{ key: "shop", value: "dry_cleaning", label: "Dry Cleaner" }],
  Tailor: [{ key: "craft", value: "tailor", label: "Tailor" }],
  "Photography Studio": [{ key: "craft", value: "photographer", label: "Photography Studio" }],

  // -- Health & Medical -------------------------------------------------
  Pharmacy: [{ key: "amenity", value: "pharmacy", label: "Pharmacy" }],
  Hospital: [{ key: "amenity", value: "hospital", label: "Hospital" }],
  "Veterinary Clinic": [{ key: "amenity", value: "veterinary", label: "Veterinary Clinic" }],
  "Medical Clinic": [{ key: "amenity", value: "doctors", label: "Medical Clinic" }],

  // -- Beauty & Wellness ------------------------------------------------
  Hairdresser: [{ key: "shop", value: "hairdresser", label: "Hairdresser" }],
  "Beauty Salon": [{ key: "shop", value: "beauty", label: "Beauty Salon" }],
  Gym: [{ key: "leisure", value: "fitness_centre", label: "Gym" }],

  // -- Automotive -------------------------------------------------------
  "Car Dealership": [{ key: "shop", value: "car", label: "Car Dealership" }],
  "Car Repair": [{ key: "shop", value: "car_repair", label: "Car Repair" }],
  "Car Rental": [{ key: "amenity", value: "car_rental", label: "Car Rental" }],
  "Car Wash": [{ key: "amenity", value: "car_wash", label: "Car Wash" }],
  "Fuel Station": [{ key: "amenity", value: "fuel", label: "Fuel Station" }],
  "Tire Shop": [{ key: "shop", value: "tyres", label: "Tire Shop" }],
  "Motorcycle Shop": [{ key: "shop", value: "motorcycle", label: "Motorcycle Shop" }],

  // -- Home & Trades ----------------------------------------------------
  Electrician: [{ key: "craft", value: "electrician", label: "Electrician" }],
  Carpenter: [{ key: "craft", value: "carpenter", label: "Carpenter" }],
  Painter: [{ key: "craft", value: "painter", label: "Painter" }],
  Locksmith: [{ key: "craft", value: "locksmith", label: "Locksmith" }],
  Shoemaker: [{ key: "craft", value: "shoemaker", label: "Shoemaker" }],
  Architect: [{ key: "office", value: "architect", label: "Architect" }],

  // -- Property & Finance -----------------------------------------------
  "Real Estate Agent": [{ key: "office", value: "estate_agent", label: "Real Estate Agent" }],
  "Insurance Agency": [{ key: "office", value: "insurance", label: "Insurance Agency" }],
  Bank: [{ key: "amenity", value: "bank", label: "Bank" }],
  Accountant: [{ key: "office", value: "accountant", label: "Accountant" }],
  Lawyer: [{ key: "office", value: "lawyer", label: "Lawyer" }],

  // -- Business Services ------------------------------------------------
  "Advertising Agency": [{ key: "office", value: "advertising", label: "Advertising Agency" }],
  "IT Company": [{ key: "office", value: "it", label: "IT Company" }],
  "Telecom Company": [{ key: "office", value: "telecommunication", label: "Telecom Company" }],
  "Employment Agency": [{ key: "office", value: "employment_agency", label: "Employment Agency" }],
  "Consulting Firm": [{ key: "office", value: "consultant", label: "Consulting Firm" }],
  "Print Shop": [{ key: "craft", value: "printer", label: "Print Shop" }],

  // -- Education & Learning ---------------------------------------------
  School: [{ key: "amenity", value: "school", label: "School" }],
  University: [{ key: "amenity", value: "university", label: "University" }],
  College: [{ key: "amenity", value: "college", label: "College" }],
  Kindergarten: [{ key: "amenity", value: "kindergarten", label: "Kindergarten" }],
  "Driving School": [{ key: "amenity", value: "driving_school", label: "Driving School" }],
  "Language School": [{ key: "amenity", value: "language_school", label: "Language School" }],
  "Music School": [{ key: "amenity", value: "music_school", label: "Music School" }],
  Library: [{ key: "amenity", value: "library", label: "Library" }],

  // -- Hotels & Travel --------------------------------------------------
  Hotel: [{ key: "tourism", value: "hotel", label: "Hotel" }],
  Hostel: [{ key: "tourism", value: "hostel", label: "Hostel" }],
  "Guest House": [{ key: "tourism", value: "guest_house", label: "Guest House" }],
  "Travel Agency": [{ key: "shop", value: "travel_agency", label: "Travel Agency" }],

  // -- Community & Public -----------------------------------------------
  "Post Office": [{ key: "amenity", value: "post_office", label: "Post Office" }],
  "Funeral Home": [{ key: "shop", value: "funeral_directors", label: "Funeral Home" }],
  "Self Storage": [{ key: "shop", value: "storage_rental", label: "Self Storage" }],
  "Nonprofit Organization": [{ key: "office", value: "ngo", label: "Nonprofit Organization" }],

  // -- Entertainment & Leisure ------------------------------------------
  Cinema: [{ key: "amenity", value: "cinema", label: "Cinema" }],
  Theatre: [{ key: "amenity", value: "theatre", label: "Theatre" }],
  Nightclub: [{ key: "amenity", value: "nightclub", label: "Nightclub" }],
  "Bowling Alley": [{ key: "leisure", value: "bowling_alley", label: "Bowling Alley" }],
  "Escape Room": [{ key: "leisure", value: "escape_game", label: "Escape Room" }],

  // -- Agriculture & Farming ----------------------------------------------
  Farm: [{ key: "place", value: "farm", label: "Farm" }],
  "Farm Shop": [{ key: "shop", value: "farm", label: "Farm Shop" }],
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
