/**
 * Fixed option lists for live company search. Free text is still accepted
 * for country and city — these lists only seed datalist suggestions and the
 * category select so users get fast, correctly spelled options.
 */

export const MAX_RESULTS_OPTIONS = [5, 10, 25, 50] as const;

export const LIVE_COUNTRY_SUGGESTIONS: string[] = [
  "Germany",
  "United States",
  "United Kingdom",
  "France",
  "Netherlands",
  "Spain",
  "Italy",
  "Austria",
  "Switzerland",
  "Belgium",
  "Poland",
  "Sweden",
  "Norway",
  "Denmark",
  "Finland",
  "Ireland",
  "Portugal",
  "Czech Republic",
  "Hungary",
  "Greece",
  "Canada",
  "Australia",
  "New Zealand",
  "India",
  "Japan",
  "Brazil",
  "Mexico",
  "South Africa",
  "United Arab Emirates",
  "Singapore",
];

/** Business categories with OpenStreetMap tag mappings (see osm-tags). */
export const LIVE_CATEGORIES: string[] = [
  "Bakery",
  "Bicycle Shop",
  "Bookstore",
  "Coffee Roaster",
  "Coffee Shop",
  "Coworking Space",
  "Dental Clinic",
  "Florist",
  "Interior Design",
  "Landscaping",
  "Physiotherapy",
  "Plumber",
  "Restaurant",
  "Yoga Studio",
];
