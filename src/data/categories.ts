import type { SelectOption } from "@/components/ui/select";

/**
 * Comprehensive business-category dataset for the Find Companies search.
 *
 * There is no universal category API: the provider is OpenStreetMap, queried
 * through Overpass tag pairs (see `lib/providers/osm-tags.ts`) with a
 * Nominatim category fallback. Every entry below MUST have a mapping in
 * `CATEGORY_TAGS` — unmapped values silently fall back to the generic
 * business tags, i.e. they would behave exactly like "All businesses"
 * while pretending to filter. `categories.test.ts` enforces this.
 *
 * Values double as provider identifiers, shareable-URL values, and history
 * entries, so they are stable plain-English names (also the visible labels).
 * `group` organizes the dropdown; `aliases` add search terms (nicknames,
 * related words) matched alongside the label.
 *
 * Coverage is broad across real-world industries but intentionally honest:
 * OSM only contains mapped businesses, and mapping density varies by area.
 */

export interface BusinessCategory {
  /** Stable identifier = visible label = URL/history value. */
  value: string;
  label: string;
  group: string;
  aliases: string[];
}

export const BUSINESS_CATEGORIES: BusinessCategory[] = [
  // -- Food & Drink -----------------------------------------------------
  { value: "Restaurant", label: "Restaurant", group: "Food & Drink", aliases: ["pizza", "dining", "dinner", "lunch", "italian", "chinese", "food"] },
  { value: "Coffee Shop", label: "Coffee Shop", group: "Food & Drink", aliases: ["coffee", "espresso", "coffeehouse", "tea"] },
  { value: "Bakery", label: "Bakery", group: "Food & Drink", aliases: ["bread", "pastry", "cake", "patisserie"] },
  { value: "Coffee Roaster", label: "Coffee Roaster", group: "Food & Drink", aliases: ["coffee", "beans", "roastery"] },
  { value: "Bar", label: "Bar", group: "Food & Drink", aliases: ["cocktails", "drinks", "beer", "wine", "nightlife"] },
  { value: "Pub", label: "Pub", group: "Food & Drink", aliases: ["beer", "tavern", "drinks", "ale"] },
  { value: "Fast Food", label: "Fast Food", group: "Food & Drink", aliases: ["burger", "fries", "takeaway", "takeout"] },
  { value: "Ice Cream Shop", label: "Ice Cream Shop", group: "Food & Drink", aliases: ["ice cream", "gelato", "dessert"] },
  { value: "Catering", label: "Catering", group: "Food & Drink", aliases: ["caterer", "events", "food service"] },
  { value: "Butcher", label: "Butcher", group: "Food & Drink", aliases: ["meat", "butchery"] },
  { value: "Greengrocer", label: "Greengrocer", group: "Food & Drink", aliases: ["vegetables", "fruit", "produce"] },
  { value: "Confectionery", label: "Confectionery", group: "Food & Drink", aliases: ["candy", "chocolate", "sweets"] },
  { value: "Tea Shop", label: "Tea Shop", group: "Food & Drink", aliases: ["tea"] },
  { value: "Wine Shop", label: "Wine Shop", group: "Food & Drink", aliases: ["wine", "alcohol", "liquor"] },

  // -- Retail & Shopping -------------------------------------------------
  { value: "Supermarket", label: "Supermarket", group: "Retail & Shopping", aliases: ["groceries", "grocery", "food"] },
  { value: "Convenience Store", label: "Convenience Store", group: "Retail & Shopping", aliases: ["convenience", "corner shop", "kiosk"] },
  { value: "Department Store", label: "Department Store", group: "Retail & Shopping", aliases: ["department"] },
  { value: "Clothing Store", label: "Clothing Store", group: "Retail & Shopping", aliases: ["clothes", "fashion", "apparel", "boutique"] },
  { value: "Shoe Store", label: "Shoe Store", group: "Retail & Shopping", aliases: ["shoes", "footwear"] },
  { value: "Bookstore", label: "Bookstore", group: "Retail & Shopping", aliases: ["books"] },
  { value: "Bicycle Shop", label: "Bicycle Shop", group: "Retail & Shopping", aliases: ["bicycle", "bike", "cycling"] },
  { value: "Electronics Store", label: "Electronics Store", group: "Retail & Shopping", aliases: ["electronics", "gadgets"] },
  { value: "Mobile Phone Shop", label: "Mobile Phone Shop", group: "Retail & Shopping", aliases: ["phones", "mobile", "cell", "smartphones"] },
  { value: "Furniture Store", label: "Furniture Store", group: "Retail & Shopping", aliases: ["furniture", "home"] },
  { value: "Florist", label: "Florist", group: "Retail & Shopping", aliases: ["flowers", "plants"] },
  { value: "Gift Shop", label: "Gift Shop", group: "Retail & Shopping", aliases: ["gifts", "souvenirs"] },
  { value: "Jewelry Store", label: "Jewelry Store", group: "Retail & Shopping", aliases: ["jewelry", "jewellery", "watches"] },
  { value: "Toy Store", label: "Toy Store", group: "Retail & Shopping", aliases: ["toys", "games"] },
  { value: "Sports Shop", label: "Sports Shop", group: "Retail & Shopping", aliases: ["sports", "outdoors", "fitness"] },
  { value: "Pet Store", label: "Pet Store", group: "Retail & Shopping", aliases: ["pets", "animals"] },
  { value: "Hardware Store", label: "Hardware Store", group: "Retail & Shopping", aliases: ["hardware", "tools", "diy"] },
  { value: "Home Improvement Store", label: "Home Improvement Store", group: "Retail & Shopping", aliases: ["home improvement", "diy", "building supplies", "renovation"] },
  { value: "Wholesale Store", label: "Wholesale Store", group: "Retail & Shopping", aliases: ["wholesale", "bulk", "warehouse"] },
  { value: "Stationery Shop", label: "Stationery Shop", group: "Retail & Shopping", aliases: ["stationery", "office supplies"] },
  { value: "Cosmetics Store", label: "Cosmetics Store", group: "Retail & Shopping", aliases: ["cosmetics", "makeup", "beauty"] },
  { value: "Optician", label: "Optician", group: "Retail & Shopping", aliases: ["glasses", "eyewear", "optics"] },
  { value: "Second-hand Store", label: "Second-hand Store", group: "Retail & Shopping", aliases: ["second hand", "thrift", "used", "vintage"] },
  { value: "Antique Shop", label: "Antique Shop", group: "Retail & Shopping", aliases: ["antiques", "vintage", "collectibles"] },
  { value: "Music Shop", label: "Music Shop", group: "Retail & Shopping", aliases: ["music", "instruments"] },
  { value: "Dry Cleaner", label: "Dry Cleaner", group: "Retail & Shopping", aliases: ["dry cleaning", "laundry"] },
  { value: "Tailor", label: "Tailor", group: "Retail & Shopping", aliases: ["tailoring", "alterations", "sewing"] },
  { value: "Photography Studio", label: "Photography Studio", group: "Retail & Shopping", aliases: ["photographer", "photos", "portraits"] },

  // -- Health & Medical ---------------------------------------------------
  { value: "Dental Clinic", label: "Dental Clinic", group: "Health & Medical", aliases: ["dentist", "teeth", "orthodontist"] },
  { value: "Pharmacy", label: "Pharmacy", group: "Health & Medical", aliases: ["drugstore", "chemist", "medicine", "prescriptions"] },
  { value: "Hospital", label: "Hospital", group: "Health & Medical", aliases: ["hospital", "emergency"] },
  { value: "Veterinary Clinic", label: "Veterinary Clinic", group: "Health & Medical", aliases: ["vet", "veterinary", "animals", "pets"] },
  { value: "Medical Clinic", label: "Medical Clinic", group: "Health & Medical", aliases: ["doctor", "gp", "physicians"] },
  { value: "Physiotherapy", label: "Physiotherapy", group: "Health & Medical", aliases: ["physio", "rehab", "therapy"] },

  // -- Beauty & Wellness ---------------------------------------------------
  { value: "Yoga Studio", label: "Yoga Studio", group: "Beauty & Wellness", aliases: ["yoga", "pilates", "meditation"] },
  { value: "Hairdresser", label: "Hairdresser", group: "Beauty & Wellness", aliases: ["hair", "salon", "barber"] },
  { value: "Beauty Salon", label: "Beauty Salon", group: "Beauty & Wellness", aliases: ["beauty", "salon", "skincare"] },
  { value: "Gym", label: "Gym", group: "Beauty & Wellness", aliases: ["gym", "fitness", "workout"] },

  // -- Automotive -----------------------------------------------------------
  { value: "Car Dealership", label: "Car Dealership", group: "Automotive", aliases: ["cars", "auto", "dealer"] },
  { value: "Car Repair", label: "Car Repair", group: "Automotive", aliases: ["mechanic", "garage", "auto repair"] },
  { value: "Car Rental", label: "Car Rental", group: "Automotive", aliases: ["rental", "hire", "cars"] },
  { value: "Car Wash", label: "Car Wash", group: "Automotive", aliases: ["car wash", "cleaning"] },
  { value: "Fuel Station", label: "Fuel Station", group: "Automotive", aliases: ["petrol", "gas", "fuel"] },
  { value: "Tire Shop", label: "Tire Shop", group: "Automotive", aliases: ["tyres", "tires", "wheels"] },
  { value: "Motorcycle Shop", label: "Motorcycle Shop", group: "Automotive", aliases: ["motorcycle", "motorbike"] },

  // -- Home & Trades ---------------------------------------------------------
  { value: "Plumber", label: "Plumber", group: "Home & Trades", aliases: ["plumbing"] },
  { value: "Interior Design", label: "Interior Design", group: "Home & Trades", aliases: ["interior", "decorator", "design"] },
  { value: "Landscaping", label: "Landscaping", group: "Home & Trades", aliases: ["garden", "landscaping", "gardener"] },
  { value: "Electrician", label: "Electrician", group: "Home & Trades", aliases: ["electrical"] },
  { value: "Carpenter", label: "Carpenter", group: "Home & Trades", aliases: ["carpentry", "woodwork"] },
  { value: "Painter", label: "Painter", group: "Home & Trades", aliases: ["painting", "decorating"] },
  { value: "Locksmith", label: "Locksmith", group: "Home & Trades", aliases: ["locks", "keys"] },
  { value: "Shoemaker", label: "Shoemaker", group: "Home & Trades", aliases: ["shoe repair", "cobbler"] },
  { value: "Architect", label: "Architect", group: "Home & Trades", aliases: ["architecture"] },

  // -- Property & Finance ------------------------------------------------------
  { value: "Real Estate Agent", label: "Real Estate Agent", group: "Property & Finance", aliases: ["real estate", "property", "realtor"] },
  { value: "Insurance Agency", label: "Insurance Agency", group: "Property & Finance", aliases: ["insurance"] },
  { value: "Bank", label: "Bank", group: "Property & Finance", aliases: ["banking"] },
  { value: "Accountant", label: "Accountant", group: "Property & Finance", aliases: ["accounting", "tax", "bookkeeping"] },
  { value: "Lawyer", label: "Lawyer", group: "Property & Finance", aliases: ["law", "legal", "attorney", "solicitor"] },

  // -- Business Services ---------------------------------------------------------
  { value: "Coworking Space", label: "Coworking Space", group: "Business Services", aliases: ["coworking", "office", "shared"] },
  { value: "Advertising Agency", label: "Advertising Agency", group: "Business Services", aliases: ["advertising", "marketing"] },
  { value: "IT Company", label: "IT Company", group: "Business Services", aliases: ["software", "it", "tech", "computers"] },
  { value: "Telecom Company", label: "Telecom Company", group: "Business Services", aliases: ["telecom", "telephone", "internet"] },
  { value: "Employment Agency", label: "Employment Agency", group: "Business Services", aliases: ["jobs", "recruitment", "staffing", "hiring"] },
  { value: "Consulting Firm", label: "Consulting Firm", group: "Business Services", aliases: ["consulting", "consultants", "business"] },
  { value: "Print Shop", label: "Print Shop", group: "Business Services", aliases: ["printing", "copies", "copyshop"] },

  // -- Education & Learning -----------------------------------------------------------
  { value: "School", label: "School", group: "Education & Learning", aliases: ["school", "education"] },
  { value: "University", label: "University", group: "Education & Learning", aliases: ["university", "higher education"] },
  { value: "College", label: "College", group: "Education & Learning", aliases: ["college"] },
  { value: "Kindergarten", label: "Kindergarten", group: "Education & Learning", aliases: ["kindergarten", "preschool", "nursery"] },
  { value: "Driving School", label: "Driving School", group: "Education & Learning", aliases: ["driving", "lessons", "license"] },
  { value: "Language School", label: "Language School", group: "Education & Learning", aliases: ["language", "courses", "english"] },
  { value: "Music School", label: "Music School", group: "Education & Learning", aliases: ["music", "lessons", "instruments"] },
  { value: "Library", label: "Library", group: "Education & Learning", aliases: ["library", "books", "reading"] },

  // -- Hotels & Travel ---------------------------------------------------------------------
  { value: "Hotel", label: "Hotel", group: "Hotels & Travel", aliases: ["hotel", "accommodation"] },
  { value: "Hostel", label: "Hostel", group: "Hotels & Travel", aliases: ["hostel", "backpackers"] },
  { value: "Guest House", label: "Guest House", group: "Hotels & Travel", aliases: ["guesthouse", "bed and breakfast", "bnb"] },
  { value: "Travel Agency", label: "Travel Agency", group: "Hotels & Travel", aliases: ["travel", "holidays", "flights", "booking"] },

  // -- Community & Public ------------------------------------------------------------------
  { value: "Post Office", label: "Post Office", group: "Community & Public", aliases: ["post", "mail", "parcels"] },
  { value: "Funeral Home", label: "Funeral Home", group: "Community & Public", aliases: ["funeral", "burial"] },
  { value: "Self Storage", label: "Self Storage", group: "Community & Public", aliases: ["storage", "self-storage", "units"] },
  { value: "Nonprofit Organization", label: "Nonprofit Organization", group: "Community & Public", aliases: ["nonprofit", "ngo", "charity", "association"] },

  // -- Entertainment & Leisure -----------------------------------------------------------------
  { value: "Cinema", label: "Cinema", group: "Entertainment & Leisure", aliases: ["cinema", "movies", "film"] },
  { value: "Theatre", label: "Theatre", group: "Entertainment & Leisure", aliases: ["theatre", "theater", "plays"] },
  { value: "Nightclub", label: "Nightclub", group: "Entertainment & Leisure", aliases: ["nightclub", "club", "dancing", "nightlife"] },
  { value: "Bowling Alley", label: "Bowling Alley", group: "Entertainment & Leisure", aliases: ["bowling"] },
  { value: "Escape Room", label: "Escape Room", group: "Entertainment & Leisure", aliases: ["escape room", "games"] },

  // -- Agriculture & Farming ---------------------------------------------------------------
  { value: "Farm", label: "Farm", group: "Agriculture & Farming", aliases: ["farm", "agriculture", "farming"] },
  { value: "Farm Shop", label: "Farm Shop", group: "Agriculture & Farming", aliases: ["farm shop", "produce", "local food"] },
];

/**
 * Provider-facing category identifiers. `search-params.ts` validation and
 * provider tests consume this — it must stay in sync with the dataset.
 */
export const LIVE_CATEGORIES: string[] = BUSINESS_CATEGORIES.map((category) => category.value);

/**
 * Selector options: the unrestricted "All businesses" search first, then
 * grouped categories with alias keywords for the shared Select component.
 */
export const CATEGORY_OPTIONS: SelectOption[] = [
  { value: "all", label: "All businesses" },
  ...BUSINESS_CATEGORIES.map((category) => ({
    value: category.value,
    label: category.label,
    group: category.group,
    keywords: category.aliases.join(" "),
  })),
];
